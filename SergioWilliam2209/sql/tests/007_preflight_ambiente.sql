-- Somente leitura. Execute isoladamente e confira o resultado antes de qualquer
-- migração/teste. O alvo permitido precisa ter nome dad_test_* e não pode ser
-- o schema compartilhado cl205349.
SELECT
  DATABASE() AS schema_selecionado,
  VERSION() AS versao_mysql,
  @@hostname AS servidor,
  @@port AS porta,
  @@server_uuid AS identificador_instancia,
  CASE
    WHEN DATABASE() REGEXP '^dad_test_[A-Za-z0-9_]+$'
      AND DATABASE() <> 'cl205349'
      AND VERSION() LIKE '8.0.32%'
    THEN 'OK: schema/versão; ainda confirme servidor/porta/instância isolados'
    ELSE 'PARE: schema/versão não autorizados para estes testes'
  END AS verificacao_schema_versao;
