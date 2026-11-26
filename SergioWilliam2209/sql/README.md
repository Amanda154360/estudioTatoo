# Migração individual SQL de materiais e compras

`006_migracao_individual_materiais_compras.sql` é o ponto de entrada de uma instalação nova e aplica os scripts individuais de materiais e compras, incluindo `007_procedure_cancelar_compra.sql`. Não foi executado nesta atividade.

O pacote de instalação nova cria exclusivamente `materiais`, `compras` e `itens_compra`, além das procedures individuais. `compras.status` inicia como `ATIVA` e `cancelada_em` como `NULL`. A migração incremental para schema que já possui a versão anterior está documentada abaixo.

A autorização coletiva comunicada para esta atividade cobre a criação das três tabelas, não a aprovação de todas as regras de negócio codificadas nas procedures. As condições já presentes nos scripts (por exemplo, material ativo, limites de itens, validação de quantidades e compatibilidade de moeda) foram preservadas como regras provisórias; valide-as com o grupo antes de aplicar a migração.

## Uso controlado

1. Em um ambiente isolado, confirme que o schema de destino está selecionado e faça preflight conforme `sql/tests/README.md`.
2. Faça a aplicação uma única vez pelo cliente `mysql`, a partir da raiz do repositório, após selecionar o schema autorizado. Exemplo de forma (não executado): `mysql NOME_SCHEMA_AUTORIZADO < SergioWilliam2209/sql/006_migracao_individual_materiais_compras.sql`.
3. Não use `sql/executar_todos.sql`, `sql/init-db.js` ou outro inicializador coletivo para esta migração. O wrapper usa o comando `SOURCE` do cliente CLI e não é compatível com `mysql2.query()` sem um runner de migrações próprio.
4. A instalação não é reexecutável: DDL MySQL pode confirmar operações implicitamente; se houver falha parcial, pare e inspecione o estado antes de qualquer continuação. Não reaplique o pacote cegamente.

O esquema coletivo não foi acessado nesta atividade. O SQL versionado em `origin/main` documenta `InnoDB`, `utf8mb4` e `utf8mb4_unicode_ci`, mas não substitui o preflight do schema de destino. Nenhum servidor MySQL isolado estava disponível nesta máquina; a execução real e a compatibilidade com a versão do servidor permanecem pendentes.

## Modelo

- `compras` 1:N `itens_compra`.
- `materiais` 1:N `itens_compra`; a relação compra–material é N:N via itens.
- As FKs dos itens usam `ON DELETE RESTRICT` e `ON UPDATE RESTRICT`, preservando referências. Compras são canceladas logicamente, nunca apagadas; o status é `CANCELADA` e o instante fica em `cancelada_em`.
- Repetir o cancelamento de uma compra cancelada retorna sucesso sem alterar `cancelada_em`. Os dados do cabeçalho e os itens permanecem disponíveis para consulta.
- A procedure de atualização rejeita compras canceladas; a aplicação também desabilita edição e inclusão nessa situação.
- Não há restrição única por par compra/material: a mesma matéria-prima pode aparecer em linhas distintas, por exemplo, com preços/unidades diferentes.
- Quantidades e preços unitários usam `DECIMAL`, sem ponto flutuante. `UNSIGNED` impede valores negativos; quantidade zero, escalas, arredondamento e moeda por item precisam de validação nas futuras procedures/serviços.
- Não é armazenado total redundante; sua regra de cálculo depende da aprovação do domínio.

## Cotação histórica

Os campos de cotação são opcionais no cabeçalho da compra para preservar taxa, par de moedas, fonte e datas sem criar uma tabela de cotações ou escolher uma API. Recomenda-se validar futuramente que os campos do snapshot estejam todos ausentes ou preenchidos em conjunto. O significado de `cotacao_em` e o fuso/UTC precisam ser definidos antes da persistência real.

## Compatibilidade TypeScript e pendências

