-- =============================================================================
-- MÓDULO 03: TRIGGERS PARA INTEGRIDADE E PADRONIZAÇÃO AUTOMÁTICA
-- =============================================================================

USE estudio_tattoo;

DROP TRIGGER IF EXISTS trg_clientes_before_insert;
DROP TRIGGER IF EXISTS trg_clientes_before_update;
DROP TRIGGER IF EXISTS trg_profissionais_before_insert;
DROP TRIGGER IF EXISTS trg_profissionais_before_update;

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
