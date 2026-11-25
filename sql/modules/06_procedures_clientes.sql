-- =============================================================================
-- MÓDULO 06: PROCEDURES PARA GESTÃO DE CLIENTES
-- =============================================================================

USE estudio_tattoo;

DROP PROCEDURE IF EXISTS sp_cadastrar_cliente;
DROP PROCEDURE IF EXISTS sp_atualizar_cliente;
DROP PROCEDURE IF EXISTS sp_excluir_cliente;
DROP PROCEDURE IF EXISTS sp_listar_clientes;
DROP PROCEDURE IF EXISTS sp_buscar_cliente_por_id;
DROP PROCEDURE IF EXISTS sp_buscar_clientes_por_cep;

DELIMITER $$

-- 1. CADASTRAR CLIENTE (Com registro automático do CEP)
CREATE PROCEDURE sp_cadastrar_cliente(
  IN p_nome VARCHAR(150),
  IN p_cpf VARCHAR(14),
  IN p_telefone VARCHAR(20),
  IN p_email VARCHAR(100),
  IN p_data_nascimento DATE,
  IN p_cep VARCHAR(20),
  IN p_logradouro VARCHAR(150),
  IN p_numero VARCHAR(20),
  IN p_complemento VARCHAR(100),
  IN p_bairro VARCHAR(100),
  IN p_cidade VARCHAR(100),
  IN p_estado CHAR(2),
  IN p_observacoes_medicas TEXT
)
BEGIN
  DECLARE v_cep_formatado VARCHAR(9);
  SET v_cep_formatado = fn_formatar_cep(p_cep);

  -- Salva ou atualiza o CEP no catálogo do banco SQL
  IF p_logradouro IS NOT NULL AND TRIM(p_logradouro) <> '' THEN
    CALL sp_salvar_cep(v_cep_formatado, p_logradouro, p_bairro, p_cidade, p_estado);
  END IF;

  -- Insere o cliente
  INSERT INTO clientes (
    nome, cpf, telefone, email, data_nascimento,
    cep, logradouro, numero, complemento, bairro, cidade, estado, observacoes_medicas
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_cpf), ''),
    TRIM(p_telefone),
    NULLIF(TRIM(p_email), ''),
    p_data_nascimento,
    v_cep_formatado,
    TRIM(p_logradouro),
    TRIM(p_numero),
    NULLIF(TRIM(p_complemento), ''),
    TRIM(p_bairro),
    TRIM(p_cidade),
    UPPER(TRIM(p_estado)),
    NULLIF(TRIM(p_observacoes_medicas), '')
  );

  SELECT 
    LAST_INSERT_ID() AS id,
    'Cliente cadastrado com sucesso' AS mensagem;
END $$

-- 2. ATUALIZAR CLIENTE
CREATE PROCEDURE sp_atualizar_cliente(
  IN p_id INT,
  IN p_nome VARCHAR(150),
  IN p_cpf VARCHAR(14),
  IN p_telefone VARCHAR(20),
  IN p_email VARCHAR(100),
  IN p_data_nascimento DATE,
  IN p_cep VARCHAR(20),
  IN p_logradouro VARCHAR(150),
  IN p_numero VARCHAR(20),
  IN p_complemento VARCHAR(100),
  IN p_bairro VARCHAR(100),
  IN p_cidade VARCHAR(100),
  IN p_estado CHAR(2),
  IN p_observacoes_medicas TEXT
)
BEGIN
  DECLARE v_cep_formatado VARCHAR(9);
  SET v_cep_formatado = fn_formatar_cep(p_cep);

  IF p_logradouro IS NOT NULL AND TRIM(p_logradouro) <> '' THEN
    CALL sp_salvar_cep(v_cep_formatado, p_logradouro, p_bairro, p_cidade, p_estado);
  END IF;

  UPDATE clientes SET
    nome = TRIM(p_nome),
    cpf = NULLIF(TRIM(p_cpf), ''),
    telefone = TRIM(p_telefone),
    email = NULLIF(TRIM(p_email), ''),
    data_nascimento = p_data_nascimento,
    cep = v_cep_formatado,
    logradouro = TRIM(p_logradouro),
    numero = TRIM(p_numero),
    complemento = NULLIF(TRIM(p_complemento), ''),
    bairro = TRIM(p_bairro),
    cidade = TRIM(p_cidade),
    estado = UPPER(TRIM(p_estado)),
    observacoes_medicas = NULLIF(TRIM(p_observacoes_medicas), '')
  WHERE id = p_id;

  SELECT ROW_COUNT() AS linhas_afetadas, 'Cliente atualizado com sucesso' AS mensagem;
END $$

-- 3. EXCLUIR CLIENTE
CREATE PROCEDURE sp_excluir_cliente(IN p_id INT)
BEGIN
  DELETE FROM clientes WHERE id = p_id;
  SELECT ROW_COUNT() AS linhas_afetadas, 'Cliente excluído com sucesso' AS mensagem;
END $$

-- 4. LISTAR CLIENTES (Com filtro dinâmico por Nome, CPF, Telefone ou CEP)
CREATE PROCEDURE sp_listar_clientes(IN p_filtro VARCHAR(100))
BEGIN
  IF p_filtro IS NULL OR TRIM(p_filtro) = '' THEN
    SELECT 
      id, nome, cpf, telefone, email, data_nascimento,
      cep, logradouro, numero, complemento, bairro, cidade, estado,
      observacoes_medicas, criado_em
    FROM clientes
    ORDER BY id DESC;
  ELSE
    SELECT 
      id, nome, cpf, telefone, email, data_nascimento,
      cep, logradouro, numero, complemento, bairro, cidade, estado,
      observacoes_medicas, criado_em
    FROM clientes
    WHERE nome LIKE CONCAT('%', p_filtro, '%')
       OR cpf LIKE CONCAT('%', p_filtro, '%')
       OR telefone LIKE CONCAT('%', p_filtro, '%')
       OR fn_limpar_cep(cep) LIKE CONCAT('%', fn_limpar_cep(p_filtro), '%')
       OR cidade LIKE CONCAT('%', p_filtro, '%')
    ORDER BY id DESC;
  END IF;
END $$

-- 5. BUSCAR CLIENTE POR ID
CREATE PROCEDURE sp_buscar_cliente_por_id(IN p_id INT)
BEGIN
  SELECT * FROM clientes WHERE id = p_id LIMIT 1;
END $$

-- 6. BUSCAR TODOS OS CLIENTES DE UM MESMO CEP
CREATE PROCEDURE sp_buscar_clientes_por_cep(IN p_cep VARCHAR(20))
BEGIN
  DECLARE v_cep_limpo VARCHAR(8);
  SET v_cep_limpo = fn_limpar_cep(p_cep);

  SELECT 
    id, nome, cpf, telefone, cep, logradouro, numero, bairro, cidade, estado
  FROM clientes
  WHERE fn_limpar_cep(cep) = v_cep_limpo
  ORDER BY nome ASC;
END $$

DELIMITER ;
