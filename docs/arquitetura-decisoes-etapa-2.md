# Etapa 2 — Arquitetura e Decisões

**Status:** proposta arquitetural para validação coletiva; não é autorização de implementação.  
**Escopo desta etapa aprovada:** documentação arquitetural em `docs/` somente. Nenhum código, SQL, configuração, dependência ou agente foi alterado; nenhuma migração, instalação, commit ou publicação foi executada.  
**Requisitos de domínio:** consultar `docs/levantamento-requisitos-etapa-1.md`; regras ainda pendentes continuam em aberto.

## 1. Contexto observado

O protótipo em `base/` usa Electron 41, CommonJS e JavaScript; a interface é HTML/CSS/Bootstrap. Main contém janelas, handlers IPC e SQL dos exemplos `console` e `jogo`; Preload expõe métodos específicos via `contextBridge`; a conexão usa `mysql2` e variáveis `DB_*` via `dotenv`. O SQL atual contém somente `console` e `jogo`, sem FKs, e inclui `DROP TABLE` de tabelas de clientes/funcionários que não cria. Não há módulo atual de compras, materiais, cotação ou CEP.

O MySQL é mantido como **ponto de partida**, não como decisão imutável. Trocar persistência exige aprovação do grupo. A decisão de reaproveitar, adaptar ou retirar os exemplos também é coletiva.

## 2. Direção arquitetural recomendada

1. Preservar o fluxo Electron e MySQL existentes como referência, mas não ampliar os exemplos sem contrato acordado.
2. Migrar por fronteiras e de modo incremental para TypeScript, começando por tipos/contratos e novos serviços; alcançar TypeScript em **toda a lógica da aplicação** antes da versão final. A migração temporária não satisfaz o critério final.
3. Manter limites explícitos: Renderer para apresentação; Preload para API estreita; Main para validação, autorização e coordenação; serviços de domínio para regras; repositórios para persistência; adaptadores para APIs externas.
4. Modelar compras e materiais de forma relacional, mantendo compras/itens, catálogo de materiais, fornecedores e eventual histórico cambial como conceitos separados somente se o grupo aprovar as regras correspondentes.
5. Isolar os módulos de cada integrante e acordar contratos para entidades compartilhadas antes da implementação paralela.

São recomendações para decisão, não ADRs aprovados pelo grupo.

## 3. Migração JavaScript → TypeScript

| Alternativa | Descrição | Benefícios | Custos/riscos |
| --- | --- | --- | --- |
| **Migração incremental com estrutura atual (recomendada para discussão)** | Preservar os diretórios e responsabilidades atuais; introduzir compilação TypeScript e migrar por camadas/fluxos, mantendo compatibilidade temporária com os arquivos JS não migrados. | Menor ruptura; permite preservar e validar o protótipo e migrar primeiro contratos, serviços e persistência. | Período temporário com JS/TS; requer fronteiras e build consistentes; migração parcial não atende ao requisito final. |
| Reescrita da fundação em TypeScript | Substituir a estrutura de demonstração por base TypeScript e portar apenas comportamentos aprovados. | Estrutura homogênea desde o começo e oportunidade de tratar problemas transversais. | Maior risco de retrabalho/perda de comportamento; exige inventário e concordância do grupo. |
| Manter demonstração separada e construir solução paralela | Preservar a demonstração intacta e desenvolver a aplicação final em outra estrutura. | Isola o exemplo e evita conflito direto. | Duplica estrutura, eleva custo de integração e precisa de destino definido para o protótipo. |

**Recomendação:** avaliar primeiro a migração incremental por camadas, sem alterar agora o projeto. Definir configuração de compilação, formato de módulos, localização de fontes e artefatos, tipagem do preload e estratégia de Renderer durante decisão coletiva. A versão final deve ter lógica exclusivamente TypeScript, modularizada em classes, com orientação a objetos; HTML/CSS e configuração não são lógica de aplicação.

## 4. Modelo relacional conceitual

