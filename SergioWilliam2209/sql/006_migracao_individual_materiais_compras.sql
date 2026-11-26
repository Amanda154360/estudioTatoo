-- Ponto de entrada da migração incremental individual.
--
-- Execute somente após selecionar explicitamente o schema de destino e fazer
-- o preflight documentado em sql/README.md. Este arquivo é para o cliente mysql
-- (SOURCE), não para mysql2.query() nem para o inicializador coletivo.
-- Nenhuma operação DROP, TRUNCATE, CREATE DATABASE ou USE é executada aqui.
--
-- Execute a partir da raiz do repositório para que os caminhos SOURCE resolvam.

SOURCE SergioWilliam2209/sql/001_materiais_compras_itens.sql;
SOURCE SergioWilliam2209/sql/002_procedures_materiais.sql;
SOURCE SergioWilliam2209/sql/003_procedures_compras.sql;
SOURCE SergioWilliam2209/sql/004_procedure_criar_compra.sql;
SOURCE SergioWilliam2209/sql/005_procedure_atualizar_compra.sql;
SOURCE SergioWilliam2209/sql/007_procedure_cancelar_compra.sql;
