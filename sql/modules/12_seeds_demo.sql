-- =============================================================================
-- MÓDULO 12: DADOS DE DEMONSTRAÇÃO PARA O LEMBRETE DE 24H
-- =============================================================================

USE estudio_tattoo;

-- Atendimento a ~20 horas: o lembrete já deve ser gerado e enviado no próximo ciclo.
INSERT INTO agendamentos (cliente_id, profissional_id, servico_id, data_hora, valor, status, observacoes)
SELECT
  c.id,
  p.id,
  s.id,
  DATE_ADD(NOW(), INTERVAL 20 HOUR),
  s.preco_base,
  'Confirmado',
  'DEMO: atendimento próximo (lembrete 24h)'
FROM clientes c
JOIN profissionais p ON p.nome LIKE 'Lucas%'
JOIN servicos s ON s.nome = 'Tatuagem Fineline Autoral'
WHERE c.cpf = '123.456.789-01'
  AND NOT EXISTS (
    SELECT 1 FROM agendamentos a
    WHERE a.observacoes = 'DEMO: atendimento próximo (lembrete 24h)'
  )
LIMIT 1;

-- Atendimento a 3 dias: ainda não entra na janela do lembrete.
INSERT INTO agendamentos (cliente_id, profissional_id, servico_id, data_hora, valor, status, observacoes)
SELECT
  c.id,
  p.id,
  s.id,
  DATE_ADD(NOW(), INTERVAL 3 DAY),
  s.preco_base,
  'Agendado',
  'DEMO: atendimento futuro (fora da janela de 24h)'
FROM clientes c
JOIN profissionais p ON p.nome LIKE 'Beatriz%'
JOIN servicos s ON s.nome = 'Aplicação Piercing Titânio'
WHERE c.cpf = '234.567.890-12'
  AND NOT EXISTS (
    SELECT 1 FROM agendamentos a
    WHERE a.observacoes = 'DEMO: atendimento futuro (fora da janela de 24h)'
  )
LIMIT 1;