Manter MySQL como base de discussão. A lista abaixo é um **modelo candidato**, não um esquema aprovado nem uma autorização para SQL. As seis entidades em negrito podem formar uma cadeia com FKs e atender numericamente ao mínimo, caso as regras confirmem seu uso:

| Entidade candidata | Papel | Relação candidata / estado |
| --- | --- | --- |
| **Fornecedor** | Cadastro possivelmente compartilhado. | Um fornecedor poderia estar ligado a várias compras; confirmar necessidade e cardinalidade. |
| **Funcionário** | Entidade coletiva e possível responsável pelo registro. | Um funcionário poderia registrar várias compras; permissões e obrigatoriedade pendentes. |
| **Compra** | Registro principal de aquisição. | FK candidata para fornecedor e funcionário; cardinalidades e nulabilidade dependem do domínio. |
| **Material** | Catálogo potencialmente compartilhado. | Pode ser referenciado por vários itens; confirmar catálogo, unidade e eventual estoque. |
| **ItemCompra** | Associação entre compra e material, com dados próprios do item. | Candidata a FKs para Compra e Material; depende de compra com múltiplos itens. |
| **CotacaoCambio** | Referência/histórico de taxa, se for persistido. | Compra ou item poderia referenciar uma cotação; escolher vínculo e retenção após definir o uso. |

Extensões candidatas: **Endereco** (reutilizado ou pertencente diretamente a um cadastro), **Cliente**, **Procedimento**, **HistoricoCliente** e registro de **Notificacao**. Clientes, procedimentos, histórico e notificações pertencem ao escopo coletivo; o histórico dos clientes e as regras da notificação um dia antes continuam explicitamente pendentes.

As relações acima são hipóteses conceituais; não fixam FKs, exclusões, cardinalidades, campos nem políticas de retenção. O grupo precisa validar entidades e responsáveis. CRUD aplica-se às entidades que forem aprovadas, conforme o requisito da disciplina. Não pressupor controle de estoque, pagamento, exclusão lógica ou `ON DELETE CASCADE`.

**Evolução do esquema — recomendação pendente:** preferir migrações versionadas, incrementais, revisáveis e testáveis, com cópia/recuperação planejada e tratamento de falha parcial. Não usar scripts destrutivos de criação como mecanismo de atualização em base com dados: o SQL atual contém `DROP TABLE IF EXISTS clientes/funcionarios`, que deve ser avaliado pelo grupo antes de qualquer execução. Versão do servidor, ambiente de distribuição e estado de dados existentes precisam ser confirmados.

## 5. Contratos preliminares Main / Preload / Renderer

**Proposta de fronteira**

- **Renderer:** apresenta formulários/listas e estado de carregamento/erro; não acessa MySQL, `ipcRenderer`, credenciais ou APIs externas diretamente.
- **Preload:** expõe somente métodos explícitos e tipados via `contextBridge`; não expõe objetos Electron genéricos nem canal IPC arbitrário.
- **Main:** recebe chamadas, valida formato e contexto, aplica autorização quando definida e chama serviços.
- **Serviços/repositorios/adaptadores:** regras de domínio, MySQL e provedores externos separados do Renderer; classes e tipos TypeScript conforme padrão aprovado.

**API conceitual exposta pelo Preload** (nomes ilustrativos, não canais aprovados):

| Área | Operações candidatas | Responsabilidade/contrato esperado |
| --- | --- | --- |
| Compras | `purchases.list(filter?)`, `purchases.get(id)`, `purchases.create(input)`, `purchases.update(id,input)`, `purchases.delete(id)` | DTOs tipados; compra e itens conforme modelo aprovado; validar ids, valores e referências no Main. Exclusão e histórico dependem de regra de domínio. |
| Materiais | `materials.list(filter?)`, `materials.get(id)`, `materials.create(input)`, `materials.update(id,input)`, `materials.delete(id)` | CRUD se catálogo de materiais for aprovado; regras de unidade, estoque, referências e exclusão pendentes. |
| Cotação USD | `exchangeRates.get({base, quote, date?})` | Resposta tipada com valor e, se acordado, origem e instante de referência; falhas/atraso explícitos. Uso e persistência da taxa pendentes. |
| CEP/endereço | `addresses.lookupByPostalCode(postalCode)` | Entrada somente CEP; resposta com campos de endereço acordados; representar inválido, não encontrado e indisponibilidade sem preencher silenciosamente dados existentes. |

