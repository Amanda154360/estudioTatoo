# Etapa 1 — Descoberta e Levantamento de Requisitos

**Status:** Etapa 1 documentada preliminarmente; algumas regras de negócio ainda dependem de validação com os integrantes e o professor.  
**Escopo autorizado:** análise e documentação de requisitos; preservação integral do código, configurações, dependências e SQL existentes.  
**Fora do escopo:** implementação, decisões definitivas de arquitetura ou de domínio dos demais integrantes, alteração de código/banco, commits e publicação.

## 1. Objetivo e contexto

Levantar requisitos para o sistema coletivo de gerenciamento de um estúdio de tatuagem, priorizando os módulos de compras com materiais, cotação do dólar e consulta de endereço por CEP sob responsabilidade de `SergioWilliam2209`, sem antecipar decisões pertencentes aos demais integrantes.

Este documento distingue:

- **Confirmado:** consta do planejamento inicial ou foi explicitamente informado pelo responsável do projeto.
- **Sugestão técnica:** alternativa a discutir; não é decisão aprovada.
- **Pendente:** requer validação dos integrantes, do professor ou do responsável pelo requisito.

## 2. Requisitos confirmados

Fonte principal: `docs/planejamento-inicial.md` e as instruções do responsável pelo projeto.

| ID | Requisito confirmado | Evidência/observação |
| --- | --- | --- |
| C-01 | Aplicação desktop integralmente em Electron. | Critério obrigatório do planejamento. |
| C-02 | Toda lógica da aplicação em TypeScript, modularizada em classes e orientada a objetos. | Critério obrigatório; o código de demonstração existente não satisfaz ainda esse critério. |
| C-03 | Banco de dados relacional com pelo menos seis tabelas interligadas por chaves estrangeiras. | Critério obrigatório; entidades e relações finais ainda não estão definidas. |
| C-04 | CRUD completo (criar, consultar, atualizar e excluir) para todas as entidades aprovadas. | Critério obrigatório. |
| C-05 | O escopo funcional inclui clientes, funcionários, procedimentos, histórico de clientes, compras com materiais e cotação do dólar, consulta de endereço por CEP e envio de mensagem um dia antes da data do procedimento. | Funcionalidades previstas no planejamento; suas regras detalhadas permanecem pendentes. |
| C-06 | Devem existir pelo menos quatro situações distintas de consumo de APIs, cada uma com finalidade real e justificável. | Quantidade e princípio confirmados; catálogo e critérios de comprovação pendentes. |
| C-07 | Segurança é requisito, incluindo proteção de senhas, validação de entradas, controle de acesso e proteção de dados sensíveis. | Estratégias e perfis ainda não definidos. |
| C-08 | O repositório é coletivo; a arquitetura deve ser alinhada com o grupo e módulos de outros integrantes não podem ser decididos unilateralmente. | Instrução explícita do responsável. |
| C-09 | O enunciado original menciona `willcotil`; o convite observado para acompanhar o repositório `estudioTatoo` foi enviado à conta `willunicamp`, do professor. Commits progressivos e identificáveis de todos os integrantes são requisito de GitHub. | A aceitação do convite não foi confirmada. Pendente apenas confirmar com o professor se a diferença entre as contas atende ao requisito. |
| C-10 | `SergioWilliam2209` é a conta GitHub do usuário, responsável por compras com materiais, cotação do dólar e consulta de endereços por CEP. | Informação explícita do usuário; regras funcionais ainda sujeitas à validação. |
| C-11 | A divisão funcional informada é: Crispin — clientes e funcionários; Amanda Sousa — procedimentos e mensagens um dia antes; `SergioWilliam2209` — compras com materiais, cotação USD e busca por CEP; Amanda Valente — backup de clientes (histórico). | Distribuição confirmada pelo usuário. Não determina responsabilidade por arquitetura, TypeScript, Electron, MySQL ou integração compartilhada. Escopo de “backup” pendente de esclarecimento. |

## 2.1 Estado observado do repositório (contexto, não requisito)

