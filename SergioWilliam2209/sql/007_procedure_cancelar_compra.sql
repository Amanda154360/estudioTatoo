-- Cancelamento lógico e idempotente. Não remove compra nem itens.
-- Aplicar somente em schema individual devidamente autorizado.

DELIMITER $$

CREATE PROCEDURE sp_cancelar_compra(IN p_id INT)
BEGIN
  DECLARE v_encontrado TINYINT DEFAULT 1;
  DECLARE v_status VARCHAR(10);

  DECLARE CONTINUE HANDLER FOR NOT FOUND
    SET v_encontrado = 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_id IS NULL OR p_id <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Identificador de compra inválido.';
  END IF;

  START TRANSACTION;

  SELECT c.status
    INTO v_status
  FROM compras AS c
  WHERE c.id = p_id
  FOR UPDATE;

  IF v_encontrado = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Compra não encontrada.';
  END IF;

  IF v_status = 'ATIVA' THEN
    UPDATE compras
    SET status = 'CANCELADA',
        cancelada_em = CURRENT_TIMESTAMP(3)
    WHERE id = p_id
      AND status = 'ATIVA';
  END IF;
  -- Se já estiver CANCELADA, não atualiza a linha nem altera cancelada_em.

  COMMIT;

  SELECT c.id, c.status, c.cancelada_em
  FROM compras AS c
  WHERE c.id = p_id;
END$$

DELIMITER ;
