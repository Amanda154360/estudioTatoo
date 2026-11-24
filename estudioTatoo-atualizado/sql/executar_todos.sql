-- =============================================================================
-- MASTER SCRIPT: EXECUÇÃO MODULAR VIA CLIENTE MYSQL CLI
-- =============================================================================
-- Execute no MySQL Command Line a partir do diretório base/sql:
-- mysql -u root -p < executar_todos.sql
-- =============================================================================

SOURCE modules/01_tabelas.sql;
SOURCE modules/02_funcoes.sql;
SOURCE modules/03_triggers.sql;
SOURCE modules/04_views.sql;
SOURCE modules/05_procedures_ceps.sql;
SOURCE modules/06_procedures_clientes.sql;
SOURCE modules/07_procedures_profissionais.sql;
SOURCE modules/08_seeds.sql;

SELECT 'Todos os módulos SQL foram aplicados com sucesso!' AS status_migracao;
