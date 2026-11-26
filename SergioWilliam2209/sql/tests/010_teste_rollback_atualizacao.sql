-- Espera-se que este CALL falhe com SIGNAL da procedure 005.
-- Execute somente no schema dad_test_* após 008_testes_sucesso.sql.
-- A primeira operação altera um item; a segunda falha. Cabeçalho e item devem
-- permanecer com os valores anteriores à chamada.
CALL sp_atualizar_compra_com_itens(
  (SELECT id FROM compras WHERE observacoes = 'DAD_SQL_TEST_UPDATED'),
  JSON_OBJECT(
    'data_compra', DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), '%Y-%m-%d'),
    'observacoes', 'DAD_SQL_TEST_SHOULD_ROLLBACK'
  ),
  JSON_ARRAY(
    JSON_OBJECT(
      'id', (
        SELECT id
        FROM itens_compra
        WHERE compra_id = (
          SELECT id FROM compras WHERE observacoes = 'DAD_SQL_TEST_UPDATED'
        )
        ORDER BY id
        LIMIT 1
      ),
      'quantidade', '9',
      'preco_unitario', '9.0000'
    ),
    JSON_OBJECT(
      'material_id', 2147483647,
      'quantidade', '1',
      'preco_unitario', '1.0000',
      'moeda', 'BRL'
    )
  )
);
