-- =============================================================================
-- MÓDULO 11: PROCEDURES DE LEMBRETES (GERAÇÃO, ENVIO E MANUTENÇÃO)
-- =============================================================================

USE estudio_tattoo;

DROP PROCEDURE IF EXISTS sp_gerar_lembretes_pendentes;
DROP PROCEDURE IF EXISTS sp_listar_lembretes;
DROP PROCEDURE IF EXISTS sp_buscar_lembrete_por_id;
DROP PROCEDURE IF EXISTS sp_lembretes_para_envio;
DROP PROCEDURE IF EXISTS sp_marcar_lembrete_enviado;
DROP PROCEDURE IF EXISTS sp_marcar_lembrete_falha;
DROP PROCEDURE IF EXISTS sp_reprocessar_lembrete;
DROP PROCEDURE IF EXISTS sp_cancelar_lembrete;
DROP PROCEDURE IF EXISTS sp_excluir_lembrete;
DROP PROCEDURE IF EXISTS sp_criar_lembrete_manual;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- 1. GERAR LEMBRETES PARA AGENDAMENTOS DAS PRÓXIMAS N HORAS
--    Não duplica: o UNIQUE(agendamento_id, canal) + LEFT JOIN garantem isso.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_gerar_lembretes_pendentes(IN p_janela_horas INT)
BEGIN
  -- Atendimento cancelado/concluído não deve continuar na fila de envio.
  UPDATE lembretes l
  JOIN agendamentos a ON a.id = l.agendamento_id
  SET l.status = 'Cancelado'
  WHERE l.status IN ('Pendente', 'Falhou')
    AND a.status IN ('Cancelado', 'Concluido');

  INSERT INTO lembretes (agendamento_id, canal, destinatario, enviar_em, status)
  SELECT
    a.id,
    'email',
    LOWER(TRIM(c.email)),
    DATE_SUB(a.data_hora, INTERVAL 1 DAY),
    'Pendente'
  FROM agendamentos a
  JOIN clientes c ON c.id = a.cliente_id
  LEFT JOIN lembretes l ON l.agendamento_id = a.id AND l.canal = 'email'
  WHERE a.status IN ('Agendado', 'Confirmado')
    AND c.email IS NOT NULL
    AND TRIM(c.email) <> ''
    AND a.data_hora >= NOW()
    AND a.data_hora <= DATE_ADD(NOW(), INTERVAL IFNULL(p_janela_horas, 48) HOUR)
    AND l.id IS NULL;

  SELECT ROW_COUNT() AS lembretes_criados;
END$$

-- -----------------------------------------------------------------------------
-- 2. LISTAR LEMBRETES (fila da tela)
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_listar_lembretes(
  IN p_status VARCHAR(20),
  IN p_limite INT
)
BEGIN
  DECLARE v_limite INT DEFAULT 50;

  SET v_limite = IFNULL(p_limite, 50);
  IF v_limite < 1 THEN
    SET v_limite = 50;
  END IF;
  IF v_limite > 500 THEN
    SET v_limite = 500;
  END IF;

  SELECT *
  FROM vw_lembretes_detalhados
  WHERE (p_status IS NULL OR TRIM(p_status) = '' OR status = p_status)
  ORDER BY enviar_em ASC
  LIMIT v_limite;
END$$

-- -----------------------------------------------------------------------------
-- 3. BUSCAR LEMBRETE POR ID
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_buscar_lembrete_por_id(IN p_id INT)
BEGIN
  SELECT *
  FROM vw_lembretes_detalhados
  WHERE id = p_id
  LIMIT 1;
END$$

-- -----------------------------------------------------------------------------
-- 4. LEMBRETES PRONTOS PARA ENVIO
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_lembretes_para_envio(IN p_limite INT)
BEGIN
  DECLARE v_limite INT DEFAULT 10;

  SET v_limite = IFNULL(p_limite, 10);
  IF v_limite < 1 THEN
    SET v_limite = 10;
  END IF;
  IF v_limite > 50 THEN
    SET v_limite = 50;
  END IF;

  SELECT *
  FROM vw_lembretes_detalhados
  WHERE status = 'Pendente'
    AND enviar_em <= NOW()
    AND status_agendamento IN ('Agendado', 'Confirmado')
  ORDER BY enviar_em ASC
  LIMIT v_limite;
