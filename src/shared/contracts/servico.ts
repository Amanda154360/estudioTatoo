export const CATEGORIAS_SERVICO = ['Tatuagem', 'Piercing', 'Estética'] as const;
export type CategoriaServico = (typeof CATEGORIAS_SERVICO)[number];

export interface Servico {
  id: number;
  nome: string;
  categoria: CategoriaServico;
  preco_base: number;
  duracao_minutos: number;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
  agendamentos_vinculados: number;
}

export interface DadosServico {
  nome: string;
  categoria: CategoriaServico;
  preco_base: number;
  duracao_minutos: number;
  descricao: string | null;
  ativo: boolean;
}

export interface AtualizacaoServico extends DadosServico {
  id: number;
}

export interface FiltroServicos {
  termo?: string;
  categoria?: CategoriaServico | '';
  apenasAtivos?: boolean;
}
