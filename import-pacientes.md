# Importação de Pacientes via Excel

## Goal
Implementar funcionalidade de importação em lote de pacientes via Excel, com atualização de contatos existentes (via verificação em memória) e exibição de relatório de sucessos/falhas, suportando grandes volumes de dados através de inserções divididas (batches).

## Tasks
- [ ] Task 1: Instalar dependência `xlsx`. → Verify: `package.json` possui `xlsx`.
- [ ] Task 2: Criar `ImportPacientesModal.tsx` com passo de download do modelo e área de upload. → Verify: Componente renderiza as duas etapas.
- [ ] Task 3: Criar lógica `downloadTemplate` com as colunas (Nome, Telefone, Email, Nascimento). → Verify: Arquivo `.xlsx` é baixado corretamente.
- [ ] Task 4: Criar lógica para interpretar o Excel enviado. → Verify: Retorna array de objetos com os dados das colunas pareados com as chaves do sistema.
- [ ] Task 5: Lógica de validação em lote e Upsert (Update/Insert): Buscar os pacientes atuais da clínica, mapear e comparar por Telefone/Nome. Dividir arrays de novos (`inserts`) e existentes (`updates`). → Verify: Console log mostra a divisão correta.
- [ ] Task 6: Fazer o envio para o Supabase em pedaços de 500 (Batching). → Verify: Inserções grandes não dão timeout.
- [ ] Task 7: Montar a tela final de relatório detalhando Quantidade Sucesso vs Linhas com Erro, mostrando o motivo dos erros. → Verify: Erros de validação e sucessos são exibidos corretamente pro usuário.
- [ ] Task 8: Integrar o botão "Importar" na página de pacientes (`Pacientes.tsx`). → Verify: Modal abre a partir da listagem.

## Done When
- [ ] Cliente consegue baixar o template.
- [ ] Cliente faz o upload do arquivo e o sistema processa.
- [ ] Contatos já existentes na clínica são atualizados.
- [ ] Novas entradas são inseridas.
- [ ] Lotes grandes (> 1000) rodam sem travar o frontend/banco.
- [ ] Relatório final claro mostrando o que deu certo e o que falhou.
