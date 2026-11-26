-- Execute por último, depois de 009–013. A exclusão de material é lógica.
CALL sp_excluir_material(
  (SELECT id FROM materiais WHERE nome = 'DAD_SQL_TEST_MATERIAL_FINAL')
);

SELECT
  CASE
    WHEN (SELECT ativo FROM materiais WHERE nome = 'DAD_SQL_TEST_MATERIAL_FINAL') = 0
      AND (
        SELECT COUNT(*)
        FROM itens_compra AS i
        JOIN compras AS c ON c.id = i.compra_id
        WHERE c.observacoes = 'DAD_SQL_TEST_UPDATED'
      ) = 3
    THEN 'PASS' ELSE 'FAIL'
  END AS exclusao_logica_preserva_historico;

CALL sp_listar_materiais('DAD_SQL_TEST_MATERIAL_FINAL');