- `MaterialDto.name`, `description` e `unit` correspondem a `nome`, `descricao` e `unidade_medida`. O SQL também tem `ativo`, que ainda não existe no DTO; não se alterou o contrato.
- `CreatePurchaseInput.date`, `currency` e `notes` correspondem a `data_compra`, `moeda` e `observacoes`.
- `PurchaseItemInput.quantity` e `unitPrice.amount` podem ser persistidos como `quantidade` e `preco_unitario` em texto decimal. Como `Money` inclui moeda por item, a implementação precisará validar que ela corresponde a `compras.moeda` ou o grupo deverá aprovar moeda por item.
- Os snapshots de item podem mapear para `description`/`unit`, mas esse significado requer validação.
- `PurchaseDto` ainda não possui campos para os snapshots de cotação. O grupo deve aprovar a extensão dos contratos antes do repositório real.
- `PurchaseItemDto.id` é opcional no contrato, mas a coluna SQL é obrigatória após persistência.
- `supplierId` existe opcionalmente no contrato TypeScript, mas não há tabela de fornecedores nem FK neste rascunho. Decidir se será removido/deferido, armazenado como snapshot textual ou suportado por uma entidade própria.
- Campos e regras ainda a aprovar: unidade/categoria de material, compras sem itens, alterações após registro, exclusões físicas e eventual estoque. O status/cancelamento lógico descrito aqui foi implementado como regra desta etapa individual; aprovação da integração coletiva continua pendente.

## Integração e execução

O inicializador coletivo mantém uma lista fixa em `sql/init-db.js`; esta pasta individual não é aplicada automaticamente. A integração futura deve ser acordada com Amanda e incluir migração revisada no fluxo compartilhado. O inicializador atual reexecuta módulos e há scripts existentes com `DROP TABLE`; não o use como mecanismo de upgrade desta proposta.

Antes de qualquer aplicação, revisar versão do MySQL, compatibilidade de `DATETIME(3)` e precisão decimal, testar em banco descartável e planejar backup. Não executar este rascunho em banco compartilhado sem aprovação explícita.

## Upgrade de uma instalação anterior — cancelamento lógico

**Esta documentação não é autorização para executar.** Upgrade somente com
autorização explícita para o schema/servidor individual e janela de manutenção.
Não execute em `cl205349` nem em servidor compartilhado.

1. Faça backup consistente e **confirme que ele pode ser restaurado**. Guarde
   também as definições atuais das procedures e registre como restaurar as
   permissões/definers aplicáveis.
2. Confirme por canal independente o endpoint, schema, porta e UUID autorizados.
   Conecte ao schema individual correto. O nome do schema ou o resultado do
   preflight não provam isolamento.
3. Rode apenas o preflight de leitura:

   ```bash
   mysql --database=SCHEMA_INDIVIDUAL_AUTORIZADO < SergioWilliam2209/sql/migrations/001_preflight_cancelamento.sql
   ```

   Confira **todos** os conjuntos de resultados: tabelas/colunas, estado das
   colunas novas e existência/definição das procedures. `ROUTINE_DEFINITION`
   nula/indisponível por falta de permissão significa que a revisão não foi
   concluída; pare. Só considere elegível o estado `READY ESTRUTURAL`, com as
   três colunas antigas de upgrade ausentes, as procedures antigas esperadas
   presentes, `sp_cancelar_compra` ausente e as definições alvo comparadas com
   os scripts versionados. Estado aplicado, parcial, incompatível ou diferente
   exige análise e plano próprio; não reaplique.
4. Confirme a versão e compatibilidade do servidor com os recursos usados
   (`ENUM`, `DATETIME(3)`, procedures e `DELIMITER`), em ambiente descartável.
   O preflight é escrito para MySQL e usa `@@server_uuid`; MariaDB e versões
   diferentes não estão validados.
5. O wrapper `002_migracao_cancelamento_compras.sql` contém `SOURCE` e foi
   preparado para **MySQL CLI**, executado da raiz do repositório:

   ```bash
   mysql --database=SCHEMA_INDIVIDUAL_AUTORIZADO < SergioWilliam2209/sql/migrations/002_migracao_cancelamento_compras.sql
   ```

   Não use `npm run db:init`, `sql/executar_todos.sql` nem `mysql2.query()`.
   Não passe `--force`: pare na primeira falha.