O diagnóstico de leitura anterior identificou em `base/` um protótipo Electron em JavaScript/CommonJS, com interface HTML/CSS e Bootstrap, `mysql2` e operações CRUD de demonstração para `console` e `jogo`. O SQL atual é de exemplo e não constitui modelo do domínio do estúdio. Não foram identificados módulos implementados de compras, materiais, cotação USD ou CEP.

Esse protótipo é trabalho do repositório coletivo. A Etapa 1 não decide se deve ser reaproveitado, adaptado ou substituído; essa decisão requer validação do grupo e alinhamento arquitetural posterior. Nenhum arquivo de implementação, configuração, dependência ou SQL foi alterado nesta etapa.

## 3. Requisitos priorizados dos módulos do responsável

### 3.1 Compras com materiais

**Confirmado**

- O sistema deverá contemplar cadastro de compras com materiais e CRUD conforme o requisito geral C-04.
- O módulo deve integrar-se ao sistema coletivo, aos contratos e às entidades compartilhadas que o grupo vier a aprovar.

**Sugestões técnicas para discussão (não aprovadas)**

- Separar conceitualmente uma compra de suas linhas/itens pode representar compras com vários materiais e quantidades.
- Avaliar fornecedor como entidade compartilhada caso o grupo precise reutilizá-la em outras áreas.
- Se a cotação for usada para conversão, considerar registrar a taxa aplicada junto à compra para preservar o contexto histórico. Isso depende da regra cambial aprovada.
- Caso exista controle de estoque, definir os movimentos e seu vínculo com compras; não inferir que estoque faz parte do escopo.

**Pendente**

- Campos da compra, item e material; identificadores e unidades de medida.
- Se haverá fornecedor, comprovante, status, moeda original, impostos, descontos ou observações.
- Se uma compra pode conter vários materiais, como serão alterados/excluídos itens e se haverá cancelamento.
- Se o módulo controla estoque; regras de entrada, ajuste, devolução e saldo, se aplicável.
- Como se relacionam compra, usuário/funcionário responsável e eventual fornecedor.
- Se valores são registrados em moeda original, convertidos, ou ambos; precisão e arredondamento.
- Regras para correções posteriores e preservação de histórico.

### 3.2 Cotação do dólar

**Confirmado**

- Cotação do dólar é parte prevista do módulo de compras e integra os requisitos de APIs reais.
- Origem e momento de referência da cotação precisam ser esclarecidos; o planejamento explicita essa pendência.

**Sugestões técnicas para discussão (não aprovadas)**

- Documentar valor, moeda-base/alvo, fonte e instante/data de consulta para que o uso seja auditável.
- Definir comportamento explícito para indisponibilidade, resposta inválida ou dados desatualizados; não substituir silenciosamente uma cotação falha por valor presumido.
- Diferenciar taxa meramente consultada de taxa efetivamente aplicada ao cálculo de uma compra.

**Pendente**

- Provedor/API e endpoint aceitos, moeda e tipo de cotação (por exemplo, comercial ou outra convenção).
- Se a cotação será apenas exibida ou usada em conversão e gravação de compras.
- Momento da consulta e regra de seleção da taxa: data da compra, data de pagamento ou outra.
- Se o sistema armazenará histórico/cópia da cotação usada e por quanto tempo.
- Precisão, arredondamento, atualização/cache, limite de chamadas e política offline.
- Como o professor contabiliza essa integração entre as quatro situações obrigatórias.

### 3.3 Consulta de endereço por CEP

**Confirmado**

- O sistema deve oferecer busca de endereço por CEP; o módulo é responsabilidade do usuário.
- O planejamento deixa pendente em quais cadastros a busca será utilizada.

**Sugestões técnicas para discussão (não aprovadas)**

- Tratar resultado externo como sugestão editável, sujeita à confirmação do usuário.
- Validar formato e resultado e permitir correção manual quando o serviço não encontrar o CEP ou estiver indisponível.
- Minimizar dados enviados à API e não registrar mais dados pessoais que os necessários.

**Pendente**

- Cadastros que terão consulta (cliente, funcionário, fornecedor ou outros).
- Campos a preencher e política de persistência: sugestão, preenchimento automático ou confirmação.
- Provedor/API, limites, disponibilidade e termos de uso.
- Tratamento de CEP inválido/não encontrado, endereço incompleto e falha de rede.
- Se a consulta será contada como uma das quatro situações obrigatórias.

