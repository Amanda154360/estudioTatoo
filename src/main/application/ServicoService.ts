import type {
  AtualizacaoServico,
  DadosServico,
  FiltroServicos,
  Servico as ServicoDto,
} from '../../shared/contracts/servico';
import { Servico } from '../domain/entities/Servico';
import { ServicoRepository } from '../infra/repositories/ServicoRepository';

export class ServicoService {
  constructor(private readonly repositorio: ServicoRepository = new ServicoRepository()) {}

  async listar(filtro: FiltroServicos): Promise<ServicoDto[]> {
    return this.repositorio.listar(Servico.filtroPadrao(filtro));
  }

  async buscar(id: number): Promise<ServicoDto | null> {
    return this.repositorio.buscarPorId(id);
  }

  async criar(dados: DadosServico): Promise<ServicoDto> {
    const dominio = Servico.novo(dados);
    const id = await this.repositorio.cadastrar(Servico.dadosDe(dominio.toDto()));
    return this.recarregar(id, 'cadastrado');
  }

  async atualizar(dados: AtualizacaoServico): Promise<ServicoDto> {
    const existente = await this.repositorio.buscarPorId(dados.id);
    if (!existente) {
      throw new Error('Procedimento não encontrado.');
    }

    const dominio = Servico.novo(dados);
    const linhas = await this.repositorio.atualizar(dados.id, Servico.dadosDe(dominio.toDto()));

    // ROW_COUNT() = 0 também ocorre quando nada mudou; confirma a existência antes de falhar.
    if (linhas === 0 && !(await this.repositorio.buscarPorId(dados.id))) {
      throw new Error('Procedimento não encontrado.');
    }

    return this.recarregar(dados.id, 'atualizado');
  }

  async excluir(id: number): Promise<void> {
    const existente = await this.repositorio.buscarPorId(id);
    if (!existente) {
      throw new Error('Procedimento não encontrado.');
    }

    const dominio = Servico.reconstituir(existente);
    if (!dominio.podeSerExcluido()) {
      throw new Error('Este procedimento já possui agendamentos. Desative-o em vez de excluir.');
    }

    const linhas = await this.repositorio.excluir(id);
    if (linhas === 0) {
      throw new Error('Procedimento não encontrado.');
    }
  }

  private async recarregar(id: number, acao: string): Promise<ServicoDto> {
    const atualizado = await this.repositorio.buscarPorId(id);
    if (!atualizado) {
      throw new Error(`Não foi possível recarregar o procedimento ${acao}.`);
    }
    return atualizado;
  }
}
