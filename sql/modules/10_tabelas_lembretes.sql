-- =============================================================================
-- MÓDULO 10: TABELA E VIEW DE LEMBRETES DE ATENDIMENTO
-- =============================================================================

USE estudio_tattoo;

DROP VIEW IF EXISTS vw_lembretes_detalhados;
DROP TABLE IF EXISTS lembretes;

-- Um lembrete por agendamento e canal. enviar_em = 1 dia antes do atendimento.
CREATE TABLE lembretes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agendamento_id INT NOT NULL,
  canal ENUM('email') NOT NULL DEFAULT 'email',
  destinatario VARCHAR(100) NOT NULL,
  enviar_em DATETIME NOT NULL,
  status ENUM('Pendente', 'Enviado', 'Falhou', 'Cancelado') NOT NULL DEFAULT 'Pendente',
  tentativas TINYINT UNSIGNED NOT NULL DEFAULT 0,
  enviado_em DATETIME NULL,
  erro VARCHAR(1000) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lembrete_agendamento
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
  CONSTRAINT uq_lembrete_agendamento_canal UNIQUE (agendamento_id, canal),
  INDEX idx_lembretes_status_envio (status, enviar_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Visão usada pelas telas e pelo job de envio.
CREATE VIEW vw_lembretes_detalhados AS
SELECT
  l.id,
  l.agendamento_id,
  l.canal,
  l.destinatario,
  l.enviar_em,
  l.status,
  l.tentativas,
  l.enviado_em,
  l.erro,
  a.data_hora AS data_atendimento,
  a.status AS status_agendamento,
  c.nome AS cliente_nome,
  s.nome AS servico_nome,
  p.nome AS profissional_nome
FROM lembretes l
JOIN agendamentos a ON a.id = l.agendamento_id
JOIN clientes c ON c.id = a.cliente_id
LEFT JOIN servicos s ON s.id = a.servico_id
JOIN profissionais p ON p.id = a.profissional_id;
