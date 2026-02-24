import * as XLSX from 'xlsx';

export interface ExcelPatient {
    nome: string;
    telefone: string;
    data_nascimento?: string;
}

export function downloadPatientImportTemplate() {
    const ws = XLSX.utils.json_to_sheet([
        {
            Nome: 'João da Silva (Exemplo)',
            Telefone: '11999999999 (Apenas Numeros)',
            'Data de Nascimento': '25/12/1990 (Opcional)'
        }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');

    // Auto-adjust column widths
    const colWidths = [
        { wch: 30 }, // Nome
        { wch: 25 }, // Telefone
        { wch: 20 }, // Data de Nascimento
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'modelo_importacao_pacientes.xlsx');
}

export async function parseExcelFile(file: File): Promise<ExcelPatient[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                // Read the first sheet
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false }) as any[];

                // Map back to standardized keys, since headers might vary slightly but shouldn't if they used the template
                const patients: ExcelPatient[] = jsonData.map(row => {
                    // Try to extract from expected keys or fallbacks
                    const nome = row['Nome'] || row['NOME'] || row['nome'] || '';
                    const telefone = row['Telefone'] || row['telefone'] || row['TELEFONE'] || '';
                    const dataNascimento = row['Data de Nascimento'] || row['data de nascimento'] || row['Data Nascimento'] || row['DATA DE NASCIMENTO'] || '';

                    return {
                        nome: String(nome).trim(),
                        telefone: cleanPhone(telefone),
                        data_nascimento: String(dataNascimento).trim()
                    };
                });

                // Filter out completely empty rows that Excel might sometimes read
                const validPatients = patients.filter(p => p.nome || p.telefone);

                resolve(validPatients);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
}

function cleanPhone(phone: any): string {
    if (!phone) return '';
    // Remove all non-numeric characters
    return String(phone).replace(/\D/g, '');
}
