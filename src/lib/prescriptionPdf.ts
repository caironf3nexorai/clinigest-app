import { Prescricao, Medicamento } from '../types/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Generate SHA-256 hash for signature
export async function generateSignatureHash(data: object): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase();
}

// Generate prescription PDF HTML (for printing)
export function generatePrescriptionHTML(
    prescricao: Prescricao,
    pacienteNome: string,
): string {
    const dataFormatada = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const horaAssinatura = prescricao.assinado_em
        ? format(new Date(prescricao.assinado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
        : '';

    const medicamentosHTML = prescricao.medicamentos.map((med: Medicamento, idx: number) => `
        <div class="medicamento">
            <p class="medicamento-numero">${idx + 1}.</p>
            <div class="medicamento-info">
                <p class="medicamento-nome">${med.nome} ${med.dosagem}</p>
                <p class="medicamento-detalhes">
                    <strong>Via:</strong> ${med.via} | 
                    <strong>Posologia:</strong> ${med.frequencia} | 
                    <strong>Duração:</strong> ${med.duracao}
                </p>
                ${med.observacoes ? `<p class="medicamento-obs">Obs: ${med.observacoes}</p>` : ''}
            </div>
        </div>
    `).join('');

    const logoSection = prescricao.clinica_logo_url
        ? `<img src="${prescricao.clinica_logo_url}" alt="Logo" class="logo" />`
        : `<div class="logo-placeholder">🦷</div>`;

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Receituário - ${pacienteNome}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            @page {
                size: A4;
                margin: 0;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 12pt;
                line-height: 1.5;
                color: #333;
                background: white;
                margin: 0;
                padding: 15mm;
            }
            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #0891b2;
                padding-bottom: 15px;
                margin-bottom: 25px;
            }
            .logo {
                max-width: 80px;
                max-height: 80px;
                object-fit: contain;
                margin-bottom: 10px;
            }
            .logo-placeholder {
                font-size: 48px;
                margin-bottom: 10px;
            }
            .clinica-nome {
                font-size: 22pt;
                font-weight: bold;
                color: #0891b2;
                margin-bottom: 5px;
            }
            .dentista-info {
                font-size: 11pt;
                color: #555;
            }
            .titulo-receita {
                text-align: center;
                font-size: 14pt;
                font-weight: bold;
                color: #333;
                margin: 20px 0;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            .paciente-info {
                background: #f8fafc;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .paciente-info p {
                margin: 3px 0;
            }
            .prescricao-titulo {
                font-weight: bold;
                font-size: 12pt;
                margin-bottom: 15px;
                color: #0891b2;
            }
            .medicamento {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                padding: 12px;
                border-left: 3px solid #0891b2;
                background: #f8fafc;
            }
            .medicamento-numero {
                font-weight: bold;
                font-size: 14pt;
                color: #0891b2;
                min-width: 25px;
            }
            .medicamento-nome {
                font-weight: bold;
                font-size: 12pt;
                margin-bottom: 5px;
            }
            .medicamento-detalhes {
                font-size: 11pt;
                color: #555;
            }
            .medicamento-obs {
                font-size: 10pt;
                color: #777;
                font-style: italic;
                margin-top: 5px;
            }
            .observacoes-gerais {
                margin-top: 25px;
                padding: 15px;
                background: #fef3c7;
                border-radius: 8px;
            }
            .observacoes-gerais strong {
                color: #92400e;
            }
            .footer {
                margin-top: 40px;
                text-align: center;
            }
            .assinatura {
                border-top: 1px solid #333;
                padding-top: 10px;
                max-width: 300px;
                margin: 0 auto 15px;
            }
            .assinatura-digital {
                font-size: 9pt;
                color: #666;
                background: #f0fdf4;
                padding: 10px;
                border-radius: 5px;
                margin-top: 15px;
            }
            .codigo-verificacao {
                font-family: monospace;
                font-size: 11pt;
                font-weight: bold;
                color: #166534;
            }
            .data-local {
                text-align: right;
                margin-top: 20px;
                font-style: italic;
                color: #555;
            }
            @media print {
                body {
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                }
                .no-print {
                    display: none;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                ${logoSection}
                <div class="clinica-nome">${prescricao.clinica_nome || 'Clínica Odontológica'}</div>
                <div class="dentista-info">
                    <strong>${prescricao.dentista_nome}</strong>
                    ${prescricao.dentista_cro ? ` - CRO: ${prescricao.dentista_cro}` : ''}
                    ${prescricao.dentista_especialidade ? `<br/>${prescricao.dentista_especialidade}` : ''}
                    ${prescricao.dentista_endereco ? `<br/>${prescricao.dentista_endereco}` : ''}
                    ${prescricao.dentista_telefone ? ` | Tel: ${prescricao.dentista_telefone}` : ''}
                </div>
            </div>

            <div class="titulo-receita">Receituário</div>

            <div class="paciente-info">
                <p><strong>Paciente:</strong> ${pacienteNome}</p>
                <p><strong>Data:</strong> ${dataFormatada}</p>
            </div>

            <div class="prescricao-titulo">Rp/ (Prescrição):</div>

            ${medicamentosHTML}

            ${prescricao.observacoes_gerais ? `
                <div class="observacoes-gerais">
                    <strong>Observações:</strong> ${prescricao.observacoes_gerais}
                </div>
            ` : ''}

            <div class="data-local">
                ${prescricao.clinica_cidade || 'Local'}, ${dataFormatada}
            </div>

            <div class="footer">
                <div class="assinatura">
                    <strong>${prescricao.dentista_nome}</strong>
                    ${prescricao.dentista_cro ? `<br/>CRO: ${prescricao.dentista_cro}` : ''}
                </div>

                ${prescricao.assinatura_hash ? `
                    <div class="assinatura-digital">
                        ✅ Documento assinado eletronicamente em ${horaAssinatura}<br/>
                        <span class="codigo-verificacao">Código: ${prescricao.assinatura_hash}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    </body>
    </html>
    `;
}

// Open print dialog with prescription
export function printPrescription(prescricao: Prescricao, pacienteNome: string): void {
    const html = generatePrescriptionHTML(prescricao, pacienteNome);
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    }
}
