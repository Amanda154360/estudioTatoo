# Testes SQL isolados — materiais e compras

Estes scripts foram preparados, **mas não executados**. Não substituem os 125
testes simulados e ainda precisam ser validados num MySQL real.

## Pré-condições obrigatórias

1. Disponibilizar um MySQL **isolado e descartável**, de preferência MySQL
   8.0.32, sem configuração de rede/credenciais compartilhadas.
2. Criar/provisionar fora destes scripts um schema de teste cujo nome comece
   com `dad_test_`. Não apontar para `cl205349`.
3. Executar `007_preflight_ambiente.sql` primeiro e conferir manualmente que
   schema/versão estão certos. Comparar servidor, porta e UUID da instância
   com a identificação fornecida pelo responsável pelo ambiente isolado; o
   nome `dad_test_*` sozinho **não prova isolamento**. Se não for possível
   confirmar que o endpoint é descartável e diferente do servidor escolar,
   parar.
4. Confirmar que o schema descartável está vazio. Nenhum destes scripts cria
   ou seleciona schema, instala ferramenta, carrega `.env` ou conecta a servidor.
5. Aplicar apenas
   `SergioWilliam2209/sql/006_migracao_individual_materiais_compras.sql`
   no schema descartável. Não usar `npm run db:init` nem
   `sql/executar_todos.sql`.

## Ordem de execução no schema descartável

- `008_testes_sucesso.sql`: CRUD lógico de materiais; consulta/listagem de
  compras; criação de compra com dois itens; DECIMALs de precisão máxima;
  atualização de cabeçalho e item, inclusão de item, snapshots e FK válida.
  Todos os indicadores `PASS` são necessários.
- Execute separadamente `009_teste_rollback_criacao.sql`,
  `010_teste_rollback_atualizacao.sql`, `011_teste_fk_material.sql` e
  `012_teste_fk_compra.sql`. **Cada arquivo deve produzir o erro esperado**.
  Eles não devem ser agrupados numa execução que pare no primeiro erro.
- `013_verificar_falhas_esperadas.sql`: os indicadores devem confirmar ausência
  da compra parcialmente criada, rollback completo da atualização e ausência
  de itens órfãos.
- `014_teste_exclusao_logica_material.sql`: executa por último; deve desativar o
  material sem apagar os itens históricos.
- Ao terminar, descarte o schema de teste por procedimento administrativo
  separado. Não reaproveite nem execute novamente os scripts sobre um schema
  que contenha tabelas ou procedures: a migração é intencionalmente não
  reexecutável.

Os testes de falha fazem operações inválidas de propósito e dependem de a
procedure capturar a falha esperada. Se algum `CALL` não retornar erro, ou se
qualquer indicador der `FAIL`, interrompa e preserve o ambiente para análise.
Não copie esses scripts para o inicializador coletivo.
