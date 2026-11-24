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
