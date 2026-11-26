-- Procedures individuais de materiais. O esquema deve ser selecionado pelo runner.
-- CREATE PROCEDURE falha se o nome já existir; nenhuma procedure é substituída.

DELIMITER $$

CREATE PROCEDURE sp_listar_materiais(
    IN p_termo VARCHAR(120)
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci
)
BEGIN
  SELECT
    m.id,
    m.nome,
    m.descricao,
    m.unidade_medida,
    m.ativo
  FROM materiais AS m
  WHERE m.ativo = 1
    AND (
      p_termo IS NULL
      OR TRIM(p_termo) = ''
      OR m.nome LIKE CONCAT('%', TRIM(p_termo), '%')
      OR COALESCE(m.descricao, '') LIKE CONCAT('%', TRIM(p_termo), '%')
    )
  ORDER BY m.nome ASC, m.id ASC;
END$$

CREATE PROCEDURE sp_buscar_material_por_id(IN p_id INT)
BEGIN
  IF p_id IS NULL OR p_id <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Identificador de material inválido.';
  END IF;

  SELECT
    m.id,
    m.nome,
    m.descricao,
    m.unidade_medida,
    m.ativo
  FROM materiais AS m
  WHERE m.id = p_id
  LIMIT 1;
END$$

CREATE PROCEDURE sp_cadastrar_material(
  IN p_nome VARCHAR(120),
  IN p_descricao TEXT,
  IN p_unidade_medida VARCHAR(30)
)
BEGIN
  IF p_nome IS NULL OR TRIM(p_nome) = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Informe o nome do material.';
  END IF;

  IF p_unidade_medida IS NULL OR TRIM(p_unidade_medida) = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Informe a unidade de medida do material.';
  END IF;

  INSERT INTO materiais (nome, descricao, unidade_medida, ativo)
  VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_descricao), ''),
    TRIM(p_unidade_medida),
    1
  );

  SELECT
    m.id,
    m.nome,
    m.descricao,
    m.unidade_medida,
    m.ativo
  FROM materiais AS m
  WHERE m.id = LAST_INSERT_ID()
  LIMIT 1;
END$$

CREATE PROCEDURE sp_atualizar_material(
  IN p_id INT,
  IN p_nome VARCHAR(120),
  IN p_descricao TEXT,
  IN p_unidade_medida VARCHAR(30)
)
BEGIN
  IF p_id IS NULL OR p_id <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Identificador de material inválido.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM materiais WHERE id = p_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Material não encontrado.';
  END IF;

  IF p_nome IS NULL OR TRIM(p_nome) = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Informe o nome do material.';
  END IF;

  IF p_unidade_medida IS NULL OR TRIM(p_unidade_medida) = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Informe a unidade de medida do material.';
  END IF;

  UPDATE materiais
  SET
    nome = TRIM(p_nome),
    descricao = NULLIF(TRIM(p_descricao), ''),
    unidade_medida = TRIM(p_unidade_medida)
  WHERE id = p_id;

  -- Retornar o registro distingue "não encontrado" (SIGNAL) de nenhuma
  -- mudança de valores, e permite ao repositório reconstruir o DTO.
  SELECT
    m.id,
    m.nome,
    m.descricao,
    m.unidade_medida,
    m.ativo
  FROM materiais AS m
  WHERE m.id = p_id
  LIMIT 1;
END$$

CREATE PROCEDURE sp_excluir_material(IN p_id INT)
BEGIN
  DECLARE v_ativo TINYINT(1) DEFAULT NULL;

  IF p_id IS NULL OR p_id <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Identificador de material inválido.';
  END IF;

  SELECT m.ativo
    INTO v_ativo
  FROM materiais AS m
  WHERE m.id = p_id
  LIMIT 1;

  IF v_ativo IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Material não encontrado.';
  END IF;

  IF v_ativo = 1 THEN
    UPDATE materiais SET ativo = 0 WHERE id = p_id;
  END IF;

  -- Repetir a exclusão lógica é idempotente: retorna o mesmo estado inativo.
  SELECT m.id, m.ativo
  FROM materiais AS m
  WHERE m.id = p_id
  LIMIT 1;
END$$

DELIMITER ;