## 4. Dependências e interfaces com o restante do sistema

Os itens abaixo são dependências a validar; não atribuem propriedade ou regras a integrantes:

| Dependência | Módulo(s) relacionado(s) | Questão para alinhamento |
| --- | --- | --- |
| Pessoas e permissões | Clientes, funcionários, compras e histórico | Quem pode criar, consultar, alterar ou excluir cada registro? Há perfis distintos? |
| Fornecedores | Compras e possivelmente outras áreas | Fornecedor será entidade própria? Quem define seus campos e CRUD? |
| Materiais | Compras e possível estoque | Material é catálogo comum? Quem decide unidade, categoria, custo e eventual saldo? |
| Registro financeiro | Compras e cotação | Há pagamentos, moeda, conversão, impostos ou apenas registro de aquisição? |
| Endereço | Clientes, funcionários e/ou fornecedores | Quais cadastros usam CEP e qual parte do endereço é compartilhada? |
| Integrações e configuração | Cotação, CEP, notificações e outras APIs | Onde ficam credenciais/configurações e como erros são apresentados? |
| Contratos entre camadas | Aplicação Electron | Como serão definidos os limites e contratos Main/preload/renderer e serviços TypeScript? Decisão reservada à Etapa 2. |
| CEP nos cadastros | Clientes e funcionários (Crispin); consulta CEP (`SergioWilliam2209`) | Acordar contrato do serviço de consulta, campos retornados, confirmação/edição e tratamento de falha para ambos os formulários. |
| Procedimentos e clientes | Procedimentos/mensagens (Amanda Sousa); clientes (Crispin) | Definir vínculo procedimento–cliente, dados de contato necessários, alterações/cancelamentos e regra de envio antes de integrar notificações. |
| Histórico/backup de clientes | Histórico/backup (Amanda Valente); cadastros de clientes e possivelmente procedimentos | Esclarecer o significado de “backup”, eventos incluídos, sincronização, retenção, restauração e dependências com alterações de clientes/procedimentos. |

## 5. Requisitos coletivos ainda sem definição

- Dados, fluxos, permissões e critérios de aceite de clientes, funcionários, procedimentos e histórico são responsabilidade de validação coletiva.
- Para notificações: canal, destinatário, conteúdo, consentimento, serviço, horário/fuso, reenvio, falhas e comprovação de envio.
- Para as quatro ou mais situações de API: finalidade, responsável, provedor candidato, dados envolvidos, limites, falhas e forma de demonstrar cada uso.
- Privacidade, retenção, backup, recuperação, auditoria, autenticação e autorização devem ser detalhados com o grupo e, quando necessário, com o professor.
- A divisão funcional por integrante foi informada; propriedade de entidades compartilhadas, responsáveis técnicos e processo de integração/revisão ainda precisam ser alinhados.

### Situações de API candidatas — sugestões, não seleção

O planejamento requer no mínimo quatro situações reais. As seguintes possibilidades foram levantadas, sem aprovação de provedor, escopo ou contagem para avaliação:

1. Consultar cotação USD para apoiar o fluxo de compras.
2. Consultar CEP para auxiliar o preenchimento de endereço em cadastros aprovados.
3. Enviar lembrete da data de procedimento por um canal externo, conforme a notificação prevista.
4. Consultar catálogo ou preços de materiais de um fornecedor, somente se houver necessidade de domínio e serviço adequado confirmados.

As duas primeiras são candidatas relacionadas aos módulos priorizados; não está confirmado se o professor as aceitará como duas situações distintas. A quarta não deve ser adotada apenas para atingir a quantidade mínima: depende de justificativa funcional real e validação do grupo. Outros casos podem ser propostos pelo grupo.

### Sugestões transversais para análise posterior

