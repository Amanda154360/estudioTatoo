USE cl205125;

-- PREFLIGHT SOMENTE LEITURA. Não instala, altera ou remove objetos.
-- Execute conectado explicitamente ao schema individual autorizado.
-- O schema/hostname exibidos não comprovam isolamento: confirme também
-- servidor, porta e UUID com o responsável pelo ambiente.

SELECT
  DATABASE() AS schema_selecionado,
  VERSION() AS versao_mysql,
  @@hostname AS servidor,
  @@port AS porta,
  @@server_uuid AS identificador_instancia,
  CASE
    WHEN DATABASE() = 'cl205125'
      THEN 'CONFIRA autorização e identidade do endpoint; não prossiga só pelo nome'
    ELSE 'PARE: este preflight de upgrade foi preparado para cl205125'
  END AS verificacao_endpoint;

-- Tabelas/colunas mínimas esperadas na instalação individual anterior.
-- A consulta lista cada coluna ausente, sem modificar o schema.
WITH esperadas (table_name, column_name) AS (
  SELECT 'materiais', 'id' UNION ALL
  SELECT 'materiais', 'nome' UNION ALL
  SELECT 'materiais', 'descricao' UNION ALL
  SELECT 'materiais', 'unidade_medida' UNION ALL
  SELECT 'materiais', 'ativo' UNION ALL
  SELECT 'compras', 'id' UNION ALL
  SELECT 'compras', 'data_compra' UNION ALL
  SELECT 'compras', 'moeda' UNION ALL
  SELECT 'compras', 'observacoes' UNION ALL
  SELECT 'compras', 'cotacao_moeda_base' UNION ALL
  SELECT 'compras', 'cotacao_moeda_destino' UNION ALL
  SELECT 'compras', 'cotacao_valor' UNION ALL
  SELECT 'compras', 'cotacao_em' UNION ALL
  SELECT 'compras', 'cotacao_data_referencia' UNION ALL
  SELECT 'compras', 'cotacao_fonte' UNION ALL
  SELECT 'compras', 'criado_em' UNION ALL
  SELECT 'compras', 'atualizado_em' UNION ALL
  SELECT 'itens_compra', 'id' UNION ALL
  SELECT 'itens_compra', 'compra_id' UNION ALL
  SELECT 'itens_compra', 'material_id' UNION ALL
  SELECT 'itens_compra', 'quantidade' UNION ALL
  SELECT 'itens_compra', 'preco_unitario' UNION ALL
  SELECT 'itens_compra', 'nome_material_snapshot' UNION ALL
  SELECT 'itens_compra', 'unidade_snapshot' UNION ALL
  SELECT 'itens_compra', 'criado_em'
)
SELECT
  e.table_name,
  e.column_name,
  CASE WHEN c.COLUMN_NAME IS NULL THEN 'AUSENTE' ELSE 'PRESENTE' END AS estado
FROM esperadas AS e
LEFT JOIN information_schema.COLUMNS AS c
  ON c.TABLE_SCHEMA = DATABASE()
  AND c.TABLE_NAME = e.table_name
  AND c.COLUMN_NAME = e.column_name
ORDER BY e.table_name, e.column_name;

-- Colunas novas: exibe tipo/default/nulabilidade para detectar migração
-- aplicada, aplicada parcialmente ou com definição incompatível.
SELECT
  c.COLUMN_NAME AS coluna,
  c.COLUMN_TYPE AS tipo,
  c.IS_NULLABLE AS permite_null,
  c.COLUMN_DEFAULT AS valor_default,
  CASE
    WHEN c.COLUMN_NAME IS NULL THEN 'AUSENTE: candidato a upgrade'
    WHEN c.COLUMN_NAME = 'status'
      AND c.COLUMN_TYPE = 'enum(''ATIVA'',''CANCELADA'')'
      AND c.IS_NULLABLE = 'NO'
      AND c.COLUMN_DEFAULT = 'ATIVA'
      THEN 'COMPATÍVEL'
    WHEN c.COLUMN_NAME = 'cancelada_em'
      AND c.COLUMN_TYPE = 'datetime(3)'
      AND c.IS_NULLABLE = 'YES'
      AND c.COLUMN_DEFAULT IS NULL
      THEN 'COMPATÍVEL'
    ELSE 'INCOMPATÍVEL: não prossiga'
  END AS verificacao
FROM (
  SELECT 'status' AS COLUMN_NAME
  UNION ALL
  SELECT 'cancelada_em'
) AS esperadas
LEFT JOIN information_schema.COLUMNS AS c
  ON c.TABLE_SCHEMA = DATABASE()
  AND c.TABLE_NAME = 'compras'
  AND c.COLUMN_NAME = esperadas.COLUMN_NAME
ORDER BY esperadas.COLUMN_NAME;

