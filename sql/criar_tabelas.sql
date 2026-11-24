-- =============================================================================
-- BANCO DE DADOS: ESTÚDIO DE TATUAGEM, PIERCING E ESTÉTICA
-- SISTEMA INTEGRADO DE CADASTRO, PROFISSIONAIS E BUSCA DE CEP
-- =============================================================================

-- Criação do banco caso não exista e seleção
CREATE DATABASE IF NOT EXISTS estudio_tattoo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE estudio_tattoo;

-- =============================================================================
-- 1. LIMPEZA SEGURA DE ESTRUTURAS ANTERIORES
-- =============================================================================
DROP VIEW IF EXISTS vw_clientes_resumo;
DROP VIEW IF EXISTS vw_profissionais_resumo;
DROP VIEW IF EXISTS vw_agendamentos_detalhados;

DROP PROCEDURE IF EXISTS sp_buscar_cep;
DROP PROCEDURE IF EXISTS sp_salvar_cep;
DROP PROCEDURE IF EXISTS sp_cadastrar_cliente;
DROP PROCEDURE IF EXISTS sp_atualizar_cliente;
DROP PROCEDURE IF EXISTS sp_excluir_cliente;
DROP PROCEDURE IF EXISTS sp_listar_clientes;
DROP PROCEDURE IF EXISTS sp_buscar_cliente_por_id;
DROP PROCEDURE IF EXISTS sp_buscar_clientes_por_cep;
DROP PROCEDURE IF EXISTS sp_cadastrar_profissional;
DROP PROCEDURE IF EXISTS sp_atualizar_profissional;
DROP PROCEDURE IF EXISTS sp_excluir_profissional;
DROP PROCEDURE IF EXISTS sp_listar_profissionais;
DROP PROCEDURE IF EXISTS sp_buscar_profissional_por_id;

DROP FUNCTION IF EXISTS fn_limpar_cep;
DROP FUNCTION IF EXISTS fn_formatar_cep;

DROP TABLE IF EXISTS agendamentos;
DROP TABLE IF EXISTS servicos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS profissionais;
DROP TABLE IF EXISTS tabela_ceps;

-- =============================================================================
-- 2. TABELAS DO SISTEMA
-- =============================================================================

