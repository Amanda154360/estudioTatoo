import type {
  CategoriaServico,
  DadosServico,
  FiltroServicos,
  Servico as ServicoDto,
} from '../../../shared/contracts/servico';

export class Servico {
  private constructor(private readonly dados: ServicoDto) {}

  static reconstituir(dados: ServicoDto): Servico {
    return new Servico({ ...dados, nome: dados.nome.trim() });
  }

  static novo(dados: DadosServico): Servico {
    const registro: ServicoDto = {
      id: 0,
      nome: dados.nome.trim(),
      categoria: dados.categoria,
      preco_base: dados.preco_base,
      duracao_minutos: dados.duracao_minutos,
      descricao: dados.descricao?.trim() ? dados.descricao.trim() : null,
      ativo: dados.ativo,
      criado_em: new Date().toISOString(),
      agendamentos_vinculados: 0,
    };

    Servico.garantirInvariantes(registro);
    return new Servico(registro);
  }

  private static garantirInvariantes(dados: ServicoDto): void {
    if (dados.nome.length < 3) {
      throw new Error('O nome do procedimento precisa ter ao menos 3 caracteres.');
    }
    if (!Number.isFinite(dados.preco_base) || dados.preco_base < 0) {
      throw new Error('O preço do procedimento não pode ser negativo.');
    }
    if (
      !Number.isInteger(dados.duracao_minutos) ||
      dados.duracao_minutos < 5 ||
      dados.duracao_minutos > 1440
    ) {
      throw new Error('A duração deve estar entre 5 e 1440 minutos.');
    }
  }

  get id(): number {
    return this.dados.id;
  }

  get nome(): string {
    return this.dados.nome;
  }

  get categoria(): CategoriaServico {
    return this.dados.categoria;
  }

  get precoBase(): number {
    return this.dados.preco_base;
  }

  get duracaoMinutos(): number {
    return this.dados.duracao_minutos;
  }

  get descricao(): string | null {
    return this.dados.descricao;
  }

  get estaAtivo(): boolean {
    return this.dados.ativo;
  }

  get agendamentosVinculados(): number {
    return this.dados.agendamentos_vinculados;
  }

  get precoFormatado(): string {
    return this.precoBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /** Regra de negócio: procedimento já usado na agenda não é excluído, é desativado. */
  podeSerExcluido(): boolean {
    return this.agendamentosVinculados === 0;
  }

  toDto(): ServicoDto {
    return { ...this.dados };
  }

  static dadosDe(dados: ServicoDto): DadosServico {
    return {
      nome: dados.nome,
      categoria: dados.categoria,
      preco_base: dados.preco_base,
      duracao_minutos: dados.duracao_minutos,
      descricao: dados.descricao,
      ativo: dados.ativo,
    };
  }

  static filtroPadrao(filtro: FiltroServicos): Required<FiltroServicos> {
    return {
      termo: filtro.termo ?? '',
      categoria: filtro.categoria ?? '',
      apenasAtivos: filtro.apenasAtivos ?? false,
    };
  }
}
