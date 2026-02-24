import { supabase } from './supabase';
import { ExcelPatient } from './excelImport';
import { Paciente } from '../types/db';

export interface ImportError {
    rowNumber: number;
    nome: string;
    telefone: string;
    motivo: string;
}

export interface ImportResult {
    sucesso: number;
    atualizados: number;
    falhas: ImportError[];
}

// Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
function parseDate(dateStr: string): string | null {
    if (!dateStr) return null;

    // Quick validation for DD/MM/YYYY or DD-MM-YYYY
    const str = String(dateStr);
    const parts = str.split(/[\/\-]/);

    let day = null, month = null, year = null;

    if (parts.length === 3) {
        if (parts[2].length === 4) {
            // DD/MM/YYYY
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
        } else if (parts[0].length === 4) {
            // YYYY-MM-DD
            year = parts[0];
            month = parts[1].padStart(2, '0');
            day = parts[2].padStart(2, '0');
        }

        if (year && year.length === 4) {
            const y = parseInt(year, 10);
            if (y > 1900 && y <= new Date().getFullYear()) {
                return `${year}-${month}-${day}`;
            }
        }
    }

    // Try to parse if it's already YYYY-MM-DD or standard JS date
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        if (y > 1900 && y <= new Date().getFullYear()) {
            return d.toISOString().split('T')[0];
        }
    }

    return null;
}

function isValidPhone(phone: string): boolean {
    // Basic validation: at least 10 digits (e.g. 1199999999)
    return !!phone && phone.replace(/\D/g, '').length >= 10;
}

export async function processPatientImport(
    patients: ExcelPatient[],
    ownerId: string,
    userId: string
): Promise<ImportResult> {
    const result: ImportResult = {
        sucesso: 0,
        atualizados: 0,
        falhas: []
    };

    if (!patients || patients.length === 0) {
        return result;
    }

    // 1. Validar e formatar os dados inicialmente
    const validRows: any[] = [];

    patients.forEach((p, index) => {
        const rowNumber = index + 2; // +1 for 0-index, +1 for header row

        let isValid = true;
        let motivo = '';

        if (!p.nome) {
            isValid = false;
            motivo = 'Nome é obrigatório.';
        } else if (!p.telefone) {
            isValid = false;
            motivo = 'Telefone é obrigatório.';
        } else if (!isValidPhone(p.telefone)) {
            isValid = false;
            motivo = 'Telefone inválido (necessário DDD).';
        }

        let dbDate = null;
        if (p.data_nascimento && isValid) {
            dbDate = parseDate(p.data_nascimento);
            if (!dbDate) {
                isValid = false;
                motivo = 'Data de nascimento inválida (use DD/MM/AAAA).';
            }
        }

        if (isValid) {
            // Include some dummy id to simplify upsert tracking if necessary, or just rely on raw match
            validRows.push({
                rowNumber,
                nome: p.nome,
                telefone: p.telefone,
                data_nascimento: dbDate,
                origem: p
            });
        } else {
            result.falhas.push({
                rowNumber,
                nome: p.nome || '(vazio)',
                telefone: p.telefone || '(vazio)',
                motivo
            });
        }
    });

    if (validRows.length === 0) {
        return result;
    }

    // 2. Fetch all existing patients for this clinic to perform memory-matching to avoid DB duplicates.
    // Optimization: if it's too large, we could chunk this fetch, but Supabase handles up to 1000 records per page.
    let existingPatients: any[] = [];
    try {
        let from = 0;
        let limit = 1000;
        let fetchMore = true;

        while (fetchMore) {
            const { data: fetchPage, error: fetchErr } = await supabase
                .from('pacientes')
                .select('id, nome, telefone')
                .eq('owner_id', ownerId)
                .is('deleted_at', null)
                .range(from, from + limit - 1);

            if (fetchErr) throw fetchErr;

            if (fetchPage && fetchPage.length > 0) {
                existingPatients = [...existingPatients, ...fetchPage];
                from += limit;
                if (fetchPage.length < limit) fetchMore = false;
            } else {
                fetchMore = false;
            }
        }
    } catch (err) {
        console.error("Error fetching existing patients:", err);
        // We will proceed anyway and fallback to raw INSERTS if we failed to fetch
    }

    const inserts: any[] = [];
    const updates: any[] = [];

    // 3. Match logic
    validRows.forEach(row => {
        // Find existing match by phone (most robust identifier besides ID) or exactly same name AND phone
        // Just phone match is enough if no multiple people share the same phone, but we'll try to match by phone
        const cleanRowPhone = String(row.telefone).replace(/\D/g, '');

        let match = existingPatients.find(ep => {
            if (!ep.telefone) return false;
            const cleanEpPhone = String(ep.telefone).replace(/\D/g, '');
            // Exact phone or name+phone
            return cleanEpPhone === cleanRowPhone;
        });

        if (!match) {
            match = existingPatients.find(ep => ep.nome.trim().toLowerCase() === row.nome.trim().toLowerCase());
        }

        const payload = {
            owner_id: ownerId,
            user_id: userId, // Assuming imported by this user
            nome: row.nome,
            telefone: row.telefone,
            data_nascimento: row.data_nascimento,
            // Assuming updated_at wouldn't exist on Paciente type unless it does.
            // Using spread allows overriding fields if they exist
        };

        if (match) {
            updates.push({
                ...payload,
                id: match.id, // Supabase needs ID for update
            });
        } else {
            inserts.push(payload);
        }
    });

    // 4. Batch Operations
    // Helper for batch execution
    const CHUNK_SIZE = 500;

    const runBatches = async (items: any[], isUpdate: boolean) => {
        let successCount = 0;
        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
            const chunk = items.slice(i, i + CHUNK_SIZE);
            try {
                if (isUpdate) {
                    // Supabase upsert requires specifying the primary key resolving
                    // We can use upsert to do batch updates efficiently
                    const { error } = await supabase.from('pacientes').upsert(chunk);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('pacientes').insert(chunk);
                    if (error) throw error;
                }
                successCount += chunk.length;
            } catch (err: any) {
                console.error(`Batch ${isUpdate ? 'update' : 'insert'} error:`, err);
                // Mark chunk as failed
                chunk.forEach((failedItem: any, chunkIndex: number) => {
                    // Try to map back to original row which is hard since we stripped it.
                    // Doing a simple fallback error representation.
                    result.falhas.push({
                        rowNumber: -1,
                        nome: failedItem.nome,
                        telefone: failedItem.telefone,
                        motivo: `Erro no banco de dados: ${err.message}`
                    });
                });
            }
        }
        return successCount;
    };

    // Run updates and inserts
    if (inserts.length > 0) {
        result.sucesso = await runBatches(inserts, false);
    }

    if (updates.length > 0) {
        result.atualizados = await runBatches(updates, true);
    }

    return result;
}
