-- RASCUNHO — procedures de consulta de compras; pendente de aprovação coletiva.
-- Não executar até revisão e integração por mecanismo de migração controlado.
-- Este arquivo não cria, remove nem modifica dados ou procedures existentes.

USE estudio_tattoo;

DELIMITER $$

CREATE PROCEDURE sp_listar_compras(
  IN p_data_inicial DATE,
  IN p_data_final DATE
)
BEGIN
  IF p_data_inicial IS NOT NULL
    AND p_data_final IS NOT NULL
    AND p_data_inicial > p_data_final THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Intervalo de datas inválido.';
  END IF;

  SELECT
    c.id,
    c.data_compra,
    c.moeda,
    c.observacoes,
    c.cotacao_moeda_base,
    c.cotacao_moeda_destino,
    c.cotacao_valor,
    c.cotacao_em,
    c.cotacao_data_referencia,
    c.cotacao_fonte,
    c.criado_em,
    c.atualizado_em
  FROM compras AS c
  WHERE (p_data_inicial IS NULL OR c.data_compra >= p_data_inicial)
    AND (p_data_final IS NULL OR c.data_compra <= p_data_final)
  ORDER BY c.data_compra DESC, c.id DESC;
END$$

CREATE PROCEDURE sp_buscar_compra_por_id(IN p_id INT)
BEGIN
  IF p_id IS NULL OR p_id <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Identificador de compra inválido.';
  END IF;

  SELECT
    c.id AS compra_id,
    c.data_compra AS compra_data_compra,
    c.moeda AS compra_moeda,
    c.observacoes AS compra_observacoes,
    c.cotacao_moeda_base AS compra_cotacao_moeda_base,
    c.cotacao_moeda_destino AS compra_cotacao_moeda_destino,
    c.cotacao_valor AS compra_cotacao_valor,
    c.cotacao_em AS compra_cotacao_em,
    c.cotacao_data_referencia AS compra_cotacao_data_referencia,
    c.cotacao_fonte AS compra_cotacao_fonte,
    c.criado_em AS compra_criado_em,
    c.atualizado_em AS compra_atualizado_em,
    i.id AS item_id,
    i.material_id AS item_material_id,
    i.quantidade AS item_quantidade,
    i.preco_unitario AS item_preco_unitario,
    i.nome_material_snapshot AS item_nome_material_snapshot,
    i.unidade_snapshot AS item_unidade_snapshot,
    i.criado_em AS item_criado_em
  FROM compras AS c
  LEFT JOIN itens_compra AS i
    ON i.compra_id = c.id
  WHERE c.id = p_id
  ORDER BY i.id ASC;
END$$

DELIMITER ;
