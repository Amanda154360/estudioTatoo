-- Execute em schema descartável após instalação e testes 008–014.
-- Cria seus próprios dados; não depende dos marcadores nem das variáveis
-- definidos por 008. Rode 015, 016 e 017 na mesma conexão/sessão SQL.

SET @dad_test_cancel_material_name =
  CONCAT('DAD_CANCEL_', REPLACE(UUID(), '-', ''));
SET @dad_test_cancel_purchase_note =
  CONCAT('DAD_CANCEL_', REPLACE(UUID(), '-', ''));

CALL sp_cadastrar_material(
  @dad_test_cancel_material_name,
  'Material criado pelo teste isolado de cancelamento',
  'un'
);

SELECT id INTO @dad_test_cancel_material_id
FROM materiais
WHERE nome = @dad_test_cancel_material_name
LIMIT 1;

CALL sp_criar_compra_com_itens(
  CURRENT_DATE,
  'BRL',
  @dad_test_cancel_purchase_note,
  JSON_ARRAY(JSON_OBJECT(
    'material_id', @dad_test_cancel_material_id,
    'quantidade', '1.000',
    'preco_unitario', '1.0000',
    'moeda', 'BRL'
  ))
);

SELECT id INTO @dad_test_cancel_purchase_id
FROM compras
WHERE observacoes = @dad_test_cancel_purchase_note
LIMIT 1;

-- Prova também que a criação aplica o default ATIVA.
SELECT
  CASE WHEN status = 'ATIVA' AND cancelada_em IS NULL
    THEN 'PASS' ELSE 'FAIL'
  END AS nova_compra_inicia_ativa
FROM compras
WHERE id = @dad_test_cancel_purchase_id;

SELECT COUNT(*) INTO @dad_test_cancel_items_before
FROM itens_compra
WHERE compra_id = @dad_test_cancel_purchase_id;

-- Snapshot dos itens para comparação posterior, sem fixar cardinalidade.
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
) INTO @dad_test_cancel_items_snapshot
FROM itens_compra
WHERE compra_id = @dad_test_cancel_purchase_id;

CALL sp_cancelar_compra(@dad_test_cancel_purchase_id);

SELECT cancelada_em INTO @dad_test_cancelled_at
FROM compras
WHERE id = @dad_test_cancel_purchase_id;

SELECT
  CASE
    WHEN status = 'CANCELADA' AND cancelada_em IS NOT NULL
    THEN 'PASS' ELSE 'FAIL'
  END AS compra_cancelada
FROM compras
WHERE id = @dad_test_cancel_purchase_id;

CALL sp_cancelar_compra(@dad_test_cancel_purchase_id);

SELECT
  CASE
    WHEN c.status = 'CANCELADA'
      AND c.cancelada_em = @dad_test_cancelled_at
      AND (SELECT COUNT(*) FROM itens_compra
           WHERE compra_id = c.id) = @dad_test_cancel_items_before
    THEN 'PASS' ELSE 'FAIL'
  END AS repeticao_preserva_timestamp_e_contagem_itens
FROM compras AS c
WHERE c.id = @dad_test_cancel_purchase_id;
