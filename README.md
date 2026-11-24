<<<<<<< HEAD
# Estúdio Tattoo — Procedimentos e Lembretes

Sistema desktop (Electron + TypeScript + MySQL 8.0) para gestão de um estúdio de
tatuagem, piercing e estética.

Este documento cobre a parte entregue nesta etapa: **cadastro dos procedimentos
do estúdio**, **lembrete de atendimento 1 dia antes por e-mail** e as **decisões
de segurança** que sustentam as duas.

## Como rodar

```bash
npm install
copy .env.example .env     # Windows (ou: cp .env.example .env)
npm run db:init            # cria banco, tabelas, procedures, triggers e seeds
npm start                  # build (esbuild) + Electron
```

- `npm run typecheck` — checagem estrita de tipos (`strict: true`, sem `any`).
- `npm run db:init` — aplica os módulos `sql/modules/01..12` na ordem.
- Menu **Estúdio** → *Procedimentos do Estúdio* (`Ctrl+E`) e *Lembretes de
  Atendimento* (`Ctrl+L`).

### E-mail: teste x produção

A conta do Gemini **não envia e-mail** (é API de LLM). Por isso o envio tem dois
provedores intercambiáveis, escolhidos automaticamente:

| Situação | Provedor | Configuração |
|---|---|---|
| `SMTP_HOST` vazio | **Ethereal** (caixa de teste) | nenhuma; gera link de visualização |
| `SMTP_HOST` preenchido | **SMTP real** | `SMTP_*` e `EMAIL_REMETENTE` no `.env` |

O Ethereal não envia e-mail de verdade: ele devolve uma URL para abrir a mensagem
no navegador. É o modo usado na demonstração, sem gastar cota de nada.

## Arquitetura

```
src/
  shared/                  contrato único main <-> renderer
    contracts/             DTOs e nomes de canais IPC
    validation/            schemas zod (entrada e saída do banco)
  main/
    main.ts                bootstrap do Electron
    preload.ts             ponte segura (contextBridge)
    domain/entities/       regras de negócio em classes (Servico, Lembrete)
    application/           orquestração (ServicoService, LembreteService)
    infra/
      database/            executor de procedures + tradução de erros
      repositories/        acesso a dados (prepared statements)
      email/               provedores + template do e-mail
      jobs/                agendador do lembrete (a cada 5 min)
    ipc/                   canais finos: valida -> executa
    windows/ menu/         janelas e menu
  renderer/
    pages/                 telas (HTML + controller .ts)
    components/            utilitários de DOM
    js/, css/              telas legadas (dívida técnica em migração)
sql/modules/               schema e rotinas, na ordem 01..12
```

Fluxo de uma chamada: **renderer → preload → canal IPC → zod → service →
classe de domínio → repository → stored procedure**.

## Banco de dados (relacionamentos reais)

| Tabela | Papel | FK |
|---|---|---|
| `tabela_ceps` | base de CEP | — |
| `clientes` | clientes + anamnese | `cep` → `tabela_ceps` |
| `profissionais` | artistas/funcionários | — |
| `servicos` | **procedimentos do estúdio** | — |
| `agendamentos` | agenda | cliente, profissional, serviço |
| `lembretes` | aviso 24h antes | `agendamento_id` → `agendamentos` (CASCADE) |

`lembretes` tem `UNIQUE(agendamento_id, canal)`: impede e-mail duplicado mesmo
se o job rodar várias vezes. `enviar_em = data_hora - 1 dia`.

## Regras de negócio implementadas em classe (POO)

- `Servico` — invariantes (nome, preço não negativo, duração 5..1440) e
  `podeSerExcluido()`: procedimento com agendamento é **desativado**, não apagado.
- `Lembrete` — `MAX_TENTATIVAS = 3`, `podeReprocessar()` e mascaramento de e-mail
  para log.
- `LembreteService` — gera pendentes, envia em lote, registra sucesso/falha e
  nunca deixa o envio derrubar o ciclo.
- `LembreteScheduler` — roda no processo principal, com trava para não sobrepor
  ciclos.

## Segurança — decisões e justificativas

| Decisão | Por quê |
|---|---|
| zod no processo principal | O renderer é tratado como não confiável; validação no main impede payload forjado via DevTools. |
| Prepared statements (`CALL sp_x(?)`) | Elimina injeção de SQL; nenhuma procedure concatena entrada do usuário. |
| `multipleStatements: false` | Uma injeção bem-sucedida não consegue empilhar um `DROP`. |
| Erros do MySQL traduzidos (`ErroBanco`) | Não vaza nome de tabela, SQL ou stack para a tela. |
| Origem do IPC validada | Só aceita chamada de `file://.../renderer/...`; bloqueia frame/iframe malicioso. |
| `contextIsolation`, `sandbox`, `nodeIntegration: false` | Renderer não tem acesso a Node nem ao `require`. |
| Navegação externa bloqueada | `setWindowOpenHandler` + `will-navigate` impedem sair do app. |
| CSP nas telas novas | Sem `unsafe-inline` para script; só arquivos locais. |
| Sem `innerHTML` nas telas novas | Conteúdo do banco é inserido com `textContent` (anti-XSS). |
| Escape de HTML no e-mail | Nome de cliente/procedimento não injeta marcação no corpo do e-mail. |
| Limite de tentativas e `UNIQUE` | Evita spam de e-mail e duplicidade em caso de reprocessamento. |
| E-mail mascarado em log | Dado pessoal não fica exposto no console. |
| Validação também no banco (triggers/procedures) | Protege contra alteração direta no MySQL, fora do app. |

Ponto de integração pendente (dono: módulo de usuários): autorização por papel.
Os canais novos já passam por um único ponto (`SegurancaIpc`), onde a checagem de
permissão será plugada sem alterar as telas.

## O que ainda é JS (dívida assumida)

Para não reescrever tela que já funciona sem poder testá-la, esta etapa manteve:

- `src/renderer/js/*.js` (telas antigas de cliente/profissional/principal);
- `src/main/ipc/{cliente,profissional,cep}Ipc.js` e `src/main/repositories/*.js`;
- `src/main/config/database.js` (configuração, não regra de negócio).

Todo código **novo** é TypeScript estrito. A próxima fase porta esses arquivos
sem mudar comportamento.

## Testes rápidos

1. `npm run db:init` sem erro.
2. Abrir *Procedimentos*, criar/editar/desativar/excluir um procedimento.
3. Tentar excluir um procedimento com agendamento → mensagem orienta desativar.
4. Abrir *Lembretes* → **Gerar pendentes** deve criar 1 lembrete (seed de 20h).
5. **Enviar pendentes** → status vira `Enviado` e aparece o link do Ethereal.
6. `SELECT * FROM vw_lembretes_detalhados;` confere o vínculo com cliente,
   serviço, profissional e agendamento.
=======
# estudioTatoo
>>>>>>> 6d690dcc6fbaac243d033c792008c6f897130739