6. **MySQL Workbench:** o wrapper com `SOURCE` não é um script portátil para
   Workbench. Se CLI não for opção, use uma conexão previamente conferida e
   execute de forma controlada no editor: primeiro o `ALTER TABLE` isolado;
   depois, em operações separadas, remova apenas as três procedures após
   comparar suas definições e execute os blocos `CREATE PROCEDURE` dos arquivos
   `003`, `005` e `007`. `DELIMITER` é diretiva do cliente, não SQL enviado ao
   servidor; use o modo de execução de script do Workbench e confira que cada
   bloco composto é enviado como uma procedure. Valide este fluxo no Workbench
   e na versão alvo em schema descartável antes de considerar a execução real.
   Não execute o arquivo inteiro nem selecione comandos às cegas.
7. MySQL não garante rollback automático de todas as operações DDL. DDL pode
   confirmar implicitamente; se uma operação falhar após o `ALTER` ou após a
   remoção de procedures, o schema pode ficar parcialmente atualizado e as
   rotinas podem ficar indisponíveis. O `ROLLBACK` da procedure não reverte
   migrações DDL. Pare, preserve os erros/estado e use plano de recuperação
   baseado no backup restaurável; não tente reexecutar o wrapper cegamente.
8. Após aplicação aprovada, confira colunas, defaults, definições e permissões
   das procedures e faça validação funcional controlada. Os testes SQL de
   `sql/tests/README.md` são para schema descartável; não cancele compras reais
   para testá-los. Não foram executados nesta alteração.

O upgrade altera somente as duas colunas de `compras` e as procedures
`sp_listar_compras`, `sp_buscar_compra_por_id` e
`sp_atualizar_compra_com_itens`, além de criar `sp_cancelar_compra`. A remoção e
recriação podem interromper temporariamente consultas/atualizações e afetar
permissões/definers dessas rotinas; confira dependências antes. Nenhuma tabela
ou item é excluído pelo script.

## Procedures preliminares de materiais

## Procedimentos e contratos ainda pendentes

`002_procedures_materiais.sql` propõe `sp_listar_materiais`, `sp_buscar_material_por_id`, `sp_cadastrar_material`, `sp_atualizar_material` e `sp_excluir_material`. Cada chamada emite no máximo um conjunto de linhas, formato consumido pelo `ProcedureExecutor` compartilhado.

- A listagem aplica busca opcional em nome/descrição, retorna somente ativos e ordena por nome e ID.
- A busca por ID inclui registros ativos e inativos.
- Cadastro retorna a linha criada; atualização valida existência e retorna a linha persistida, mesmo quando não houve mudança de valores.
- Exclusão é somente lógica (`ativo = 0`), não apaga linhas nem o histórico. Repeti-la retorna o estado inativo. Reativação não está incluída.
- Erros de validação e IDs inválidos/inexistentes usam `SIGNAL SQLSTATE '45000'` com mensagens de domínio sem detalhes de SQL.
- Resultados incluem `ativo`, embora `MaterialDto` não o modele. Até que o grupo aprove uma mudança contratual, o repositório deve validar/mapear os campos necessários ao DTO e não presumir que o DTO expõe o estado ativo. A listagem filtra inativos; a busca por ID inclui ambos.

O arquivo usa `DELIMITER $$` e `END$$`, sintaxe compatível com o pré-processamento observado em `sql/init-db.js`, que remove as diretivas `DELIMITER` e troca `$$` por `;`. Contudo, ele não é incluído pela lista fixa do inicializador. Não há `DROP PROCEDURE IF EXISTS`: o arquivo **não é reexecutável** após as procedures serem criadas. A integração deve ocorrer uma única vez por migração controlada, com verificação de existência e versão; não executar diretamente pelo driver sem o pré-processamento apropriado. O script não altera nem substitui procedures existentes.

