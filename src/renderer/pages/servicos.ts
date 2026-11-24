import type { CategoriaServico, DadosServico, Servico } from '../../shared/contracts/servico';
import {
  criarBotao,
  criarCelula,
  exigirElemento,
  formatarDuracao,
  formatarMoeda,
  mensagemDeErro,
  mostrarAviso,
} from '../components/dom';

let servicos: Servico[] = [];
let idEmEdicao: number | null = null;

const corpoTabela = exigirElemento<HTMLTableSectionElement>('#corpoTabela');
const contador = exigirElemento<HTMLSpanElement>('#contador');
const campoBusca = exigirElemento<HTMLInputElement>('#campoBusca');
const filtroCategoria = exigirElemento<HTMLSelectElement>('#filtroCategoria');
const checkApenasAtivos = exigirElemento<HTMLInputElement>('#checkApenasAtivos');
const form = exigirElemento<HTMLFormElement>('#formServico');
const modalElemento = exigirElemento<HTMLDivElement>('#modalServico');
const tituloModal = exigirElemento<HTMLHeadingElement>('#tituloModal');
const erroFormulario = exigirElemento<HTMLDivElement>('#erroFormulario');
const btnSalvar = exigirElemento<HTMLButtonElement>('#btnSalvar');

const modal = new window.bootstrap.Modal(modalElemento);

function categoriaDoFiltro(): CategoriaServico | '' {
  return filtroCategoria.value as CategoriaServico | '';
}

async function carregar(): Promise<void> {
  try {
    servicos = await window.api.listarServicos({
      termo: campoBusca.value.trim(),
      categoria: categoriaDoFiltro(),
      apenasAtivos: checkApenasAtivos.checked,
    });
    renderizar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível carregar os procedimentos.'), 'erro');
  }
}

function renderizar(): void {
  corpoTabela.replaceChildren();
  contador.textContent = `${servicos.length} procedimento(s)`;

  if (servicos.length === 0) {
    const linha = document.createElement('tr');
    const celula = criarCelula('Nenhum procedimento encontrado.', 'text-center text-muted');
    celula.colSpan = 6;
    linha.append(celula);
    corpoTabela.append(linha);
    return;
  }

  for (const servico of servicos) {
    const linha = document.createElement('tr');
    linha.append(criarCelula(servico.nome));
    linha.append(criarCelula(servico.categoria));
    linha.append(criarCelula(formatarMoeda(servico.preco_base)));
    linha.append(criarCelula(formatarDuracao(servico.duracao_minutos)));
    linha.append(criarStatus(servico));
    linha.append(criarAcoes(servico));
    corpoTabela.append(linha);
  }
}

function criarStatus(servico: Servico): HTMLTableCellElement {
  const celula = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `badge ${servico.ativo ? 'bg-success' : 'bg-secondary'}`;
  badge.textContent = servico.ativo ? 'Ativo' : 'Inativo';
  celula.append(badge);
  return celula;
}

function criarAcoes(servico: Servico): HTMLTableCellElement {
  const celula = document.createElement('td');
  celula.className = 'text-center';

  const grupo = document.createElement('div');
  grupo.className = 'btn-group btn-group-sm';

  grupo.append(
    criarBotao('Editar', 'btn btn-primary', () => abrirFormulario(servico)),
    criarBotao(
      servico.ativo ? 'Desativar' : 'Ativar',
      'btn btn-outline-secondary',
      () => void alternarAtivo(servico),
    ),
    criarBotao('Excluir', 'btn btn-danger', () => void excluir(servico)),
  );

  celula.append(grupo);
  return celula;
}

function abrirFormulario(servico: Servico | null): void {
  idEmEdicao = servico ? servico.id : null;
  tituloModal.textContent = servico ? 'Editar procedimento' : 'Novo procedimento';
  erroFormulario.classList.add('d-none');
  erroFormulario.textContent = '';

  exigirElemento<HTMLInputElement>('#campoId').value = servico ? String(servico.id) : '';
  exigirElemento<HTMLInputElement>('#campoNome').value = servico?.nome ?? '';
  exigirElemento<HTMLSelectElement>('#campoCategoria').value = servico?.categoria ?? 'Tatuagem';
  exigirElemento<HTMLInputElement>('#campoPreco').value = servico
    ? servico.preco_base.toFixed(2)
    : '';
  exigirElemento<HTMLInputElement>('#campoDuracao').value = servico
    ? String(servico.duracao_minutos)
    : '60';
  exigirElemento<HTMLTextAreaElement>('#campoDescricao').value = servico?.descricao ?? '';
  exigirElemento<HTMLInputElement>('#campoAtivo').checked = servico ? servico.ativo : true;

  modal.show();
}

function dadosDoFormulario(): DadosServico {
  return {
    nome: exigirElemento<HTMLInputElement>('#campoNome').value,
    categoria: exigirElemento<HTMLSelectElement>('#campoCategoria').value as CategoriaServico,
    preco_base: Number(exigirElemento<HTMLInputElement>('#campoPreco').value),
    duracao_minutos: Number(exigirElemento<HTMLInputElement>('#campoDuracao').value),
    descricao: exigirElemento<HTMLTextAreaElement>('#campoDescricao').value,
    ativo: exigirElemento<HTMLInputElement>('#campoAtivo').checked,
  };
}

function dadosDe(servico: Servico): DadosServico {
  return {
    nome: servico.nome,
    categoria: servico.categoria,
    preco_base: servico.preco_base,
    duracao_minutos: servico.duracao_minutos,
    descricao: servico.descricao,
    ativo: servico.ativo,
  };
}

async function alternarAtivo(servico: Servico): Promise<void> {
  try {
    await window.api.atualizarServico({ id: servico.id, ...dadosDe(servico), ativo: !servico.ativo });
    mostrarAviso(
      `Procedimento ${servico.ativo ? 'desativado' : 'ativado'} com sucesso.`,
      'sucesso',
    );
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível alterar o status do procedimento.'), 'erro');
  }
}

async function excluir(servico: Servico): Promise<void> {
  const confirmado = window.confirm(
    `Excluir o procedimento "${servico.nome}"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmado) return;

  try {
    await window.api.excluirServico(servico.id);
    mostrarAviso('Procedimento excluído com sucesso.', 'sucesso');
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível excluir o procedimento.'), 'erro');
  }
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  erroFormulario.classList.add('d-none');
  btnSalvar.disabled = true;

  try {
    const dados = dadosDoFormulario();

    if (idEmEdicao === null) {
      await window.api.criarServico(dados);
      mostrarAviso('Procedimento cadastrado com sucesso.', 'sucesso');
    } else {
      await window.api.atualizarServico({ ...dados, id: idEmEdicao });
      mostrarAviso('Procedimento atualizado com sucesso.', 'sucesso');
    }

    modal.hide();
    await carregar();
  } catch (erro) {
    erroFormulario.textContent = mensagemDeErro(erro, 'Não foi possível salvar o procedimento.');
    erroFormulario.classList.remove('d-none');
  } finally {
    btnSalvar.disabled = false;
  }
});

exigirElemento<HTMLButtonElement>('#btnNovo').addEventListener('click', () => abrirFormulario(null));
exigirElemento<HTMLButtonElement>('#btnAtualizar').addEventListener('click', () => void carregar());

campoBusca.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') {
    evento.preventDefault();
    void carregar();
  }
});

filtroCategoria.addEventListener('change', () => void carregar());
checkApenasAtivos.addEventListener('change', () => void carregar());

void carregar();
