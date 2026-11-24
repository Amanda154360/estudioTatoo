-- =============================================================================
-- MÓDULO 01: CRIAÇÃO DO BANCO E TABELAS (DDL)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS estudio_tattoo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE estudio_tattoo;

-- Limpeza segura na ordem inversa de dependências
DROP TABLE IF EXISTS lembretes;
DROP TABLE IF EXISTS agendamentos;
DROP TABLE IF EXISTS servicos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS profissionais;
DROP TABLE IF EXISTS tabela_ceps;

-- 1. TABELA DE CEPS (Base de endereçamento nacional)
CREATE TABLE tabela_ceps (
  cep VARCHAR(9) NOT NULL PRIMARY KEY COMMENT 'CEP no formato 00000-000',
  logradouro VARCHAR(150) NOT NULL,
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  estado CHAR(2) NOT NULL,
  ibge VARCHAR(10) NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tabela_ceps_cidade_uf (cidade, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA DE PROFISSIONAIS (Tatuadores, Piercers, Esteticistas)
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

-- 3. TABELA DE CLIENTES (Dados de contato, endereço validado por CEP e Anamnese)
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
  observacoes_medicas TEXT NULL COMMENT 'Ficha de anamnese: alergias, queloides, diabetes, restrições',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clientes_cep (cep),
  INDEX idx_clientes_nome (nome),
  INDEX idx_clientes_telefone (telefone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABELA DE SERVIÇOS E PROCEDIMENTOS
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

-- 5. TABELA DE AGENDAMENTOS DO ESTÚDIO
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
