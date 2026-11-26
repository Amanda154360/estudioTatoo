# Módulos de SergioWilliam2209

Esta pasta contém módulos TypeScript reutilizáveis integrados à aplicação Electron coletiva; não é uma segunda aplicação Electron. Os módulos de **materiais**, **compras**, **cotação PTAX** e **consulta de endereços por ViaCEP** já possuem integração implementada com o aplicativo coletivo.

## Desenvolvimento e testes

```bash
npm install
npm run check
npm run build
npm test
```

No pacote individual, `npm test` executa os **125 testes individuais**. No projeto Electron coletivo, `npm run test:module-integration` executa **6 testes simulados de integração**. O resultado registrado para a entrega foi **131 testes aprovados no total** (125 individuais + 6 simulados de integração). Esses testes não substituem testes de persistência em MySQL real.

## Persistência e SQL

Os scripts de migração individual estão em `sql/001`–`006`; os testes SQL `007`–`014` estão **preparados, mas não executados**. As procedures e a persistência em MySQL real ainda não foram testadas. Consulte `sql/README.md` e `sql/tests/README.md` para pré-condições e limitações. Não execute a migração em banco compartilhado sem autorização explícita e ambiente confirmado como seguro; não use `npm run db:init` nem `sql/executar_todos.sql` para aplicá-la.

## Limitações atuais de compras

- Não há operação integrada para cancelar ou excluir uma compra.
- Não há operação integrada para remover itens de uma compra.
- O fluxo integrado não oferece atualização de itens já existentes. A procedure SQL preliminar contém uma operação de atualização por ID, mas ela não está exposta pelo contrato/repositório integrado.
- As procedures e a persistência continuam pendentes de validação em MySQL real.

O código-fonte fica em `src/` e a compilação em `dist/`. As integrações seguem os contratos compartilhados do Electron coletivo.
