-- Este CALL deve falhar com SIGNAL "Compra cancelada não pode ser alterada."
-- Execute separadamente após 015_teste_cancelamento_compra.sql.
CALL sp_atualizar_compra_com_itens(
  (SELECT id FROM compras WHERE observacoes = 'DAD_SQL_TEST_UPDATED' LIMIT 1),
  JSON_OBJECT('observacoes', 'DAD_SQL_TEST_EDIT_MUST_FAIL'),
  JSON_ARRAY()
);
