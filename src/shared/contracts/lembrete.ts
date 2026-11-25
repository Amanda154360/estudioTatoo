export const STATUS_LEMBRETE = ['Pendente', 'Enviado', 'Falhou', 'Cancelado'] as const;
export type StatusLembrete = (typeof STATUS_LEMBRETE)[number];

export const CANAIS_LEMBRETE = ['email'] as const;
export type CanalLembrete = (typeof CANAIS_LEMBRETE)[number];

export interface Lembrete {
  id: number;
  agendamento_id: number;
  canal: CanalLembrete;
  destinatario: string;
  enviar_em: string;
  status: StatusLembrete;
  tentativas: number;
  enviado_em: string | null;
  erro: string | null;
  data_atendimento: string;
  status_agendamento: string;
  cliente_nome: string;
  servico_nome: string | null;
  profissional_nome: string;
}

export interface FiltroLembretes {
  status?: StatusLembrete | '';
  limite?: number;
}

export interface DetalheEnvio {
  id: number;
  status: StatusLembrete;
  erro?: string;
  previewUrl?: string;
}

export interface ResultadoEnvioLembretes {
  total: number;
  enviados: number;
  falhas: number;
  detalhes: DetalheEnvio[];
}