- Manter credenciais e chamadas externas fora do Renderer, com exposição apenas de operações necessárias por contratos explícitos; validar dados e resultados de serviços externos.
- Em fluxos de CEP e cotação, documentar estados de carregamento, sucesso, erro e indisponibilidade; requisitos de interface e acessibilidade devem ser refinados com o grupo.
- Em telas futuras, considerar rótulos claros, erros associados aos campos e estados acessíveis por teclado/leitor de tela.
- Minimizar dados pessoais enviados a serviços externos; avaliar os dados presentes em logs e mensagens de erro.
- Definir validação e autorização no limite confiável, sem confiar apenas no Renderer; decidir como segredos serão fornecidos e protegidos no desenvolvimento e na entrega.
- Antes de uso com dados reais, revisar os riscos já observados no protótipo: validação de remetente/payload IPC, exposição de detalhes de erro, DevTools e proteção efetiva de credenciais no pacote distribuído.

Esses itens são recomendações para avaliação na Etapa 2, não decisões arquiteturais ou requisitos funcionais aprovados nesta etapa.

### Levantamento de segurança — pontos a validar

O requisito geral de segurança está confirmado, mas os controles concretos permanecem pendentes. Para os módulos priorizados, validar:

- Quais dados de endereço são indispensáveis e quais serão enviados ao provedor de CEP; evitar enviar outros dados pessoais sem necessidade.
- Quem pode consultar, criar, alterar ou excluir compras e itens; quais campos, valores e referências precisam de validação no limite confiável.
- Se cotação efetivamente usada numa compra deve ter fonte, instante e valor registrados; a regra de negócio ainda não foi definida.
- Como segredos de APIs e banco serão fornecidos e protegidos, sem inclusão em código, Renderer, mensagens de erro ou logs desnecessários. Variáveis de ambiente usadas pelo protótipo não comprovam, por si, proteção no aplicativo distribuído.
- Quais políticas o grupo adotará para autenticação, perfis, autorização, minimização, retenção, backup, auditoria e exclusão de dados pessoais.

**Critérios sugeridos para validação, não aprovados:** verificar entradas além da interface; testar acesso não autorizado e payload inválido; testar indisponibilidade de APIs; e verificar que credenciais e dados pessoais desnecessários não apareçam em código versionado, respostas ou logs. A estratégia e os testes concretos dependem de decisões coletivas e da Etapa 2.

## 6. Critérios de aceitação em nível de requisitos

Critérios abaixo são propostas de verificação; regras de negócio dependentes continuam pendentes.

| ID | Critério proposto | Estado |
| --- | --- | --- |
| AC-01 | Cada entidade aprovada terá requisitos de criar, consultar, atualizar e excluir documentados, incluindo validação e resultados esperados. | Confirmado em princípio; lista de entidades e regras pendentes. |
| AC-02 | O modelo aprovado terá no mínimo seis tabelas relacionais e chaves estrangeiras verificáveis. | Obrigatório; entidades e relações pendentes. |
| AC-03 | O levantamento documentará pelo menos quatro situações de uso de APIs com finalidade real e justificativa individual. | Quantidade obrigatória; catálogo pendente de grupo/professor. |
| AC-04 | Para compra e seus materiais, os campos, cardinalidades, atores, operações e tratamento de exceções serão aprovados antes da arquitetura/implementação. | Pendente de validação de domínio. |
| AC-05 | Para cotação, será especificado o uso da taxa, origem, instante de referência, persistência (se aplicável) e comportamento de falha. | Pendente. |
| AC-06 | Para CEP, serão especificados os cadastros atendidos, campos, confirmação/edição e comportamento de CEP inválido ou serviço indisponível. | Pendente. |
| AC-07 | Dependências com entidades compartilhadas e contratos entre módulos terão responsáveis/decisores identificados; decisões de módulos alheios não serão tomadas unilateralmente. | Pendente de validação do grupo. |
| AC-08 | Requisitos de segurança serão associados a dados/fluxos e critérios verificáveis, sem expor segredos ou confiar apenas em validação visual. | Obrigatoriedade confirmada; estratégia pendente. |
| AC-09 | Requisitos serão rastreáveis à fonte, ao responsável pela validação e ao estado confirmado/sugestão/pendente. | Critério de qualidade documental desta etapa. |

## 7. Perguntas para validação

### Aos integrantes

