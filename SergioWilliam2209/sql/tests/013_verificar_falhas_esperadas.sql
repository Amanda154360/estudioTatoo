-- Execute após os testes 009–012. Todos os indicadores devem mostrar PASS/zero.
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END
    AS criacao_falha_sem_compra
FROM compras
WHERE observacoes = 'DAD_SQL_TEST_ROLLBACK_CREATE';

SELECT
  CASE
    WHEN c.observacoes = 'DAD_SQL_TEST_UPDATED'
      AND c.data_compra = DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)
      AND i.quantidade = CAST('0.125' AS DECIMAL(12,3))
      AND i.preco_unitario = CAST('1.0001' AS DECIMAL(15,4))
      AND (SELECT COUNT(*) FROM itens_compra WHERE compra_id = c.id) = 3
    THEN 'PASS' ELSE 'FAIL'
  END AS atualizacao_falha_reverteu_tudo
FROM compras AS c
JOIN itens_compra AS i ON i.compra_id = c.id
WHERE c.observacoes = 'DAD_SQL_TEST_UPDATED'
ORDER BY i.id
LIMIT 1;

SELECT
  CASE WHEN COUNT(*) = 3 THEN 'PASS' ELSE 'FAIL' END
    AS fks_rejeitaram_itens_orfaos
FROM itens_compra AS i
JOIN compras AS c ON c.id = i.compra_id
WHERE c.observacoes = 'DAD_SQL_TEST_UPDATED';
