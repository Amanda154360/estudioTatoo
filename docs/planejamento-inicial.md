# Planejamento inicial

## Objetivo

Organizar o desenvolvimento do projeto DAD sem iniciar a implementação. As etapas abaixo são propostas; cada uma depende de apresentação resumida e aprovação explícita do usuário antes de começar.

## Critérios obrigatórios já informados

- Aplicação desktop integralmente em Electron. Toda a lógica da aplicação deve utilizar TypeScript, com código modularizado em classes e aplicação dos princípios de orientação a objetos.
- Banco de dados relacional com pelo menos seis tabelas interligadas por chaves estrangeiras.
- CRUD completo (criar, consultar, atualizar e excluir) para todas as entidades aprovadas.
- Segurança como requisito obrigatório, incluindo proteção de senhas, validação de entradas, controle de acesso e proteção de dados sensíveis. As estratégias concretas ainda serão definidas.
- Pelo menos quatro situações distintas de consumo de APIs, cada uma com finalidade real e justificável.
- Entrega pelo GitHub, com o usuário `willcotil` adicionado como colaborador desde o início do repositório e commits próprios e identificáveis de todos os integrantes.
- Funcionalidades previstas: cadastro de clientes; cadastro de funcionários; gerenciamento de procedimentos; histórico dos clientes; cadastro de compras com materiais e cotação do dólar; busca de endereço por CEP; envio de mensagem um dia antes da data do procedimento.

### Responsabilidades no grupo

| Integrante | Funcionalidades atribuídas |
| --- | --- |
| Crispin | Cadastro de clientes e cadastro de funcionários. |
| Amanda Sousa | Tabela/gerenciamento de procedimentos e envio de mensagens um dia antes do procedimento. |
| `SergioWilliam2209` | Cadastro de compras com materiais e cotação do dólar; busca de endereços por CEP. |
| Amanda Valente | Backup de clientes (histórico); significado e escopo exatos de “backup” permanecem a esclarecer. |

A divisão acima registra responsabilidades funcionais informadas pelo grupo. Ela **não** define responsáveis por arquitetura compartilhada, migração para TypeScript, configuração do Electron, banco MySQL, contratos comuns ou integração. Essas atribuições técnicas dependem de alinhamento coletivo.

Dependências a coordenar: a consulta por CEP de `SergioWilliam2209` será integrada aos cadastros de clientes e funcionários de Crispin; procedimentos de Amanda Sousa dependem de associação com clientes e dados de contato; o histórico/backup de clientes de Amanda Valente pode depender de alterações de clientes e procedimentos. Campos, eventos, retenção, fluxo de notificações e contratos de integração continuam pendentes.

## Etapas propostas

| Etapa | Objetivo e entregáveis | Agentes participantes |
| --- | --- | --- |
| 1. Descoberta e requisitos | Levantar fluxos, entidades, campos, perfis, regras, notificações, APIs candidatas e dúvidas. Entregável: requisitos priorizados e critérios de aceitação. | Arquiteto, Domínio, Frontend, Backend, Banco de Dados, Segurança, QA |
| 2. Arquitetura e decisões | Comparar opções de persistência e estrutura Electron; definir limites Main/preload/Renderer, integrações, segurança e decisões documentadas. Entregáveis: arquitetura proposta e registros de decisão. | Arquiteto, Backend, Banco de Dados, Segurança, Frontend |
| 3. Fundação do projeto | Configurar estrutura TypeScript/Electron, ferramentas, convenções e estratégia de GitHub. Entregável: esqueleto executável, sem regras funcionais não aprovadas. | Arquiteto, Backend, Frontend, Segurança, QA |
| 4. Dados e CRUDs | Implementar modelo/migrações e CRUDs em incrementos pequenos, conforme ordem priorizada. Entregáveis: persistência e testes por entidade. | Banco de Dados, Backend, Domínio, QA, Segurança |
| 5. Fluxos de interface | Implementar telas e fluxos aprovados para cadastros, procedimentos, histórico e compras. Entregáveis: interfaces integradas e verificadas. | Frontend, Domínio, Backend, QA |
| 6. Notificações e APIs | Implementar notificações e no mínimo quatro integrações de API aprovadas, com finalidade, tratamento de falhas e configuração segura. | Backend, Frontend, Domínio, Segurança, QA |
| 7. Validação e entrega | Executar testes ponta a ponta, revisão de segurança, documentação e preparação da entrega GitHub. | QA, Segurança, todos os especialistas e Arquiteto |

## Pendências antes de definir requisitos

O levantamento de requisitos deverá esclarecer, sem presumir:

- Quais serão as quatro ou mais integrações de API e qual a finalidade real e justificável de cada uma.
- Qual serviço será utilizado para envio das mensagens de notificação um dia antes da data do procedimento e como será feito esse envio.
- Como funcionará o histórico dos clientes e quais informações e eventos serão registrados.
- Quais informações serão armazenadas nas compras e nos materiais.
- Como a cotação do dólar será utilizada e registrada, incluindo a origem e o momento de referência da cotação.
- Em quais cadastros será utilizada a consulta de endereço por CEP.
- Tipo de estabelecimento e procedimentos; dados necessários; perfis e permissões; regras de agenda; políticas de privacidade; APIs disponíveis e limites de uso; ambiente de execução e critérios de avaliação da disciplina.

## Aprovação e Git

Cada etapa deve ser apresentada individualmente com escopo e critérios de aceitação. A execução só começa após aprovação explícita daquela etapa. O planejamento do repositório deve incluir `willcotil` como colaborador desde o início e commits próprios e identificáveis de todos os integrantes, em incrementos pequenos e revisáveis. Criar ou configurar o repositório, adicionar colaboradores, efetuar commits ou publicar no GitHub depende de autorização explícita.
