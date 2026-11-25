-- Atualização parcial transacional individual de compra e itens.
-- O esquema é selecionado pelo runner; não remove itens, altera moeda/cotação
-- nem registra movimentações de estoque.

DELIMITER $$

CREATE PROCEDURE sp_atualizar_compra_com_itens(
  IN p_id INT,
  IN p_cabecalho JSON,
  IN p_itens JSON
)
BEGIN
  DECLARE v_encontrado TINYINT DEFAULT 1;
  DECLARE v_compra_id INT;
  DECLARE v_data_compra DATE;
  DECLARE v_data_texto VARCHAR(32);
  DECLARE v_observacoes TEXT;
  DECLARE v_moeda_compra VARCHAR(3);
  DECLARE v_total_itens INT DEFAULT 0;
  DECLARE v_indice INT DEFAULT 0;
  DECLARE v_indice_anterior INT DEFAULT 0;
  DECLARE v_tem_id TINYINT DEFAULT 0;
  DECLARE v_item_id BIGINT UNSIGNED DEFAULT 0;
  DECLARE v_item_id_texto VARCHAR(64);
  DECLARE v_item_encontrado INT DEFAULT NULL;
  DECLARE v_material_id BIGINT UNSIGNED DEFAULT 0;
  DECLARE v_material_id_texto VARCHAR(64);
  DECLARE v_material_encontrado TINYINT DEFAULT 1;
  DECLARE v_moeda_item VARCHAR(255);
  DECLARE v_quantidade_texto VARCHAR(64);
  DECLARE v_preco_texto VARCHAR(64);
  DECLARE v_quantidade DECIMAL(12,3);
  DECLARE v_preco_unitario DECIMAL(15,4);
  DECLARE v_nome_material VARCHAR(120);
  DECLARE v_unidade_material VARCHAR(30);
  DECLARE v_tem_mudanca_cabecalho TINYINT DEFAULT 0;

  DECLARE CONTINUE HANDLER FOR NOT FOUND
    SET v_encontrado = 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_id IS NULL OR p_id <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Identificador de compra inválido.';
  END IF;
  IF p_cabecalho IS NULL OR COALESCE(JSON_TYPE(p_cabecalho), '') <> 'OBJECT' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'O cabeçalho deve ser um objeto JSON.';
  END IF;
  IF JSON_LENGTH(JSON_KEYS(p_cabecalho)) <>
    JSON_CONTAINS_PATH(p_cabecalho, 'one', '$.data_compra')
    + JSON_CONTAINS_PATH(p_cabecalho, 'one', '$.observacoes') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'O cabeçalho contém campos não permitidos.';
  END IF;
  IF p_itens IS NULL OR COALESCE(JSON_TYPE(p_itens), '') <> 'ARRAY' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'As operações de itens devem ser um array JSON.';
  END IF;

  SET v_total_itens = JSON_LENGTH(p_itens);
  IF v_total_itens > 100 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'O limite provisório é de 100 operações de item.';
  END IF;

  START TRANSACTION;

  SET v_encontrado = 1;
  SELECT c.data_compra, c.observacoes, c.moeda
    INTO v_data_compra, v_observacoes, v_moeda_compra
  FROM compras AS c
  WHERE c.id = p_id
  FOR UPDATE;

  IF v_encontrado = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Compra não encontrada.';
  END IF;
  SET v_moeda_compra = UPPER(TRIM(v_moeda_compra));

  IF JSON_CONTAINS_PATH(p_cabecalho, 'one', '$.data_compra') = 1 THEN
    IF COALESCE(JSON_TYPE(JSON_EXTRACT(p_cabecalho, '$.data_compra')), '') <> 'STRING' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A data da compra deve ser uma string YYYY-MM-DD.';
    END IF;
    SET v_data_texto = JSON_UNQUOTE(JSON_EXTRACT(p_cabecalho, '$.data_compra'));
    IF v_data_texto NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      OR STR_TO_DATE(v_data_texto, '%Y-%m-%d') IS NULL
      OR DATE_FORMAT(STR_TO_DATE(v_data_texto, '%Y-%m-%d'), '%Y-%m-%d') <> v_data_texto THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Data da compra inválida.';
    END IF;
    SET v_data_compra = STR_TO_DATE(v_data_texto, '%Y-%m-%d');
    SET v_tem_mudanca_cabecalho = 1;
  END IF;

  IF JSON_CONTAINS_PATH(p_cabecalho, 'one', '$.observacoes') = 1 THEN
    IF JSON_TYPE(JSON_EXTRACT(p_cabecalho, '$.observacoes')) = 'NULL' THEN
      SET v_observacoes = NULL;
    ELSEIF JSON_TYPE(JSON_EXTRACT(p_cabecalho, '$.observacoes')) = 'STRING' THEN
      SET v_observacoes = NULLIF(
        TRIM(JSON_UNQUOTE(JSON_EXTRACT(p_cabecalho, '$.observacoes'))),
        ''
      );
    ELSE
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Observações devem ser texto ou null.';
    END IF;
    SET v_tem_mudanca_cabecalho = 1;
  END IF;

  WHILE v_indice < v_total_itens DO
    IF COALESCE(
      JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, ']'))),
      ''
    ) <> 'OBJECT' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cada operação de item deve ser um objeto JSON.';
    END IF;

    SET v_tem_id = JSON_CONTAINS_PATH(
      p_itens, 'one', CONCAT('$[', v_indice, '].id')
    );

    IF v_tem_id = 1 THEN
      IF JSON_LENGTH(JSON_KEYS(JSON_EXTRACT(
          p_itens, CONCAT('$[', v_indice, ']')
        ))) <>
        JSON_CONTAINS_PATH(p_itens, 'one', CONCAT('$[', v_indice, '].id'))
        + JSON_CONTAINS_PATH(p_itens, 'one', CONCAT('$[', v_indice, '].quantidade'))
        + JSON_CONTAINS_PATH(p_itens, 'one', CONCAT('$[', v_indice, '].preco_unitario')) THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'A atualização contém campos de item não permitidos.';
      END IF;

      IF COALESCE(
        JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].id'))),
        ''
      ) <> 'INTEGER' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'O ID do item deve ser inteiro.';
      END IF;
      SET v_item_id_texto = JSON_UNQUOTE(
        JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].id'))
      );
      IF v_item_id_texto NOT REGEXP '^[1-9][0-9]{0,9}$' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'ID de item inválido.';
      END IF;
      SET v_item_id = CAST(v_item_id_texto AS UNSIGNED);
      IF v_item_id > 2147483647 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'ID de item inválido.';
      END IF;

      -- Rejeita IDs repetidos no payload; o limite de 100 mantém o custo O(n²) restrito.
      SET v_indice_anterior = 0;
      WHILE v_indice_anterior < v_indice DO
        IF JSON_CONTAINS_PATH(p_itens, 'one',
            CONCAT('$[', v_indice_anterior, '].id')) = 1
          AND CAST(JSON_UNQUOTE(JSON_EXTRACT(
            p_itens, CONCAT('$[', v_indice_anterior, '].id')
          )) AS UNSIGNED) = v_item_id THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'O payload contém IDs de item duplicados.';
        END IF;
        SET v_indice_anterior = v_indice_anterior + 1;
      END WHILE;

      IF COALESCE(
        JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].quantidade'))),
        ''
      ) <> 'STRING'
      OR COALESCE(
        JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].preco_unitario'))),
        ''
      ) <> 'STRING' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Quantidade e preço devem ser strings decimais.';
      END IF;
      SET v_quantidade_texto = JSON_UNQUOTE(
        JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].quantidade'))
      );
      SET v_preco_texto = JSON_UNQUOTE(
        JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].preco_unitario'))
      );

      IF v_quantidade_texto NOT REGEXP '^(0|[1-9][0-9]{0,8})([.][0-9]{1,3})?$' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Quantidade fora do formato ou precisão permitidos.';
      END IF;
      IF v_preco_texto NOT REGEXP '^(0|[1-9][0-9]{0,10})([.][0-9]{1,4})?$' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Preço unitário fora do formato ou precisão permitidos.';
      END IF;
      SET v_quantidade = CAST(v_quantidade_texto AS DECIMAL(12,3));
      SET v_preco_unitario = CAST(v_preco_texto AS DECIMAL(15,4));
      IF v_quantidade <= 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'A quantidade deve ser maior que zero.';
      END IF;

      SET v_encontrado = 1;
      SET v_item_encontrado = NULL;
      SELECT i.id INTO v_item_encontrado
      FROM itens_compra AS i
      WHERE i.id = v_item_id
        AND i.compra_id = p_id
      FOR UPDATE;
      IF v_encontrado = 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Item não encontrado nesta compra.';
      END IF;

      UPDATE itens_compra
      SET quantidade = v_quantidade,
          preco_unitario = v_preco_unitario
      WHERE id = v_item_id
        AND compra_id = p_id;
    ELSE
      IF JSON_LENGTH(JSON_KEYS(JSON_EXTRACT(
          p_itens, CONCAT('$[', v_indice, ']')
        ))) <>
        JSON_CONTAINS_PATH(p_itens, 'one', CONCAT('$[', v_indice, '].material_id'))
        + JSON_CONTAINS_PATH(p_itens, 'one', CONCAT('$[', v_indice, '].quantidade'))
        + JSON_CONTAINS_PATH(p_itens, 'one', CONCAT('$[', v_indice, '].preco_unitario'))
        + JSON_CONTAINS_PATH(p_itens, 'one', CONCAT('$[', v_indice, '].moeda')) THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'A inclusão contém campos de item não permitidos.';
      END IF;

      IF COALESCE(
        JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].material_id'))),
        ''
      ) <> 'INTEGER' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Novo item exige ID inteiro de material.';
      END IF;
      SET v_material_id_texto = JSON_UNQUOTE(
        JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].material_id'))
      );
      IF v_material_id_texto NOT REGEXP '^[1-9][0-9]{0,9}$' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'ID de material inválido.';
      END IF;
      SET v_material_id = CAST(v_material_id_texto AS UNSIGNED);
      IF v_material_id > 2147483647 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'ID de material inválido.';
      END IF;

      IF COALESCE(
        JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].quantidade'))),
        ''
      ) <> 'STRING'
      OR COALESCE(
        JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].preco_unitario'))),
        ''
      ) <> 'STRING'
      OR COALESCE(
        JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].moeda'))),
        ''
      ) <> 'STRING' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Novo item exige quantidade, preço decimal e moeda.';
      END IF;

      SET v_quantidade_texto = JSON_UNQUOTE(
        JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].quantidade'))
      );
      SET v_preco_texto = JSON_UNQUOTE(
        JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].preco_unitario'))
      );
      IF v_quantidade_texto NOT REGEXP '^(0|[1-9][0-9]{0,8})([.][0-9]{1,3})?$' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Quantidade fora do formato ou precisão permitidos.';
      END IF;
      IF v_preco_texto NOT REGEXP '^(0|[1-9][0-9]{0,10})([.][0-9]{1,4})?$' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Preço unitário fora do formato ou precisão permitidos.';
      END IF;
      SET v_quantidade = CAST(v_quantidade_texto AS DECIMAL(12,3));
      SET v_preco_unitario = CAST(v_preco_texto AS DECIMAL(15,4));
      IF v_quantidade <= 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'A quantidade deve ser maior que zero.';
      END IF;

      SET v_moeda_item = UPPER(TRIM(JSON_UNQUOTE(
        JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].moeda'))
      )));
      IF CHAR_LENGTH(v_moeda_item) <> 3
        OR BINARY v_moeda_item <> BINARY v_moeda_compra THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'A moeda do item deve corresponder à moeda da compra.';
      END IF;

      SET v_encontrado = 1;
      SELECT m.nome, m.unidade_medida
        INTO v_nome_material, v_unidade_material
      FROM materiais AS m
      WHERE m.id = v_material_id
        AND m.ativo = 1
      FOR UPDATE;
      IF v_encontrado = 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Material inexistente ou inativo.';
      END IF;

      INSERT INTO itens_compra (
        compra_id, material_id, quantidade, preco_unitario,
        nome_material_snapshot, unidade_snapshot
      )
      VALUES (
        p_id, v_material_id, v_quantidade, v_preco_unitario,
        v_nome_material, v_unidade_material
      );
    END IF;

    SET v_indice = v_indice + 1;
  END WHILE;

  IF v_tem_mudanca_cabecalho = 1 THEN
    UPDATE compras
    SET data_compra = v_data_compra,
        observacoes = v_observacoes
    WHERE id = p_id;
  END IF;

  COMMIT;
  SELECT p_id AS id;
END$$

DELIMITER ;
