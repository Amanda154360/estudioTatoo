-- =============================================================================
-- MÓDULO 07: PROCEDURES PARA GESTÃO DE PROFISSIONAIS
-- =============================================================================

USE estudio_tattoo;

DROP PROCEDURE IF EXISTS sp_cadastrar_profissional;
DROP PROCEDURE IF EXISTS sp_atualizar_profissional;
DROP PROCEDURE IF EXISTS sp_excluir_profissional;
DROP PROCEDURE IF EXISTS sp_listar_profissionais;
DROP PROCEDURE IF EXISTS sp_buscar_profissional_por_id;

DELIMITER $$

-- 1. CADASTRAR PROFISSIONAL
CREATE PROCEDURE sp_cadastrar_profissional(
  IN p_nome VARCHAR(150),
  IN p_cpf VARCHAR(14),
  IN p_telefone VARCHAR(20),
  IN p_email VARCHAR(100),
  IN p_especialidade VARCHAR(50),
  IN p_comissao_percentual DECIMAL(5,2),
  IN p_ativo TINYINT(1),
  IN p_observacoes TEXT
)
BEGIN
  INSERT INTO profissionais (
    nome, cpf, telefone, email, especialidade, comissao_percentual, ativo, observacoes
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_cpf), ''),
    TRIM(p_telefone),
    NULLIF(TRIM(p_email), ''),
    p_especialidade,
    IFNULL(p_comissao_percentual, 0.00),
    IFNULL(p_ativo, 1),
    NULLIF(TRIM(p_observacoes), '')
  );

  SELECT 
    LAST_INSERT_ID() AS id,
    'Profissional cadastrado com sucesso' AS mensagem;
END $$

-- 2. ATUALIZAR PROFISSIONAL
CREATE PROCEDURE sp_atualizar_profissional(
  IN p_id INT,
  IN p_nome VARCHAR(150),
  IN p_cpf VARCHAR(14),
  IN p_telefone VARCHAR(20),
  IN p_email VARCHAR(100),
  IN p_especialidade VARCHAR(50),
  IN p_comissao_percentual DECIMAL(5,2),
  IN p_ativo TINYINT(1),
  IN p_observacoes TEXT
)
BEGIN
  UPDATE profissionais SET
    nome = TRIM(p_nome),
    cpf = NULLIF(TRIM(p_cpf), ''),
    telefone = TRIM(p_telefone),
    email = NULLIF(TRIM(p_email), ''),
    especialidade = p_especialidade,
    comissao_percentual = IFNULL(p_comissao_percentual, 0.00),
    ativo = IFNULL(p_ativo, 1),
    observacoes = NULLIF(TRIM(p_observacoes), '')
  WHERE id = p_id;

  SELECT ROW_COUNT() AS linhas_afetadas, 'Profissional atualizado com sucesso' AS mensagem;
END $$

-- 3. EXCLUIR PROFISSIONAL (Com validação referencial em agendamentos)
CREATE PROCEDURE sp_excluir_profissional(IN p_id INT)
BEGIN
  IF EXISTS (SELECT 1 FROM agendamentos WHERE profissional_id = p_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Não é possível excluir o profissional pois existem agendamentos vinculados a ele.';
  ELSE
    DELETE FROM profissionais WHERE id = p_id;
    SELECT ROW_COUNT() AS linhas_afetadas, 'Profissional excluído com sucesso' AS mensagem;
  END IF;
END $$

-- 4. LISTAR PROFISSIONAIS
CREATE PROCEDURE sp_listar_profissionais(
  IN p_especialidade VARCHAR(50),
  IN p_apenas_ativos TINYINT(1)
)
BEGIN
  SELECT 
    id, nome, cpf, telefone, email, especialidade, comissao_percentual, ativo, observacoes, criado_em
  FROM profissionais
  WHERE (p_especialidade IS NULL OR TRIM(p_especialidade) = '' OR especialidade = p_especialidade)
    AND (p_apenas_ativos IS NULL OR p_apenas_ativos = 0 OR ativo = 1)
  ORDER BY nome ASC;
END $$

-- 5. BUSCAR PROFISSIONAL POR ID
CREATE PROCEDURE sp_buscar_profissional_por_id(IN p_id INT)
BEGIN
  SELECT * FROM profissionais WHERE id = p_id LIMIT 1;
END $$

DELIMITER ;
