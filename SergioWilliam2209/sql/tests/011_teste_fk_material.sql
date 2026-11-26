-- Espera-se erro de FK: material_id inexistente.
-- Execute somente no schema dad_test_* após 008_testes_sucesso.sql.
INSERT INTO itens_compra (
  compra_id,
  material_id,
  quantidade,
  preco_unitario
)
VALUES (
  (SELECT id FROM compras WHERE observacoes = 'DAD_SQL_TEST_UPDATED'),
  2147483647,
  1.000,
  1.0000
);
