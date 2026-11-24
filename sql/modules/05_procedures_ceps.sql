-- =============================================================================
-- MÓDULO 05: PROCEDURES DE CONSULTA E PERSISTÊNCIA DE CEP
-- =============================================================================

USE estudio_tattoo;

DROP PROCEDURE IF EXISTS sp_buscar_cep;
DROP PROCEDURE IF EXISTS sp_salvar_cep;

DELIMITER $$

-- 1. CONSULTA DE CEP DIRETAMENTE NO BANCO SQL
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

-- 2. CADASTRO / ATUALIZAÇÃO DE NOVO CEP NO CATÁLOGO SQL
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

DELIMITER ;
