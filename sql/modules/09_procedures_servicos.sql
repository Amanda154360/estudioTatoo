-- =============================================================================
-- MÓDULO 09: PROCEDIMENTOS DO ESTÚDIO (SERVIÇOS) — TRIGGERS E PROCEDURES
-- =============================================================================

USE estudio_tattoo;

DROP TRIGGER IF EXISTS trg_servicos_before_insert;
DROP TRIGGER IF EXISTS trg_servicos_before_update;
DROP PROCEDURE IF EXISTS sp_listar_servicos;
DROP PROCEDURE IF EXISTS sp_buscar_servico_por_id;
DROP PROCEDURE IF EXISTS sp_cadastrar_servico;
DROP PROCEDURE IF EXISTS sp_atualizar_servico;
DROP PROCEDURE IF EXISTS sp_excluir_servico;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- Validação na própria tabela: protege contra INSERT/UPDATE feitos fora do app.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_servicos_before_insert
BEFORE INSERT ON servicos
FOR EACH ROW
BEGIN
  IF TRIM(IFNULL(NEW.nome, '')) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O nome do procedimento é obrigatório.';
  END IF;
  IF NEW.preco_base < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O preço não pode ser negativo.';
  END IF;
  IF NEW.duracao_minutos <= 0 OR NEW.duracao_minutos > 1440 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duração inválida: use de 1 a 1440 minutos.';
  END IF;
  SET NEW.nome = TRIM(NEW.nome);
  SET NEW.descricao = NULLIF(TRIM(NEW.descricao), '');
END$$

CREATE TRIGGER trg_servicos_before_update
BEFORE UPDATE ON servicos
FOR EACH ROW
BEGIN
  IF TRIM(IFNULL(NEW.nome, '')) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O nome do procedimento é obrigatório.';
  END IF;
  IF NEW.preco_base < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O preço não pode ser negativo.';
  END IF;
  IF NEW.duracao_minutos <= 0 OR NEW.duracao_minutos > 1440 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duração inválida: use de 1 a 1440 minutos.';
  END IF;
  SET NEW.nome = TRIM(NEW.nome);
  SET NEW.descricao = NULLIF(TRIM(NEW.descricao), '');
END$$

-- -----------------------------------------------------------------------------
-- 1. LISTAR PROCEDIMENTOS (filtro por texto, categoria e status)
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_listar_servicos(
  IN p_termo VARCHAR(120),
  IN p_categoria VARCHAR(20),
  IN p_apenas_ativos TINYINT(1)
)
BEGIN
  SELECT
    s.id,
    s.nome,
    s.categoria,
    s.preco_base,
    s.duracao_minutos,
    s.descricao,
    s.ativo,
    s.criado_em,
    (SELECT COUNT(*) FROM agendamentos a WHERE a.servico_id = s.id) AS agendamentos_vinculados
  FROM servicos s
  WHERE (
      p_termo IS NULL
      OR TRIM(p_termo) = ''
      OR s.nome LIKE CONCAT('%', TRIM(p_termo), '%')
      OR IFNULL(s.descricao, '') LIKE CONCAT('%', TRIM(p_termo), '%')
    )
    AND (p_categoria IS NULL OR TRIM(p_categoria) = '' OR s.categoria = p_categoria)
    AND (p_apenas_ativos IS NULL OR p_apenas_ativos = 0 OR s.ativo = 1)
  ORDER BY s.ativo DESC, s.nome ASC;
END$$

-- -----------------------------------------------------------------------------
-- 2. BUSCAR PROCEDIMENTO POR ID
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_buscar_servico_por_id(IN p_id INT)
BEGIN
  SELECT
    s.id,
    s.nome,
    s.categoria,
    s.preco_base,
    s.duracao_minutos,
    s.descricao,
    s.ativo,
    s.criado_em,
    (SELECT COUNT(*) FROM agendamentos a WHERE a.servico_id = s.id) AS agendamentos_vinculados
  FROM servicos s
  WHERE s.id = p_id
  LIMIT 1;
END$$

-- -----------------------------------------------------------------------------
-- 3. CADASTRAR PROCEDIMENTO
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_cadastrar_servico(
  IN p_nome VARCHAR(120),
  IN p_categoria VARCHAR(20),
  IN p_preco_base DECIMAL(10,2),
  IN p_duracao_minutos INT,
  IN p_descricao TEXT,
  IN p_ativo TINYINT(1)
)
BEGIN
  IF TRIM(IFNULL(p_nome, '')) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Informe o nome do procedimento.';
  END IF;
  IF p_categoria NOT IN ('Tatuagem', 'Piercing', 'Estética') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Categoria inválida para o procedimento.';
  END IF;
  IF p_preco_base IS NULL OR p_preco_base < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O preço não pode ser negativo.';
  END IF;
  IF p_duracao_minutos IS NULL OR p_duracao_minutos < 5 OR p_duracao_minutos > 1440 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duração inválida: use de 5 a 1440 minutos.';
  END IF;

  INSERT INTO servicos (nome, categoria, preco_base, duracao_minutos, descricao, ativo)
  VALUES (
    TRIM(p_nome),
    p_categoria,
    p_preco_base,
    p_duracao_minutos,
    NULLIF(TRIM(p_descricao), ''),
    IFNULL(p_ativo, 1)
  );

  SELECT LAST_INSERT_ID() AS id;
END$$

-- -----------------------------------------------------------------------------
-- 4. ATUALIZAR PROCEDIMENTO
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_atualizar_servico(
  IN p_id INT,
  IN p_nome VARCHAR(120),
  IN p_categoria VARCHAR(20),
  IN p_preco_base DECIMAL(10,2),
  IN p_duracao_minutos INT,
  IN p_descricao TEXT,
  IN p_ativo TINYINT(1)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM servicos WHERE id = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Procedimento não encontrado.';
  END IF;
  IF TRIM(IFNULL(p_nome, '')) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Informe o nome do procedimento.';
  END IF;
  IF p_categoria NOT IN ('Tatuagem', 'Piercing', 'Estética') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Categoria inválida para o procedimento.';
  END IF;
  IF p_preco_base IS NULL OR p_preco_base < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O preço não pode ser negativo.';
  END IF;
  IF p_duracao_minutos IS NULL OR p_duracao_minutos < 5 OR p_duracao_minutos > 1440 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duração inválida: use de 5 a 1440 minutos.';
  END IF;

  UPDATE servicos SET
    nome = TRIM(p_nome),
    categoria = p_categoria,
    preco_base = p_preco_base,
    duracao_minutos = p_duracao_minutos,
    descricao = NULLIF(TRIM(p_descricao), ''),
    ativo = IFNULL(p_ativo, 1)
  WHERE id = p_id;

  SELECT ROW_COUNT() AS linhas_afetadas;
END$$

-- -----------------------------------------------------------------------------
-- 5. EXCLUIR PROCEDIMENTO (bloqueia se houver agendamento vinculado)
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_excluir_servico(IN p_id INT)
BEGIN
  DECLARE v_vinculos INT DEFAULT 0;

  IF NOT EXISTS (SELECT 1 FROM servicos WHERE id = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Procedimento não encontrado.';
  END IF;

  SELECT COUNT(*) INTO v_vinculos FROM agendamentos WHERE servico_id = p_id;

  IF v_vinculos > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Procedimento possui agendamentos. Desative-o em vez de excluir.';
  END IF;

  DELETE FROM servicos WHERE id = p_id;

  SELECT ROW_COUNT() AS linhas_afetadas;
END$$

DELIMITER ;
