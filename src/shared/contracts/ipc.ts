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
import type {
  CriarMaterial,
  FiltroMateriais,
  Material,
  AtualizarMaterial,
} from './material';
import type {
  AtualizarCompra,
  Compra,
  CompraDetalhada,
  CriarCompra,
  FiltroCompras,
} from './compra';
import type {
  ExchangeRateSide,
  ExchangeRateQuote,
} from '../../../SergioWilliam2209/src/modules/exchange-rates/contracts/exchange-rate.contracts';

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

  materialListar: 'material:listar',
  materialBuscar: 'material:buscar',
  materialCriar: 'material:criar',
  materialAtualizar: 'material:atualizar',
  materialDesativar: 'material:desativar',

  compraListar: 'compra:listar',
  compraBuscar: 'compra:buscar',
  compraCriar: 'compra:criar',
  compraAtualizar: 'compra:atualizar',
  cotacaoDolarConsultar: 'cotacao:dolar:consultar',
  cepConsultarEndereco: 'cep:consultarEndereco',
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

  // Materiais
  listarMateriais(filtro: FiltroMateriais): Promise<readonly Material[]>;
  buscarMaterial(id: number): Promise<Material | null>;
  criarMaterial(dados: CriarMaterial): Promise<Material>;
  atualizarMaterial(dados: AtualizarMaterial): Promise<Material | null>;
  desativarMaterial(id: number): Promise<boolean>;

  // Compras (exclusão e remoção de itens ainda não são suportadas).
  listarCompras(filtro: FiltroCompras): Promise<readonly CompraDetalhada[]>;
  buscarCompra(id: number): Promise<CompraDetalhada | null>;
  criarCompra(dados: CriarCompra): Promise<Compra>;
  atualizarCompra(dados: AtualizarCompra): Promise<Compra | null>;
  consultarCotacaoDolar(lado: ExchangeRateSide): Promise<ExchangeRateQuoteResult>;

  // Sistema
  aoRecarregar(callback: () => void): void;
}

export type ExchangeRateQuoteResult =
  | { readonly ok: true; readonly value: ExchangeRateQuote }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } };
