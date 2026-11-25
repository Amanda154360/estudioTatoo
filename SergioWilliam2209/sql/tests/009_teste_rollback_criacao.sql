-- Espera-se que este CALL falhe com SIGNAL da procedure 004.
-- Execute somente no schema dad_test_* após 008_testes_sucesso.sql.
-- A segunda linha usa material inexistente; a transação deve reverter cabeçalho
-- e primeiro item. Depois, execute a consulta de verificação no README dos testes.
CALL sp_criar_compra_com_itens(
  CURRENT_DATE,
  'BRL',
  'DAD_SQL_TEST_ROLLBACK_CREATE',
  JSON_ARRAY(
    JSON_OBJECT(
      'material_id', (SELECT id FROM materiais WHERE nome = 'DAD_SQL_TEST_MATERIAL_FINAL'),
      'quantidade', '1',
      'preco_unitario', '1.0000',
      'moeda', 'BRL'
    ),
    JSON_OBJECT(
      'material_id', 2147483647,
      'quantidade', '1',
      'preco_unitario', '1.0000',
      'moeda', 'BRL'
    )
  )
);
