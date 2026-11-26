-- Migração manual e incremental para schema individual já instalado.
-- ANTES: execute 001_preflight_cancelamento.sql, confira TODOS os resultados,
-- compare as definições das três procedures que serão removidas com os scripts
-- versionados, confirme backup restaurável, autorização e endpoint.
-- Pare diante de qualquer estado ausente, parcial, desconhecido ou incompatível.
-- Não cria/recria tabelas e não remove compras nem itens.
-- MySQL não garante rollback automático de todas as operações DDL; uma falha
-- pode deixar colunas/procedures em estado parcial. Não reaplique às cegas.
-- Este wrapper com SOURCE é para MySQL CLI, da raiz do repositório.
-- MySQL Workbench: NÃO execute o wrapper inteiro; veja sql/README.md para
-- execução controlada por scripts/seleções no editor.

ALTER TABLE compras
  ADD COLUMN status ENUM('ATIVA', 'CANCELADA') NOT NULL DEFAULT 'ATIVA'
    AFTER moeda,
  ADD COLUMN cancelada_em DATETIME(3) NULL
    AFTER status;

-- As rotinas de leitura e atualização precisam conhecer/proteger o novo estado.
-- Recriar routines causa uma breve indisponibilidade destas operações;
-- faça backup e confira as definições antes de executar.
DROP PROCEDURE IF EXISTS sp_listar_compras;
DROP PROCEDURE IF EXISTS sp_buscar_compra_por_id;
DROP PROCEDURE IF EXISTS sp_atualizar_compra_com_itens;

SOURCE SergioWilliam2209/sql/003_procedures_compras.sql;
SOURCE SergioWilliam2209/sql/005_procedure_atualizar_compra.sql;
SOURCE SergioWilliam2209/sql/007_procedure_cancelar_compra.sql;
