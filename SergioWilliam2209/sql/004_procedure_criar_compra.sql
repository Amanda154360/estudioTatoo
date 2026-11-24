-- RASCUNHO — criação transacional de compra e itens; pendente de aprovação.
-- Não executar até validar versão/configuração MySQL e integrar por migração.
-- Requer suporte a JSON e rotinas SIGNAL/RESIGNAL (MySQL 5.7.8+).

USE estudio_tattoo;

DELIMITER $$

CREATE PROCEDURE sp_criar_compra_com_itens(
  IN p_data_compra DATE,
  IN p_moeda CHAR(3),
  IN p_observacoes TEXT,
  IN p_itens JSON
)
BEGIN
  DECLARE v_total_itens INT DEFAULT 0;
  DECLARE v_indice INT DEFAULT 0;
  DECLARE v_compra_id INT DEFAULT NULL;
  DECLARE v_material_id BIGINT UNSIGNED DEFAULT 0;
  DECLARE v_material_id_text VARCHAR(64);
  DECLARE v_material_encontrado TINYINT DEFAULT 1;
  DECLARE v_moeda VARCHAR(3);
  DECLARE v_moeda_item VARCHAR(255);
  DECLARE v_quantidade_texto VARCHAR(64);
  DECLARE v_preco_texto VARCHAR(64);
  DECLARE v_quantidade DECIMAL(12,3);
  DECLARE v_preco_unitario DECIMAL(15,4);
  DECLARE v_nome_material VARCHAR(120);
  DECLARE v_unidade_material VARCHAR(30);

  DECLARE CONTINUE HANDLER FOR NOT FOUND
    SET v_material_encontrado = 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_data_compra IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A data da compra é obrigatória.';
  END IF;

  SET v_moeda = UPPER(TRIM(p_moeda));
  IF v_moeda IS NULL OR CHAR_LENGTH(v_moeda) <> 3 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Informe um código de moeda com três caracteres.';
  END IF;

  IF p_itens IS NULL OR JSON_VALID(p_itens) = 0
    OR COALESCE(JSON_TYPE(p_itens), '') <> 'ARRAY' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A lista de itens deve ser um array JSON válido.';
  END IF;

  SET v_total_itens = JSON_LENGTH(p_itens);
  IF v_total_itens < 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A compra deve conter ao menos um item.';
  END IF;
  IF v_total_itens > 100 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A compra excede o limite provisório de 100 itens.';
  END IF;

  START TRANSACTION;

  -- Campos de cotação não estão presentes em CreatePurchaseInput nesta versão;
  -- portanto permanecem NULL conforme o esquema.
  INSERT INTO compras (data_compra, moeda, observacoes)
  VALUES (p_data_compra, v_moeda, NULLIF(TRIM(p_observacoes), ''));
  SET v_compra_id = LAST_INSERT_ID();

  WHILE v_indice < v_total_itens DO
    IF COALESCE(
      JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, ']'))),
      ''
    ) <> 'OBJECT' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cada item deve ser um objeto JSON.';
    END IF;

    IF COALESCE(
      JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].material_id'))),
      ''
    ) <> 'INTEGER' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'O identificador do material deve ser inteiro.';
    END IF;

    SET v_material_id_text = JSON_UNQUOTE(
      JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].material_id'))
    );
    IF v_material_id_text IS NULL
      OR v_material_id_text NOT REGEXP '^[1-9][0-9]{0,9}$' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Identificador de material inválido.';
    END IF;
    SET v_material_id = CAST(v_material_id_text AS UNSIGNED);
    IF v_material_id < 1 OR v_material_id > 2147483647 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Identificador de material inválido.';
    END IF;

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

    -- Limites correspondem a DECIMAL(12,3) e DECIMAL(15,4).
    -- A gramática exclui sinal, expoente, espaços e dígitos fracionários
    -- além da escala, evitando arredondamento silencioso no CAST.
    IF v_quantidade_texto IS NULL
      OR v_quantidade_texto NOT REGEXP '^(0|[1-9][0-9]{0,8})([.][0-9]{1,3})?$' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Quantidade fora do formato ou precisão permitidos.';
    END IF;
    IF v_preco_texto IS NULL
      OR v_preco_texto NOT REGEXP '^(0|[1-9][0-9]{0,10})([.][0-9]{1,4})?$' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Preço unitário fora do formato ou precisão permitidos.';
    END IF;

    SET v_quantidade = CAST(v_quantidade_texto AS DECIMAL(12,3));
    SET v_preco_unitario = CAST(v_preco_texto AS DECIMAL(15,4));
    IF v_quantidade <= 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A quantidade deve ser maior que zero.';
    END IF;

    IF COALESCE(
      JSON_TYPE(JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].moeda'))),
      ''
    ) <> 'STRING' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A moeda do item é obrigatória.';
    END IF;
    SET v_moeda_item = UPPER(TRIM(JSON_UNQUOTE(
      JSON_EXTRACT(p_itens, CONCAT('$[', v_indice, '].moeda'))
    )));
    IF CHAR_LENGTH(v_moeda_item) <> 3
      OR BINARY v_moeda_item <> BINARY v_moeda THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A moeda do item deve corresponder à moeda da compra.';
    END IF;

    -- Locking read: serializa com alterações concorrentes do estado do material
    -- e obtém os dados de catálogo usados nos snapshots, sem confiar no cliente.
    SET v_material_encontrado = 1;
    SELECT m.nome, m.unidade_medida
      INTO v_nome_material, v_unidade_material
    FROM materiais AS m
    WHERE m.id = v_material_id
      AND m.ativo = 1
    FOR UPDATE;

    IF v_material_encontrado = 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Material inexistente ou inativo.';
    END IF;

    INSERT INTO itens_compra (
      compra_id,
      material_id,
      quantidade,
      preco_unitario,
      nome_material_snapshot,
      unidade_snapshot
    )
    VALUES (
      v_compra_id,
      v_material_id,
      v_quantidade,
      v_preco_unitario,
      v_nome_material,
      v_unidade_material
    );

    SET v_indice = v_indice + 1;
  END WHILE;

  COMMIT;

  -- Um único conjunto de resultados; o repositório pode buscar o detalhe
  -- por ID usando sp_buscar_compra_por_id para construir PurchaseDto.
  SELECT v_compra_id AS id;
END$$

DELIMITER ;
