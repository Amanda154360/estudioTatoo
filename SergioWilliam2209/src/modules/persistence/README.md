# Portas de persistência (preliminares)

`ProcedureExecutorPort` define a fronteira mínima `consultar(sql, parametros?)`, compatível com o formato do executor compartilhado sem importar `mysql2` nem abrir conexão. Na composição futura, um adaptador pequeno poderá encaminhar essa chamada para `ProcedureExecutor.consultar`.

`MaterialRepositoryPort` e `PurchaseRepositoryPort` descrevem operações de persistência orientadas aos DTOs já existentes. Não há repositórios concretos, SQL ou regras de domínio implementados.

Continuam pendentes de aprovação: esquema e campos, relacionamentos/fornecedor, cardinalidade e transações dos itens, política de exclusão, validações, tratamento uniforme de erros e como os scripts individuais serão incluídos no inicializador SQL compartilhado.