-- Procedures exigidas pelo módulo. ROUTINE_DEFINITION das três rotinas que a
-- migração pretende remover é exposta para comparação manual com o código.
WITH esperadas (routine_name, finalidade, sera_recriada) AS (
  SELECT 'sp_listar_materiais', 'materiais', 'NAO' UNION ALL
  SELECT 'sp_buscar_material_por_id', 'materiais', 'NAO' UNION ALL
  SELECT 'sp_cadastrar_material', 'materiais', 'NAO' UNION ALL
  SELECT 'sp_atualizar_material', 'materiais', 'NAO' UNION ALL
  SELECT 'sp_excluir_material', 'materiais', 'NAO' UNION ALL
  SELECT 'sp_listar_compras', 'compras', 'SIM' UNION ALL
  SELECT 'sp_buscar_compra_por_id', 'compras', 'SIM' UNION ALL
  SELECT 'sp_criar_compra_com_itens', 'compras', 'NAO' UNION ALL
  SELECT 'sp_atualizar_compra_com_itens', 'compras', 'SIM' UNION ALL
  SELECT 'sp_cancelar_compra', 'compras', 'NOVA'
)
SELECT
  e.routine_name AS procedure_esperada,
  e.finalidade,
  e.sera_recriada,
  r.ROUTINE_NAME IS NOT NULL AS existe,
  r.SQL_MODE AS sql_mode,
  r.ROUTINE_DEFINITION AS definicao_para_revisao
FROM esperadas AS e
LEFT JOIN information_schema.ROUTINES AS r
  ON r.ROUTINE_SCHEMA = DATABASE()
  AND r.ROUTINE_TYPE = 'PROCEDURE'
  AND r.ROUTINE_NAME = e.routine_name
ORDER BY e.finalidade, e.routine_name;

-- Resumo do estado da migração. Só READY é estruturalmente elegível; ainda
-- compare manualmente as definições das três procedures que serão substituídas.
SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materiais'
      AND TABLE_TYPE = 'BASE TABLE'
  )
    OR NOT EXISTS (
      SELECT 1 FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'compras'
        AND TABLE_TYPE = 'BASE TABLE'
    )
    OR NOT EXISTS (
      SELECT 1 FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'itens_compra'
        AND TABLE_TYPE = 'BASE TABLE'
    )
    THEN 'INCOMPATIVEL: tabela ausente ou não é tabela base'
  WHEN EXISTS (
    SELECT 1
    FROM (
      SELECT 'materiais' AS table_name, 'id' AS column_name UNION ALL
      SELECT 'materiais', 'nome' UNION ALL
      SELECT 'materiais', 'descricao' UNION ALL
      SELECT 'materiais', 'unidade_medida' UNION ALL
      SELECT 'materiais', 'ativo' UNION ALL
      SELECT 'compras', 'id' UNION ALL
      SELECT 'compras', 'data_compra' UNION ALL
      SELECT 'compras', 'moeda' UNION ALL
      SELECT 'compras', 'observacoes' UNION ALL
      SELECT 'compras', 'cotacao_moeda_base' UNION ALL
      SELECT 'compras', 'cotacao_moeda_destino' UNION ALL
      SELECT 'compras', 'cotacao_valor' UNION ALL
      SELECT 'compras', 'cotacao_em' UNION ALL
      SELECT 'compras', 'cotacao_data_referencia' UNION ALL
      SELECT 'compras', 'cotacao_fonte' UNION ALL
      SELECT 'compras', 'criado_em' UNION ALL
      SELECT 'compras', 'atualizado_em' UNION ALL
      SELECT 'itens_compra', 'id' UNION ALL
      SELECT 'itens_compra', 'compra_id' UNION ALL
      SELECT 'itens_compra', 'material_id' UNION ALL
      SELECT 'itens_compra', 'quantidade' UNION ALL
      SELECT 'itens_compra', 'preco_unitario' UNION ALL
      SELECT 'itens_compra', 'nome_material_snapshot' UNION ALL
      SELECT 'itens_compra', 'unidade_snapshot' UNION ALL
      SELECT 'itens_compra', 'criado_em'
    ) AS esperadas
    LEFT JOIN information_schema.COLUMNS AS c
      ON c.TABLE_SCHEMA = DATABASE()
      AND c.TABLE_NAME = esperadas.table_name
      AND c.COLUMN_NAME = esperadas.column_name
    WHERE c.COLUMN_NAME IS NULL
  )
    THEN 'INCOMPATIVEL: falta coluna obrigatória da instalação anterior'
  WHEN (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'compras'
      AND COLUMN_NAME IN ('status', 'cancelada_em')
  ) = 2
    THEN 'JA_APLICADA_OU_INCOMPATIVEL: confira tipo/default e procedures acima; não reaplique'
  WHEN (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'compras'
      AND COLUMN_NAME IN ('status', 'cancelada_em')
  ) = 1
    THEN 'PARCIAL: uma coluna existe; pare e faça análise manual'
  WHEN (
    SELECT COUNT(*) FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE()
      AND ROUTINE_TYPE = 'PROCEDURE'
      AND ROUTINE_NAME IN (
        'sp_listar_materiais',
        'sp_buscar_material_por_id',
        'sp_cadastrar_material',
        'sp_atualizar_material',
        'sp_excluir_material',
        'sp_listar_compras',
        'sp_buscar_compra_por_id',
        'sp_criar_compra_com_itens',
        'sp_atualizar_compra_com_itens'
      )
  ) <> 9
    THEN 'INCOMPATIVEL: procedures esperadas da instalação anterior não estão todas presentes'
  WHEN EXISTS (
    SELECT 1 FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE()
      AND ROUTINE_TYPE = 'PROCEDURE'
      AND ROUTINE_NAME = 'sp_cancelar_compra'
  )
    THEN 'INCOMPATIVEL: procedure de cancelamento já existe, sem as colunas novas'
  ELSE 'READY ESTRUTURAL: compare definições das procedures alvo, backup e autorização antes de qualquer DDL'
END AS estado_migracao;