1. A divisão funcional informada está correta? Quem será responsável por entidades potencialmente compartilhadas como fornecedores e materiais, e quem coordenará a arquitetura e integração técnica?
2. Quais dados e operações serão comuns entre módulos? Há regras de acesso por perfil?
3. Quais contratos de integração deverão ser respeitados? Como serão revisadas e integradas contribuições sem sobrescrever trabalho alheio?
4. O grupo pretende manter, adaptar ou substituir as entidades demonstrativas `console`/`jogo`? Qual é o processo coletivo para decidir isso?
5. Há controle de estoque no escopo? Como ele se relaciona com compras?
6. Quais APIs reais o grupo propõe além de cotação e CEP? Quem as valida e como será demonstrada a finalidade de cada uma?
7. Qual será o serviço/canal de notificação e quem define consentimento, destinatários e tratamento de falhas?
8. Como será confirmada com o professor a diferença entre `willcotil` no enunciado e o convite enviado a `willunicamp`, e como serão comprovados os commits próprios identificáveis de todos? Quem administra o repositório?
9. Para o backup/histórico de clientes, o que “backup” significa funcionalmente e quais dados/eventos precisam ser preservados ou restaurados?

### Ao professor

1. As APIs de cotação e CEP contam como duas situações distintas? Quais evidências demonstram “finalidade real e justificável”?
2. “CRUD completo para todas as entidades” inclui entidades de apoio, itens de compra, histórico e registros de cotação? Como tratar exclusão quando houver dependências?
3. Há requisitos específicos de teste, documentação, demonstração, privacidade ou apresentação além dos registrados?
4. Há restrições a provedores externos, serviços de mensagem ou armazenamento de dados pessoais?
5. Que critérios serão usados para avaliar o requisito de seis tabelas relacionadas por chaves estrangeiras?

### Ao responsável pelos módulos priorizados

1. Quais dados mínimos devem ser capturados em compra, item e material?
2. Compra aceita múltiplos materiais? Existe estoque, fornecedor e/ou pagamento no escopo?
3. Qual uso concreto será feito da cotação e qual convenção de taxa deve ser considerada?
4. A cotação aplicada à compra deve ser preservada como dado histórico?
5. Em quais cadastros será usada a busca por CEP e o preenchimento será sempre confirmável/editável?

## 8. Registro de decisões e pendências

### Decisões confirmadas

- O projeto é coletivo e a arquitetura deve ser alinhada pelo grupo.
- `SergioWilliam2209` é a conta GitHub do usuário e responsável por compras com materiais/cotação e consulta de endereço por CEP.
- `willunicamp` é a conta do professor para a qual foi enviado convite para acompanhar o repositório; não há confirmação de que o convite foi aceito.
- O enunciado original menciona `willcotil`; a confirmação de que o convite enviado a `willunicamp` atende ao requisito do professor permanece pendente.
- Os critérios obrigatórios da seção 2 devem ser considerados.
- Esta etapa está autorizada para levantamento e documentação exclusivamente em `docs/`.
- Não há autorização para alterações de implementação/configuração/SQL, commits, push, mudanças remotas ou início da Etapa 2.

### Pendências

- Regras de negócio e campos dos três módulos priorizados.
- Modelo conceitual compartilhado e propriedade das entidades.
- Contrato de integração da consulta CEP aos formulários de clientes e funcionários.
- Vínculo de procedimentos com clientes e dados necessários às notificações; definição do escopo de backup/histórico e sua integração com alterações de clientes/procedimentos.
- Responsáveis técnicos por arquitetura compartilhada, migração TypeScript, Electron, MySQL e integração.
- Catálogo e responsáveis pelas quatro situações de API.
- Serviço e regras da notificação de procedimento.
- Perfis, permissões e políticas de privacidade.
- Estratégias concretas para validação confiável, autorização, credenciais, logs, retenção, backup e auditoria.
- Respostas do grupo e do professor às perguntas acima.
- Confirmação do professor de que a diferença entre `willcotil` (enunciado) e `willunicamp` (convite observado) atende ao requisito.
- Contratos e decisões arquiteturais, reservados à Etapa 2 após aprovação.

### Histórico de aprovação

- Etapa 1 — aprovada pelo usuário para levantamento e documentação em `docs/`.
- Etapa 2 — não iniciada; depende de aprovação explícita separada.
