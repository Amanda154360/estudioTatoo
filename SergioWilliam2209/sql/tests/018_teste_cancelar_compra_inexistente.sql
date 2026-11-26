-- Teste negativo: deve falhar com "Compra não encontrada."
-- Execute isoladamente no schema descartável. Confirme que o ID candidato não
-- existe antes do CALL; 2147483647 é o maior ID INT positivo.
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'ID_AUSENTE: pode executar o CALL'
    ELSE 'PARE: ID existe; escolha manualmente outro ID positivo ausente'
  END AS precondicao
FROM compras
WHERE id = 2147483647;

CALL sp_cancelar_compra(2147483647);
