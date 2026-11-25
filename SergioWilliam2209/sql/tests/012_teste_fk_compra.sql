-- Espera-se erro de FK: compra_id inexistente.
-- Execute somente no schema dad_test_* após 008_testes_sucesso.sql.
INSERT INTO itens_compra (
  compra_id,
  material_id,
  quantidade,
  preco_unitario
)
VALUES (
  2147483647,
  (SELECT id FROM materiais WHERE nome = 'DAD_SQL_TEST_MATERIAL_FINAL'),
  1.000,
  1.0000
);