Todas as chamadas assíncronas devem ter resultado/erro previsível e serializável. Sugere-se envelope comum `Result<T>` de sucesso ou erro público tipado (código estável e mensagem segura), sem detalhes SQL, stack trace ou segredos. Validar payload no Main e evitar listeners de retorno sem ciclo de vida/remoção definido. Contrato final, permissões e DTOs dependem do grupo.

## 6. Integrações de APIs

O requisito é de pelo menos quatro situações distintas, reais e justificáveis. Integrações previstas no levantamento:

1. Cotação USD — prevista no módulo de compras.
2. Consulta CEP — prevista para cadastro(s) ainda não definidos.
3. Notificação de procedimento um dia antes — funcionalidade prevista, mas canal/serviço e regras pendentes.

**Sugestão não aprovada para possível quarta situação:** API de catálogo/preço de fornecedor de materiais, apenas se existir necessidade real aprovada e serviço apropriado. Caso não seja válida, o grupo precisa propor outra integração justificável. Não está confirmado que cotação e CEP serão contadas como situações distintas pelo professor. Não selecionar provedores nesta decisão sem esclarecer finalidade, disponibilidade, limites e termos.

Para cada integração, documentar adaptador isolado, dados enviados, configuração/segredos, timeout/falhas, limites e testes; credenciais nunca devem ser expostas ao Renderer. Notificações e histórico de clientes ficam como pendências de domínio.

## 7. Integração coletiva

- **Divisão funcional informada:** Crispin — clientes e funcionários; Amanda Sousa — procedimentos e mensagens um dia antes; `SergioWilliam2209` — compras com materiais, cotação USD e busca CEP; Amanda Valente — backup de clientes (histórico). O sentido exato de “backup” permanece pendente.
- A divisão funcional não atribui responsabilidade por arquitetura compartilhada, migração TypeScript, configuração Electron, MySQL, contratos comuns ou integração; esses papéis precisam de acordo coletivo.
- Validar propriedade e contratos de entidades compartilhadas, em especial cliente, funcionário, procedimento, fornecedor, material e endereço; não definir módulos dos colegas unilateralmente.
- **CEP ↔ cadastros:** a consulta de `SergioWilliam2209` precisa de contrato consumível nos formulários de clientes e funcionários de Crispin, incluindo campos, revisão do endereço, erros e disponibilidade. Contrato e comportamento ainda dependem de validação.
- **Procedimentos ↔ clientes ↔ histórico:** procedimentos e lembretes de Amanda Sousa dependem de identificar cliente e obter dados de contato necessários; o histórico/backup de Amanda Valente pode depender de mudanças em clientes e procedimentos. Definir eventos registrados, vínculo, sincronização, retenção/restauração e comportamento em alteração/cancelamento antes de integrar. Não assumir que “backup” significa histórico automático ou cópia de segurança técnica.
- Aprovar tipos/DTOs e padrões de IPC comuns antes de contribuições paralelas.
- Preferir mudanças pequenas por módulo e evitar edição concorrente dos pontos centrais (`main`, `preload`, conexão e esquema).
- Revisar diferenças e preservar o protótipo; destino de `console`/`jogo` depende do grupo.
- Definir integração/revisão coletiva e testes de contrato. Commits progressivos/identificáveis são requisito do planejamento, mas nenhum commit ou publicação está autorizado nesta etapa.

## 8. Segurança e testes arquiteturais

