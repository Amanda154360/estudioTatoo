-- RASCUNHO ADITIVO — pendente de aprovação coletiva.
-- Não executar até revisão do modelo, da versão MySQL e da integração do runner.
-- Não altera tabelas existentes nem remove dados.

USE estudio_tattoo;

CREATE TABLE materiais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  unidade_medida VARCHAR(30) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_materiais_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE compras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_compra DATE NOT NULL,
  moeda CHAR(3) NOT NULL,
  observacoes TEXT NULL,

  -- Snapshot opcional da cotação efetivamente associada à compra.
  -- A regra de preenchimento conjunto e o fuso horário serão definidos
  -- nas procedures após aprovação do domínio.
  cotacao_moeda_base CHAR(3) NULL,
  cotacao_moeda_destino CHAR(3) NULL,
  cotacao_valor DECIMAL(20,10) UNSIGNED NULL,
  cotacao_em DATETIME(3) NULL,
  cotacao_data_referencia DATE NULL,
  cotacao_fonte VARCHAR(120) NULL,

  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_compras_data (data_compra),
  INDEX idx_compras_moeda (moeda)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itens_compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  compra_id INT NOT NULL,
  material_id INT NOT NULL,
  quantidade DECIMAL(12,3) UNSIGNED NOT NULL,
  preco_unitario DECIMAL(15,4) UNSIGNED NOT NULL,

  -- Snapshots opcionais para preservar a descrição/unidade do momento
  -- da compra caso os dados atuais do catálogo mudem.
  nome_material_snapshot VARCHAR(120) NULL,
  unidade_snapshot VARCHAR(30) NULL,

  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_itens_compra_compra
    FOREIGN KEY (compra_id) REFERENCES compras(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_itens_compra_material
    FOREIGN KEY (material_id) REFERENCES materiais(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  INDEX idx_itens_compra_compra (compra_id),
  INDEX idx_itens_compra_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