Não foi validado em MySQL. Antes da integração, testar criação pelo runner real em banco descartável, chamadas e formatos de retorno, validações, material inexistente, exclusão repetida e preservação das linhas referenciadas por `itens_compra`. O esquema e essas regras seguem provisórios, pendentes de aprovação coletiva.

## Procedures preliminares de consulta de compras

`003_procedures_compras.sql` contém somente:

- `sp_listar_compras(p_data_inicial, p_data_final)`: filtros de data opcionais, valida intervalo invertido, retorna uma linha por compra e ordena por `data_compra DESC, id DESC`. Não consulta itens nem filtra fornecedor.
- `sp_buscar_compra_por_id(p_id)`: valida ID e retorna cabeçalho com zero ou mais itens em um único conjunto, via `LEFT JOIN`. Aliases `compra_*` e `item_*` distinguem as colunas. Se a compra existe sem itens, há uma linha com `item_id` e colunas do item `NULL`; se não existe, retorna zero linhas. Itens ordenados por ID crescente.

O detalhe inclui os snapshots de nome/unidade do item e `preco_unitario`/`quantidade` em suas colunas `DECIMAL`; o mapeamento TypeScript deve preservá-los como texto decimal, sem coerção para ponto flutuante. O cabeçalho SQL retorna cotação histórica, mas `PurchaseDto` não possui esses campos. `supplierId` também não pode ser retornado nem filtrado: não há coluna ou relação de fornecedor no esquema. Os aliases do resultado detalhado não são diretamente os nomes dos DTOs; um futuro repositório deverá agrupar linhas por `compra_id` e mapear os aliases, convertendo a linha sem item em `items: []` (ou na representação coletiva aprovada).

Assim como o script de materiais, este arquivo usa `DELIMITER $$`, removido pelo pré-processamento do inicializador observado em `sql/init-db.js`; esse inicializador não inclui a pasta individual. Não há `DROP PROCEDURE`, portanto o arquivo não é reexecutável se as procedures já existirem. A inclusão precisa ser controlada e aprovada; não executar diretamente pelo driver sem pré-processamento.

Não houve execução nem validação em MySQL. Antes da integração, testar em banco descartável: filtros nenhum/inicial/final/combinados, intervalo invertido, IDs inválidos/inexistentes, compra com zero/um/vários itens, snapshots nulos/preenchidos, ordenação e extração do único conjunto pelo executor real. Fornecedor, DTOs de cotação, nulabilidade/cardinalidade de itens e o mapeamento de resultados permanecem pendentes de aprovação coletiva.

## Criação transacional preliminar de compras

`004_procedure_criar_compra.sql` propõe somente `sp_criar_compra_com_itens(p_data_compra, p_moeda, p_observacoes, p_itens)`. `p_itens` é um array JSON de 1 a 100 objetos (limite máximo provisório), por exemplo:

```json
[
  {
    "material_id": 12,
    "quantidade": "2.500",
    "preco_unitario": "18.7500",
    "moeda": "BRL"
  }
]
```

Material deve ser ativo; nome e unidade dos snapshots são lidos do cadastro sob `FOR UPDATE`, nunca aceitos do cliente. Quantidade/preço devem ser strings decimais em formato fixo, sem sinal/expoente, com no máximo 3/4 casas e limites inteiros de `DECIMAL(12,3)`/`DECIMAL(15,4)`. Quantidade deve ser positiva; preço pode ser zero. A moeda informada por item deve corresponder ao cabeçalho. Moeda de cotação fica `NULL`; fornecedor não é persistido. O resultado é um único conjunto contendo `id`; o futuro repositório deverá consultar o detalhe para formar `PurchaseDto`.

A procedure valida cabeçalho/array, inicia transação, grava cabeçalho e itens, e confirma somente ao final. Handler `SQLEXCEPTION` executa `ROLLBACK` e `RESIGNAL`; falha em qualquer item deve reverter toda a escrita. A leitura bloqueante do material reduz a corrida com desativação concorrente. O limite de 100 itens e as regras de material ativo/moeda comum são hipóteses de protótipo, pendentes de aprovação coletiva.

