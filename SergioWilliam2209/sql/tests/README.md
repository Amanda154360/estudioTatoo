# Testes SQL isolados — materiais e compras

Estes scripts são material de validação manual, **não foram executados**. Não
substituem os testes simulados/automatizados e precisam ser validados em um
MySQL descartável compatível antes de qualquer integração.

## Pré-condições obrigatórias

1. Use uma instância MySQL **isolada e descartável**, provisionada fora destes
   scripts, com schema cujo nome comece `dad_test_`. Não use `cl205349`,
   `cl205125` ou servidor escolar/compartilhado.
2. Confirme com o responsável pelo ambiente que servidor, porta e UUID
   correspondem à instância descartável. O nome do schema não comprova
   isolamento.
3. Execute `007_preflight_ambiente.sql` sozinho e confira schema, versão,
   hostname, porta e UUID. O conjunto foi escrito tendo MySQL 8.0.32 como
   referência. Pare se a versão/endereço não corresponder ao ambiente aprovado.
4. Confirme que o schema descartável está vazio. Os scripts não criam/selecionam
   schema, não carregam `.env` e não conectam a servidor.
5. Aplique apenas `SergioWilliam2209/sql/006_migracao_individual_materiais_compras.sql`
   nesse schema vazio. Não use `npm run db:init`, `sql/executar_todos.sql` nem
   inicializador coletivo.

## Ordem de testes no schema descartável

1. `008_testes_sucesso.sql`: criação/consulta/atualização, itens e snapshots;
   todos os indicadores devem ser `PASS`.
2. Execute **separadamente**, validando o erro esperado em cada chamada:
   `009_teste_rollback_criacao.sql`, `010_teste_rollback_atualizacao.sql`,
   `011_teste_fk_material.sql` e `012_teste_fk_compra.sql`.
3. `013_verificar_falhas_esperadas.sql`: confirme os indicadores de rollback e
   ausência de órfãos.
4. Execute `014_teste_exclusao_logica_material.sql` por último entre os testes
   anteriores.
5. Execute `015_teste_cancelamento_compra.sql`. Ele cria seu próprio material e
   compra com marcadores únicos e verifica default `ATIVA`, cancelamento,
   repetição, timestamp e contagem dos itens.
6. Na **mesma conexão/sessão SQL** de 015, execute isoladamente
   `016_teste_bloqueio_edicao_cancelada.sql`. O `CALL` deve falhar com
   `Compra cancelada não pode ser alterada.` Se não falhar, pare.
7. Ainda na mesma sessão, execute `017_verificar_preservacao_compra_cancelada.sql`.
   O indicador precisa ser `PASS`; ele compara snapshot e contagem reais dos
   itens salvos por 015, sem presumir cardinalidade fixa.
8. Execute isoladamente `018_teste_cancelar_compra_inexistente.sql`. Confira
   primeiro que o resultado mostra `ID_AUSENTE`; o `CALL` deve falhar com
   `Compra não encontrada.` Se o ID existir, não execute o `CALL`: selecione
   manualmente um ID positivo ausente no schema descartável.
9. Execute isoladamente `019_teste_cancelar_compra_id_invalido.sql`. O `CALL`
   deve falhar com `Identificador de compra inválido.`.
10. Ao terminar, descarte o schema por procedimento administrativo separado.
    Não reaproveite os dados/scripts de teste.

Os testes negativos fazem operações inválidas intencionalmente. Não agrupe
chamadas que devem falhar num lote que pare na primeira exceção. Se o erro
esperado não ocorrer ou algum indicador for `FAIL`, pare e preserve o ambiente
para análise. Nunca copie estes testes para o inicializador coletivo.
