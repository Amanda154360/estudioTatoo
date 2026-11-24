-- =============================================================================
-- MÓDULO 02: FUNÇÕES DETERMINÍSTICAS (UDFs)
-- =============================================================================

USE estudio_tattoo;

DROP FUNCTION IF EXISTS fn_limpar_cep;
DROP FUNCTION IF EXISTS fn_formatar_cep;

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
