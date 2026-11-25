import type {
  AtualizacaoServico,
  DadosServico,
  FiltroServicos,
  Servico,
} from './servico';
import type {
  FiltroLembretes,
  Lembrete,
  ResultadoEnvioLembretes,
} from './lembrete';

/** Contrato único entre o processo principal e o renderer. */
export const CANAIS = {
  servicoListar: 'servico:listar',
  servicoBuscar: 'servico:buscar',
  servicoCriar: 'servico:criar',
  servicoAtualizar: 'servico:atualizar',
  servicoExcluir: 'servico:excluir',

  lembreteListar: 'lembrete:listar',
  lembreteGerarPendentes: 'lembrete:gerarPendentes',
  lembreteEnviarPendentes: 'lembrete:enviarPendentes',
  lembreteReprocessar: 'lembrete:reprocessar',
  lembreteCancelar: 'lembrete:cancelar',
  lembreteExcluir: 'lembrete:excluir',
  lembreteCriarManual: 'lembrete:criarManual',
} as const;

export type NomeCanal = (typeof CANAIS)[keyof typeof CANAIS];

export interface ApiEstudio {
  // Clientes (legado em JS — tipagem fina na próxima fase)
  criarCliente(dados: unknown): Promise<unknown>;
  listarClientes(filtro?: string): Promise<unknown>;
  atualizarCliente(dados: unknown): Promise<unknown>;
  excluirCliente(id: number): Promise<unknown>;
  buscarClientesPorCep(cep: string): Promise<unknown>;
  abrirNovoCliente(): void;
  abrirEdicaoCliente(cliente: unknown): void;
  aoReceberClienteParaEditar(callback: (cliente: unknown) => void): void;

  // Profissionais (legado em JS)
  criarProfissional(dados: unknown): Promise<unknown>;
  listarProfissionais(especialidade?: string, apenasAtivos?: number): Promise<unknown>;
  atualizarProfissional(dados: unknown): Promise<unknown>;
  excluirProfissional(id: number): Promise<unknown>;
  abrirNovoProfissional(): void;
  abrirEdicaoProfissional(profissional: unknown): void;
  aoReceberProfissionalParaEditar(callback: (profissional: unknown) => void): void;

  // CEP (legado em JS)
  buscarCepSql(cep: string): Promise<unknown>;

  // Procedimentos do estúdio
  listarServicos(filtro: FiltroServicos): Promise<Servico[]>;
  buscarServico(id: number): Promise<Servico | null>;
  criarServico(dados: DadosServico): Promise<Servico>;
  atualizarServico(dados: AtualizacaoServico): Promise<Servico>;
  excluirServico(id: number): Promise<void>;

  // Lembretes de atendimento (24h antes)
  listarLembretes(filtro: FiltroLembretes): Promise<Lembrete[]>;
  gerarLembretesPendentes(): Promise<number>;
  enviarLembretesPendentes(): Promise<ResultadoEnvioLembretes>;
  reprocessarLembrete(id: number): Promise<void>;
  cancelarLembrete(id: number): Promise<void>;
  excluirLembrete(id: number): Promise<void>;
  criarLembreteManual(agendamentoId: number): Promise<Lembrete>;

  // Sistema
  aoRecarregar(callback: () => void): void;
}
