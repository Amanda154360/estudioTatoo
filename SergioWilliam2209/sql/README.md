# Rascunho SQL de materiais e compras

`001_materiais_compras_itens.sql` é uma proposta **aditiva e pendente de aprovação coletiva**. Não foi executada. Ela cria `materiais`, `compras` e `itens_compra`; não cria fornecedor nem altera tabelas existentes.

## Modelo

- `compras` 1:N `itens_compra`.
- `materiais` 1:N `itens_compra`; a relação compra–material é N:N via itens.
- As FKs dos itens usam `ON DELETE RESTRICT` e `ON UPDATE RESTRICT`, preservando referências. A exclusão/cancelamento de compras ainda precisa de política aprovada.
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
- Campos e regras ainda a aprovar: unidade/categoria de material, status/estado da compra, compras sem itens, alterações após registro, exclusões e eventual estoque.

## Integração e execução

O inicializador coletivo mantém uma lista fixa em `sql/init-db.js`; esta pasta individual não é aplicada automaticamente. A integração futura deve ser acordada com Amanda e incluir migração revisada no fluxo compartilhado. O inicializador atual reexecuta módulos e há scripts existentes com `DROP TABLE`; não o use como mecanismo de upgrade desta proposta.

Antes de qualquer aplicação, revisar versão do MySQL, compatibilidade de `DATETIME(3)` e precisão decimal, testar em banco descartável e planejar backup. Não executar este rascunho em banco compartilhado sem aprovação explícita.

## Procedures preliminares de materiais

`002_procedures_materiais.sql` propõe `sp_listar_materiais`, `sp_buscar_material_por_id`, `sp_cadastrar_material`, `sp_atualizar_material` e `sp_excluir_material`. Cada chamada emite no máximo um conjunto de linhas, formato consumido pelo `ProcedureExecutor` compartilhado.

- A listagem aplica busca opcional em nome/descrição, retorna somente ativos e ordena por nome e ID.
- A busca por ID inclui registros ativos e inativos.
- Cadastro retorna a linha criada; atualização valida existência e retorna a linha persistida, mesmo quando não houve mudança de valores.
- Exclusão é somente lógica (`ativo = 0`), não apaga linhas nem o histórico. Repeti-la retorna o estado inativo. Reativação não está incluída.
- Erros de validação e IDs inválidos/inexistentes usam `SIGNAL SQLSTATE '45000'` com mensagens de domínio sem detalhes de SQL.
- Resultados incluem `ativo`, embora `MaterialDto` não o modele. Até que o grupo aprove uma mudança contratual, o repositório deve validar/mapear os campos necessários ao DTO e não presumir que o DTO expõe o estado ativo. A listagem filtra inativos; a busca por ID inclui ambos.

O arquivo usa `DELIMITER $$` e `END$$`, sintaxe compatível com o pré-processamento observado em `sql/init-db.js`, que remove as diretivas `DELIMITER` e troca `$$` por `;`. Contudo, ele não é incluído pela lista fixa do inicializador. Não há `DROP PROCEDURE IF EXISTS`: o arquivo **não é reexecutável** após as procedures serem criadas. A integração deve ocorrer uma única vez por migração controlada, com verificação de existência e versão; não executar diretamente pelo driver sem o pré-processamento apropriado. O script não altera nem substitui procedures existentes.

Não foi validado em MySQL. Antes da integração, testar criação pelo runner real em banco descartável, chamadas e formatos de retorno, validações, material inexistente, exclusão repetida e preservação das linhas referenciadas por `itens_compra`. O esquema e essas regras seguem provisórios, pendentes de aprovação coletiva.