-- 2.1 TABELA DE CEPS (Base de dados de endereços para busca instantânea em SQL)
CREATE TABLE tabela_ceps (
  cep VARCHAR(9) NOT NULL PRIMARY KEY COMMENT 'CEP formatado 00000-000',
  logradouro VARCHAR(150) NOT NULL,
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  estado CHAR(2) NOT NULL,
  ibge VARCHAR(10) NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tabela_ceps_cidade_uf (cidade, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 TABELA DE PROFISSIONAIS (Tatuadores, Piercers e Esteticistas)
CREATE TABLE profissionais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  cpf VARCHAR(14) NULL UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NULL,
  especialidade ENUM('Tatuador', 'Body Piercer', 'Esteticista', 'Micropigmentador', 'Outro') NOT NULL DEFAULT 'Tatuador',
  comissao_percentual DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  observacoes TEXT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_profissionais_especialidade (especialidade),
  INDEX idx_profissionais_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3 TABELA DE CLIENTES (Cadastro com busca de CEP e anamnese de saúde)
CREATE TABLE clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  cpf VARCHAR(14) NULL UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NULL,
  data_nascimento DATE NULL,
  cep VARCHAR(9) NOT NULL,
  logradouro VARCHAR(150) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(100) NULL,
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  estado CHAR(2) NOT NULL,
  observacoes_medicas TEXT NULL COMMENT 'Alergias, queloides, diabetes, uso de medicamentos',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clientes_cep (cep),
  INDEX idx_clientes_nome (nome),
  INDEX idx_clientes_telefone (telefone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4 TABELA DE PROCEDIMENTOS / SERVIÇOS DO ESTÚDIO
CREATE TABLE servicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  categoria ENUM('Tatuagem', 'Piercing', 'Estética') NOT NULL,
  preco_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duracao_minutos INT NOT NULL DEFAULT 60,
  descricao TEXT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_servicos_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.5 TABELA DE AGENDAMENTOS
CREATE TABLE agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  profissional_id INT NOT NULL,
  servico_id INT NULL,
  data_hora DATETIME NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  status ENUM('Agendado', 'Confirmado', 'Concluido', 'Cancelado') NOT NULL DEFAULT 'Agendado',
  observacoes TEXT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agendamento_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_agendamento_profissional FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE RESTRICT,
  CONSTRAINT fk_agendamento_servico FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL,
  INDEX idx_agendamentos_data (data_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. FUNÇÕES DETERMINÍSTICAS (UDFs) EM SQL
-- =============================================================================

DELIMITER $$

-- Remove pontuações do CEP deixando apenas os 8 dígitos numéricos
CREATE FUNCTION fn_limpar_cep(p_cep VARCHAR(20)) 
RETURNS VARCHAR(8)
DETERMINISTIC
BEGIN
  DECLARE v_limpo VARCHAR(20);
  SET v_limpo = REPLACE(REPLACE(REPLACE(REPLACE(p_cep, '-', ''), '.', ''), ' ', ''), '/', '');
  RETURN LEFT(v_limpo, 8);
END $$

-- Formata qualquer entrada de 8 dígitos para a máscara padrão XXXXX-XXX
CREATE FUNCTION fn_formatar_cep(p_cep VARCHAR(20)) 
RETURNS VARCHAR(9)
DETERMINISTIC
BEGIN
  DECLARE v_digitos VARCHAR(8);
  SET v_digitos = fn_limpar_cep(p_cep);
  IF LENGTH(v_digitos) = 8 THEN
    RETURN CONCAT(SUBSTRING(v_digitos, 1, 5), '-', SUBSTRING(v_digitos, 6, 3));
  ELSE
    RETURN TRIM(p_cep);
  END IF;
END $$

DELIMITER ;

-- =============================================================================
-- 4. TRIGGERS PARA INTEGRIDADE E PADRONIZAÇÃO AUTOMÁTICA
-- =============================================================================

DELIMITER $$

CREATE TRIGGER trg_clientes_before_insert
BEFORE INSERT ON clientes
FOR EACH ROW
BEGIN
  SET NEW.cep = fn_formatar_cep(NEW.cep);
  SET NEW.estado = UPPER(TRIM(NEW.estado));
  SET NEW.nome = TRIM(NEW.nome);
END $$

CREATE TRIGGER trg_clientes_before_update
BEFORE UPDATE ON clientes
FOR EACH ROW
BEGIN
  SET NEW.cep = fn_formatar_cep(NEW.cep);
  SET NEW.estado = UPPER(TRIM(NEW.estado));
  SET NEW.nome = TRIM(NEW.nome);
END $$

CREATE TRIGGER trg_profissionais_before_insert
BEFORE INSERT ON profissionais
FOR EACH ROW
BEGIN
  SET NEW.nome = TRIM(NEW.nome);
END $$

CREATE TRIGGER trg_profissionais_before_update
BEFORE UPDATE ON profissionais
FOR EACH ROW
BEGIN
  SET NEW.nome = TRIM(NEW.nome);
END $$

DELIMITER ;

-- =============================================================================
-- 5. PROCEDIMENTOS ARMAZENADOS (STORED PROCEDURES) - FUNCIONAMENTO NO SQL
-- =============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- 5.1 BUSCAR CEP DIRETAMENTE NO SQL
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_buscar_cep(IN p_cep VARCHAR(20))
BEGIN
  DECLARE v_cep_formatado VARCHAR(9);
  DECLARE v_cep_limpo VARCHAR(8);

  SET v_cep_formatado = fn_formatar_cep(p_cep);
  SET v_cep_limpo = fn_limpar_cep(p_cep);

  SELECT 
    cep,
    logradouro,
    bairro,
    cidade,
    estado,
    ibge,
    1 AS encontrado
  FROM tabela_ceps
  WHERE cep = v_cep_formatado 
     OR fn_limpar_cep(cep) = v_cep_limpo
  LIMIT 1;
END $$

-- -----------------------------------------------------------------------------
-- 5.2 SALVAR OU ATUALIZAR UM CEP NA BASE SQL
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_salvar_cep(
  IN p_cep VARCHAR(20),
  IN p_logradouro VARCHAR(150),
  IN p_bairro VARCHAR(100),
  IN p_cidade VARCHAR(100),
  IN p_estado CHAR(2)
)
BEGIN
  DECLARE v_cep_formatado VARCHAR(9);
  SET v_cep_formatado = fn_formatar_cep(p_cep);

  IF LENGTH(fn_limpar_cep(v_cep_formatado)) = 8 THEN
    INSERT INTO tabela_ceps (cep, logradouro, bairro, cidade, estado)
    VALUES (v_cep_formatado, TRIM(p_logradouro), TRIM(p_bairro), TRIM(p_cidade), UPPER(TRIM(p_estado)))
    ON DUPLICATE KEY UPDATE
      logradouro = VALUES(logradouro),
      bairro = VALUES(bairro),
      cidade = VALUES(cidade),
      estado = VALUES(estado);
  END IF;
END $$

-- -----------------------------------------------------------------------------
-- 5.3 CADASTRAR CLIENTE (Com registro automático do CEP e validação)
-- -----------------------------------------------------------------------------
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

  -- Salva o CEP informado no catálogo de CEPs para reaproveitamento
  IF p_logradouro IS NOT NULL AND TRIM(p_logradouro) <> '' THEN
    CALL sp_salvar_cep(v_cep_formatado, p_logradouro, p_bairro, p_cidade, p_estado);
  END IF;

  -- Insere o novo cliente
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

-- -----------------------------------------------------------------------------
-- 5.4 ATUALIZAR CLIENTE
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5.5 EXCLUIR CLIENTE
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_excluir_cliente(IN p_id INT)
BEGIN
  DELETE FROM clientes WHERE id = p_id;
  SELECT ROW_COUNT() AS linhas_afetadas, 'Cliente excluído com sucesso' AS mensagem;
END $$

-- -----------------------------------------------------------------------------
-- 5.6 LISTAR CLIENTES (Geral ou com filtro por Nome, CPF, Telefone ou CEP)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5.7 BUSCAR CLIENTE POR ID
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_buscar_cliente_por_id(IN p_id INT)
BEGIN
  SELECT * FROM clientes WHERE id = p_id LIMIT 1;
END $$

-- -----------------------------------------------------------------------------
-- 5.8 BUSCAR TODOS OS CLIENTES DE UM DETERMINADO CEP
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5.9 CADASTRAR PROFISSIONAL
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5.10 ATUALIZAR PROFISSIONAL
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5.11 EXCLUIR PROFISSIONAL
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_excluir_profissional(IN p_id INT)
BEGIN
  -- Verifica se o profissional possui agendamentos vinculados
  IF EXISTS (SELECT 1 FROM agendamentos WHERE profissional_id = p_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Não é possível excluir o profissional pois existem agendamentos vinculados a ele.';
  ELSE
    DELETE FROM profissionais WHERE id = p_id;
    SELECT ROW_COUNT() AS linhas_afetadas, 'Profissional excluído com sucesso' AS mensagem;
  END IF;
END $$

-- -----------------------------------------------------------------------------
-- 5.12 LISTAR PROFISSIONAIS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5.13 BUSCAR PROFISSIONAL POR ID
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_buscar_profissional_por_id(IN p_id INT)
BEGIN
  SELECT * FROM profissionais WHERE id = p_id LIMIT 1;
END $$

DELIMITER ;

-- =============================================================================
-- 6. VIEWS PARA CONSULTAS CONSOLIDADAS
-- =============================================================================

CREATE VIEW vw_clientes_resumo AS
SELECT 
  c.id,
  c.nome,
  c.cpf,
  c.telefone,
  c.email,
  c.cep,
  CONCAT(c.logradouro, ', ', c.numero, IF(c.complemento IS NOT NULL AND c.complemento <> '', CONCAT(' - ', c.complemento), '')) AS endereco_completo,
  c.bairro,
  CONCAT(c.cidade, '/', c.estado) AS cidade_uf,
  c.observacoes_medicas,
  c.criado_em
FROM clientes c;

CREATE VIEW vw_profissionais_resumo AS
SELECT 
  p.id,
  p.nome,
  p.telefone,
  p.email,
  p.especialidade,
  CONCAT(p.comissao_percentual, '%') AS comissao,
  CASE WHEN p.ativo = 1 THEN 'Ativo' ELSE 'Inativo' END AS status_texto,
  p.ativo
FROM profissionais p;

-- =============================================================================
-- 7. CARGA DE DADOS INICIAIS (SEEDS REALISTAS PARA TESTE IMEDIATO)
-- =============================================================================

-- 7.1 Catálogo Inicial de CEPs (Capitais e grandes regiões do Brasil)
INSERT INTO tabela_ceps (cep, logradouro, bairro, cidade, estado) VALUES
  ('01001-000', 'Praça da Sé', 'Sé', 'São Paulo', 'SP'),
  ('01310-100', 'Avenida Paulista', 'Bela Vista', 'São Paulo', 'SP'),
  ('04543-011', 'Avenida Brigadeiro Faria Lima', 'Itaim Bibi', 'São Paulo', 'SP'),
  ('20040-002', 'Rua Primeiro de Março', 'Centro', 'Rio de Janeiro', 'RJ'),
  ('22070-011', 'Avenida Nossa Senhora de Copacabana', 'Copacabana', 'Rio de Janeiro', 'RJ'),
  ('30130-100', 'Avenida Afonso Pena', 'Centro', 'Belo Horizonte', 'MG'),
  ('80010-000', 'Rua XV de Novembro', 'Centro', 'Curitiba', 'PR'),
  ('90010-150', 'Rua dos Andradas', 'Centro Histórico', 'Porto Alegre', 'RS'),
  ('70040-010', 'Esplanada dos Ministérios', 'Zona Cívico-Administrativa', 'Brasília', 'DF'),
  ('40020-000', 'Rua Chile', 'Centro', 'Salvador', 'BA'),
  ('60060-000', 'Rua Guilherme Rocha', 'Centro', 'Fortaleza', 'CE'),
  ('50030-000', 'Avenida Rio Branco', 'Bairro do Recife', 'Recife', 'PE'),
  ('88010-400', 'Rua Felipe Schmidt', 'Centro', 'Florianópolis', 'SC'),
  ('29010-000', 'Avenida Princesa Isabel', 'Centro', 'Vitória', 'ES'),
  ('74003-010', 'Avenida Goiás', 'Setor Central', 'Goiânia', 'GO');

-- 7.2 Profissionais Especialistas do Estúdio
INSERT INTO profissionais (nome, cpf, telefone, email, especialidade, comissao_percentual, ativo, observacoes) VALUES
  ('Lucas "Shadow" Silveira', '111.222.333-44', '(11) 98765-4321', 'lucas.shadow@estudiotattoo.com', 'Tatuador', 50.00, 1, 'Especialista em Blackwork, Realismo e Fechamento de Braço.'),
  ('Beatriz "Bee" Martins', '222.333.444-55', '(11) 97654-3210', 'beatriz.bee@estudiotattoo.com', 'Tatuador', 50.00, 1, 'Especialista em Fineline delicado, Floral e Aquarela.'),
  ('Rafael "Titan" Alencar', '333.444.555-66', '(11) 96543-2109', 'rafael.titan@estudiotattoo.com', 'Body Piercer', 45.00, 1, 'Perfurações corporais avançadas, microdermal e joalheria em titânio F136.'),
  ('Camila Ferreira Rocha', '444.555.666-77', '(11) 95432-1098', 'camila.estetica@estudiotattoo.com', 'Esteticista', 40.00, 1, 'Procedimentos faciais, micropigmentação labial/sobrancelha e laser.');

-- 7.3 Clientes Iniciais
INSERT INTO clientes (
  nome, cpf, telefone, email, data_nascimento,
  cep, logradouro, numero, complemento, bairro, cidade, estado, observacoes_medicas
) VALUES
  ('Mariana Duarte Costa', '123.456.789-01', '(11) 99123-4567', 'mariana.costa@email.com', '1998-05-14',
   '01310-100', 'Avenida Paulista', '1578', 'Apto 42', 'Bela Vista', 'São Paulo', 'SP', 'Sem histórico de alergias a pigmentos. Cicatrização normal.'),
  ('Gabriel Souza Mendes', '234.567.890-12', '(11) 98234-5678', 'gabriel.mendes@email.com', '1994-11-20',
   '04543-011', 'Avenida Brigadeiro Faria Lima', '2230', 'Conjunto 81', 'Itaim Bibi', 'São Paulo', 'SP', 'Possui histórico leve de dermatite de contato com látex (usar luva nitrílica).'),
  ('Larissa Vieira Lima', '345.678.901-23', '(21) 97345-6789', 'larissa.lima@email.com', '2001-03-08',
   '22070-011', 'Avenida Nossa Senhora de Copacabana', '500', 'Bloco B', 'Copacabana', 'Rio de Janeiro', 'RJ', 'Tendência a queloide em cartilagem auricular.');

-- 7.4 Tabela de Serviços e Procedimentos
INSERT INTO servicos (nome, categoria, preco_base, duracao_minutos, descricao) VALUES
  ('Tatuagem Fineline Autoral', 'Tatuagem', 450.00, 120, 'Tatuagem de traço fino personalizada até 10cm com pigmento vegetal.'),
  ('Fechamento Blackwork (Sessão)', 'Tatuagem', 1200.00, 360, 'Sessão integral de 6 horas para projetos de grande porte.'),
  ('Aplicação Piercing Titânio', 'Piercing', 150.00, 30, 'Perfuração asséptica com joia em titânio grau implante (rosca interna).'),
  ('Microdermal Completo', 'Piercing', 220.00, 45, 'Implante microdermal com topo de zircônia ou opala.'),
  ('Micropigmentação Labial', 'Estética', 650.00, 120, 'Revitalização e pigmentação dos lábios com efeito natural.'),
  ('Limpeza de Pele Profunda', 'Estética', 180.00, 90, 'Higienização facial profunda pós ou pré procedimentos cosméticos.');