**Riscos observados no protótipo a resolver antes de dados reais:** BrowserWindows não declaram explicitamente `contextIsolation`, `nodeIntegration` ou `sandbox`; DevTools são abertos; handlers IPC não evidenciam validação de payload/remetente; o Preload não expõe remoção de listeners de retorno; detalhes de erros MySQL são mostrados em diálogos/logs; dados do Renderer já foram observados interpolados via `innerHTML`. O uso de variáveis `dotenv` não comprova proteção de segredos no aplicativo distribuído. São riscos/observações, não alterações feitas.

**Requisitos arquiteturais propostos:** revisar e declarar opções seguras de janela; validar remetente e payload no Main; aplicar autorização após perfis definidos; reduzir exposição do Preload; não renderizar dados não confiáveis como HTML; proteger credenciais e minimizar dados pessoais em APIs/logs; sanitizar mensagens públicas de erro; tratar APIs indisponíveis e respostas incompletas.

Também avaliar política de navegação/links externos, CSP e conteúdo remoto; restringir DevTools a desenvolvimento; definir privilégios mínimos da conta MySQL e proteção/backup dos dados. São requisitos de revisão, não configuração aplicada. O uso de consultas parametrizadas nos exemplos é um controle positivo, mas não substitui validação de domínio e autorização.

**Testes/aceitação propostos:**

- Build final verifica que lógica de aplicação está em TypeScript e sem módulos funcionais JS remanescentes.
- Cada operação pública do Preload tem tipo/contrato e chama apenas ação permitida; teste rejeita payload inválido e chamadas de contexto não autorizado.
- Camada de persistência mantém FKs e integridade no modelo aprovado; testes verificam restrições e operações CRUD aprovadas.
- Cotação e CEP cobrem sucesso, resposta inválida, ausência de resultado e indisponibilidade sem exposição de segredos.
- Testes verificam que erros não expõem detalhes internos e que a interface não interpreta dados externos como HTML.
- Critérios de domínio de compras, exclusão, histórico e notificações só serão fixados após validação dos responsáveis.

## 9. Decisões recomendadas e pendentes

**Recomendadas para deliberação do grupo**

- Manter MySQL como ponto de partida.
- Preferir migração incremental para TypeScript, com prazo/critério explícito para remover toda a lógica JavaScript antes da versão final.
- Adotar separação Renderer → Preload restrito → Main → serviços/repositórios/adaptadores.
- Usar o modelo de compras/itens/material/fornecedor/cotação como hipótese de discussão, não esquema fechado.

**Pendentes de aprovação coletiva/professor**

- Destino dos exemplos `console`/`jogo`.
- Ferramentas e organização da compilação TypeScript; modo de módulos e estratégia de migração do Renderer.
- Confirmação de entidades, campos, cardinalidades, FKs e políticas de exclusão/histórico.
- Estoque, fornecedores, moeda, uso/persistência da cotação e cadastros que usarão CEP.
- Contratos IPC finais, perfis, autorização e forma de fornecer credenciais.
- Quarta (ou mais) situação real de API e confirmação de como o professor contabiliza integrações.
- Definição exata do histórico de clientes e regras/canal das notificações um dia antes.
- Significado e escopo de “backup de clientes (histórico)”, eventos e integração com clientes/procedimentos.
- Contrato compartilhado de consulta CEP com os cadastros de clientes e funcionários.
- Designação coletiva de responsáveis por arquitetura, migração TypeScript, Electron, MySQL e integração técnica.
- Confirmação do requisito GitHub sobre `willcotil` mencionado no enunciado versus convite enviado a `willunicamp`, conforme registrado na Etapa 1.

## 10. Efeito no Git e próximo passo

Esta etapa produz somente este documento arquitetural em `docs/`; nenhum código, SQL, configuração ou dependência foi alterado. Não houve migração, instalação, commit, push ou alteração remota. A Etapa 3 — Fundação do Projeto — **não foi iniciada** e exige aprovação explícita separada.