O uso de JSON requer suporte nativo ao tipo e às funções JSON; a proposta documenta MySQL 5.7.8+ como piso de referência, não como versão confirmada do servidor escolar. Não usa `JSON_TABLE`. O script segue `DELIMITER $$`, compatível com o pré-processamento observado no inicializador, mas ainda não está na lista de módulos. Não contém `DROP PROCEDURE` e não é reexecutável se já instalada; integração deve ser controlada. O `ProcedureExecutor` usa conexão compartilhada e não oferece API transacional: é necessário validar no executor real que a chamada não participa de transação externa e que o gerenciamento de sessão/concor­rência é seguro.

Não foi executado nem validado em MySQL. Em ambiente descartável, verificar sintaxe na versão alvo, JSON inválido/malformado e limites, strings decimais (inclusive escala excedente, expoente, sinal e overflow), moeda inválida/divergente, material inexistente/inativo, snapshots, retorno único, e especialmente rollback após falha em item posterior. Testes concorrentes devem confirmar o bloqueio e o comportamento com desativação de material. Os contratos TypeScript continuam sem alteração: data/moeda/itens são opcionais no input apesar de serem obrigatórios no SQL; `description` não tem coluna, `unit` é derivada do material, cotação não é enviada e o resultado ID exige leitura posterior para produzir o DTO.

## Atualização parcial preliminar de compra e itens

`005_procedure_atualizar_compra.sql` propõe `sp_atualizar_compra_com_itens(p_id, p_cabecalho, p_itens)`. O cabeçalho JSON é um patch: `data_compra` deve ser uma string `YYYY-MM-DD` válida; `observacoes` aceita string (vazia normaliza para `NULL`) ou JSON `null` para limpar. Campo omitido permanece inalterado. Moeda e cotação não são atualizadas.

`p_itens` é uma lista de operações (máximo provisório de 100; array vazio é permitido):

```json
[
  { "id": 21, "quantidade": "2.500", "preco_unitario": "18.7500" },
  { "material_id": 12, "quantidade": "1", "preco_unitario": "4.2500", "moeda": "BRL" }
]
```

Objeto com `id` atualiza somente quantidade/preço de item que pertença à compra; material e snapshots existentes não mudam. Objeto sem `id` cria item, exige material ativo e moeda igual à compra e obtém nome/unidade do catálogo sob bloqueio. IDs repetidos são rejeitados. Itens não enviados permanecem. Não há operação de remoção. O resultado é um conjunto com `id`; o repositório poderá consultar o detalhe após a chamada.

Cabeçalho, atualizações e inclusões são envoltos em transação com bloqueio da compra; itens e materiais são bloqueados nas operações pertinentes. Handler SQL executa rollback e relança erro. As decimais são strings e passam por validação de formato, precisão e escala antes do CAST para os tipos DECIMAL existentes. O bloqueio da compra serializa esta procedure para a mesma compra, mas ainda há risco de deadlock com outras rotinas que adquiram locks em ordem diferente; não existe retry automático nem controle otimista/versionamento.

O script usa JSON, `JSON_CONTAINS_PATH`, `JSON_EXTRACT`, `JSON_TYPE`, `STR_TO_DATE`, regex e `SIGNAL/RESIGNAL`; a referência mínima documentada para recursos JSON é MySQL 5.7.8+, mas compatibilidade da assinatura e funções nesta versão ainda precisa de teste. O inicializador coletivo remove `DELIMITER $$` e substitui `$$`, porém não inclui scripts individuais. O arquivo não contém `DROP` e não é reexecutável se a procedure já existir.

Os contratos TypeScript permanecem sem alteração. `UpdatePurchaseInput` é parcial e deverá ser serializado preservando campo omitido versus `null`; a porta não define o formato JSON nem remoção. O campo `description` não tem coluna. Testar em MySQL descartável sintaxe/runner, patches omitidos e nulos, data inválida, IDs duplicados e de outra compra, decimais inválidas/limites, material inativo, rollback após uma operação anterior, locks concorrentes e retorno único. Nenhum desses comportamentos foi executado nesta etapa.
