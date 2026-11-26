-- Teste negativo: deve falhar com "Identificador de compra inválido."
-- Execute isoladamente no schema descartável.
CALL sp_cancelar_compra(0);
