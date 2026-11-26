-- Execute na mesma conexão/sessão de 015, após confirmar que 016 falhou com
-- "Compra cancelada não pode ser alterada." Não presume quantidade de itens.

SELECT GROUP_CONCAT(
  CONCAT_WS(
    ':',
    id,
    material_id,
    quantidade,
    preco_unitario,
    COALESCE(nome_material_snapshot, ''),
    COALESCE(unidade_snapshot, '')
  )
  ORDER BY id SEPARATOR '|'
) INTO @dad_test_cancel_items_after
FROM itens_compra
WHERE compra_id = @dad_test_cancel_purchase_id;

SELECT
  CASE
    WHEN c.status = 'CANCELADA'
      AND c.cancelada_em = @dad_test_cancelled_at
      AND c.observacoes = @dad_test_cancel_purchase_note
      AND (SELECT COUNT(*) FROM itens_compra
           WHERE compra_id = c.id) = @dad_test_cancel_items_before
      AND @dad_test_cancel_items_after <=> @dad_test_cancel_items_snapshot
    THEN 'PASS' ELSE 'FAIL'
  END AS tentativa_edicao_bloqueada_historico_preservado
FROM compras AS c
WHERE c.id = @dad_test_cancel_purchase_id;