END$$

-- -----------------------------------------------------------------------------
-- 5. MARCAR COMO ENVIADO
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_marcar_lembrete_enviado(IN p_id INT)
BEGIN
  UPDATE lembretes
  SET status = 'Enviado',
      enviado_em = NOW(),
      tentativas = tentativas + 1,
      erro = NULL
  WHERE id = p_id
    AND status IN ('Pendente', 'Falhou');

  SELECT ROW_COUNT() AS linhas_afetadas;
END$$

-- -----------------------------------------------------------------------------
-- 6. MARCAR FALHA (3 tentativas antes de desistir)
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_marcar_lembrete_falha(
  IN p_id INT,
  IN p_erro VARCHAR(1000)
)
BEGIN
  UPDATE lembretes
  SET status = IF(tentativas + 1 >= 3, 'Falhou', 'Pendente'),
      tentativas = tentativas + 1,
      erro = LEFT(IFNULL(p_erro, 'Falha desconhecida no envio.'), 1000)
  WHERE id = p_id
    AND status = 'Pendente';

  SELECT ROW_COUNT() AS linhas_afetadas;
END$$

-- -----------------------------------------------------------------------------
-- 7. REPROCESSAR (volta para a fila)
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_reprocessar_lembrete(IN p_id INT)
BEGIN
  UPDATE lembretes
  SET status = 'Pendente',
      tentativas = 0,
      erro = NULL,
      enviado_em = NULL
  WHERE id = p_id
    AND status IN ('Falhou', 'Cancelado');

  SELECT ROW_COUNT() AS linhas_afetadas;
END$$

-- -----------------------------------------------------------------------------
-- 8. CANCELAR
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_cancelar_lembrete(IN p_id INT)
BEGIN
  UPDATE lembretes
  SET status = 'Cancelado'
  WHERE id = p_id
    AND status IN ('Pendente', 'Falhou');

  SELECT ROW_COUNT() AS linhas_afetadas;
END$$

-- -----------------------------------------------------------------------------
-- 9. EXCLUIR
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_excluir_lembrete(IN p_id INT)
BEGIN
  DELETE FROM lembretes WHERE id = p_id;
  SELECT ROW_COUNT() AS linhas_afetadas;
END$$

-- -----------------------------------------------------------------------------
-- 10. CRIAR LEMBRETE MANUAL PARA UM AGENDAMENTO
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_criar_lembrete_manual(IN p_agendamento_id INT)
BEGIN
  DECLARE v_email VARCHAR(100) DEFAULT NULL;
  DECLARE v_data_hora DATETIME DEFAULT NULL;
  DECLARE v_status_agendamento VARCHAR(20) DEFAULT NULL;

  SELECT LOWER(TRIM(c.email)), a.data_hora, a.status
    INTO v_email, v_data_hora, v_status_agendamento
  FROM agendamentos a
  JOIN clientes c ON c.id = a.cliente_id
  WHERE a.id = p_agendamento_id;

  IF v_data_hora IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Agendamento não encontrado.';
  END IF;

  IF v_status_agendamento NOT IN ('Agendado', 'Confirmado') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Agendamento não está ativo.';
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O cliente não possui e-mail cadastrado.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM lembretes
    WHERE agendamento_id = p_agendamento_id AND canal = 'email'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Já existe lembrete para este agendamento.';
  END IF;

  INSERT INTO lembretes (agendamento_id, canal, destinatario, enviar_em, status)
  VALUES (
    p_agendamento_id,
    'email',
    v_email,
    DATE_SUB(v_data_hora, INTERVAL 1 DAY),
    'Pendente'
  );

  SELECT LAST_INSERT_ID() AS id;
END$$

DELIMITER ;
