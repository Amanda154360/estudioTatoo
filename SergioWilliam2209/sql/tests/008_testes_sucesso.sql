-- Testes com escrita. Execute somente após 007 confirmar dad_test_* e MySQL
-- 8.0.32, e após aplicar 006 nesse schema isolado vazio.
-- Não contém USE, CREATE/DROP DATABASE, DROP TABLE ou TRUNCATE.

SET @dad_test_material_name = 'DAD_SQL_TEST_MATERIAL';
SET @dad_test_purchase_note = 'DAD_SQL_TEST_PURCHASE';

-- CRUD de materiais: create, list, find, update e exclusão lógica.
CALL sp_cadastrar_material(
  @dad_test_material_name,
  'Descrição inicial para teste SQL',
  'ml'
);

SELECT id INTO @dad_test_material_id
FROM materiais
WHERE nome = @dad_test_material_name;

CALL sp_listar_materiais(@dad_test_material_name);
CALL sp_buscar_material_por_id(@dad_test_material_id);

CALL sp_atualizar_material(
  @dad_test_material_id,
  'DAD_SQL_TEST_MATERIAL_UPDATED',
  'Descrição atualizada para teste SQL',
  'ml'
);

SELECT
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS material_atualizado
FROM materiais
WHERE id = @dad_test_material_id
  AND nome = 'DAD_SQL_TEST_MATERIAL_UPDATED'
  AND descricao = 'Descrição atualizada para teste SQL';

-- Criação de compra com dois itens e decimais na precisão máxima do DDL.
-- Os decimais são strings no JSON, conforme validação das procedures 004/005.
CALL sp_criar_compra_com_itens(
  CURRENT_DATE,
  'BRL',
  @dad_test_purchase_note,
  JSON_ARRAY(
    JSON_OBJECT(
      'material_id', @dad_test_material_id,
      'quantidade', '2.125',
      'preco_unitario', '19.9900',
      'moeda', 'BRL'
    ),
    JSON_OBJECT(
      'material_id', @dad_test_material_id,
      'quantidade', '999999999.123',
      'preco_unitario', '99999999999.9999',
      'moeda', 'BRL'
    )
  )
);

SELECT id INTO @dad_test_purchase_id
FROM compras
WHERE observacoes = @dad_test_purchase_note;

SELECT id INTO @dad_test_item_id
FROM itens_compra
WHERE compra_id = @dad_test_purchase_id
ORDER BY id
LIMIT 1;

CALL sp_listar_compras(CURRENT_DATE, CURRENT_DATE);
CALL sp_buscar_compra_por_id(@dad_test_purchase_id);

SELECT
  CASE WHEN COUNT(*) = 2 THEN 'PASS' ELSE 'FAIL' END AS dois_itens_criados,
  CASE
    WHEN SUM(
      quantidade = CAST('999999999.123' AS DECIMAL(12,3))
      AND preco_unitario = CAST('99999999999.9999' AS DECIMAL(15,4))
    ) = 1
    THEN 'PASS' ELSE 'FAIL'
  END AS decimal_precision
FROM itens_compra
WHERE compra_id = @dad_test_purchase_id;

-- Atualiza cabeçalho, atualiza item pelo ID e acrescenta outro item.
CALL sp_atualizar_compra_com_itens(
  @dad_test_purchase_id,
  JSON_OBJECT(
    'data_compra', DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '%Y-%m-%d'),
    'observacoes', 'DAD_SQL_TEST_UPDATED'
  ),
  JSON_ARRAY(
    JSON_OBJECT(
      'id', @dad_test_item_id,
      'quantidade', '0.125',
      'preco_unitario', '1.0001'
    ),
    JSON_OBJECT(
      'material_id', @dad_test_material_id,
      'quantidade', '1.001',
      'preco_unitario', '0.0001',
      'moeda', 'BRL'
    )
  )
);

CALL sp_buscar_compra_por_id(@dad_test_purchase_id);

SELECT
  CASE
    WHEN c.observacoes = 'DAD_SQL_TEST_UPDATED'
      AND c.data_compra = DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)
    THEN 'PASS' ELSE 'FAIL'
  END AS cabecalho_atualizado,
  CASE WHEN COUNT(i.id) = 3 THEN 'PASS' ELSE 'FAIL' END AS itens_atualizados_e_adicionados,
  CASE
    WHEN MAX(
      i.id = @dad_test_item_id
      AND i.quantidade = CAST('0.125' AS DECIMAL(12,3))
      AND i.preco_unitario = CAST('1.0001' AS DECIMAL(15,4))
    ) = 1
    THEN 'PASS' ELSE 'FAIL'
  END AS item_decimal_preservado
FROM compras AS c
LEFT JOIN itens_compra AS i ON i.compra_id = c.id
WHERE c.id = @dad_test_purchase_id
GROUP BY c.id, c.observacoes, c.data_compra;

-- O snapshot do item mantém o nome original apesar da alteração do catálogo.
CALL sp_atualizar_material(
  @dad_test_material_id,
  'DAD_SQL_TEST_MATERIAL_FINAL',
  'Descrição final para teste SQL',
  'ml'
);

SELECT
  CASE WHEN COUNT(*) = 3 THEN 'PASS' ELSE 'FAIL' END AS snapshots_preservados
FROM itens_compra
WHERE compra_id = @dad_test_purchase_id
  AND nome_material_snapshot = @dad_test_material_name
  AND unidade_snapshot = 'ml';

CALL sp_listar_materiais('DAD_SQL_TEST_MATERIAL_FINAL');
