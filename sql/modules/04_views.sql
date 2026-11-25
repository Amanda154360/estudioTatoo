-- =============================================================================
-- MÓDULO 04: VIEWS PARA CONSULTAS CONSOLIDADAS
-- =============================================================================

USE estudio_tattoo;

DROP VIEW IF EXISTS vw_clientes_resumo;
DROP VIEW IF EXISTS vw_profissionais_resumo;

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
