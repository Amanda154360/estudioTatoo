import type { Material } from '../../shared/contracts/material';
import {
  criarBotao,
  criarCelula,
  exigirElemento,
  mensagemDeErro,
  mostrarAviso,
} from '../components/dom';

let materiais: readonly Material[] = [];
let idEmEdicao: number | null = null;
const corpoTabela = exigirElemento<HTMLTableSectionElement>('#corpoTabela');
const contador = exigirElemento<HTMLSpanElement>('#contador');
const campoBusca = exigirElemento<HTMLInputElement>('#campoBusca');
const form = exigirElemento<HTMLFormElement>('#formMaterial');
const modal = new window.bootstrap.Modal(exigirElemento<HTMLDivElement>('#modalMaterial'));
const btnSalvar = exigirElemento<HTMLButtonElement>('#btnSalvar');
const erroFormulario = exigirElemento<HTMLDivElement>('#erroFormulario');

async function carregar(): Promise<void> {
  try {
    materiais = await window.api.listarMateriais({ search: campoBusca.value.trim() });
    renderizar();
  } catch (erro) {
    materiais = [];
    renderizar();
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível carregar os materiais.'), 'erro');
  }
}

function renderizar(): void {
  corpoTabela.replaceChildren();
  contador.textContent = String(materiais.length);
  if (materiais.length === 0) {
    const linha = document.createElement('tr');
    const celula = criarCelula('Nenhum material ativo encontrado.', 'text-center text-muted');
    celula.colSpan = 4;
    linha.append(celula);
    corpoTabela.append(linha);
    return;
  }

  for (const material of materiais) {
    const linha = document.createElement('tr');
    linha.append(criarCelula(material.name), criarCelula(material.unit ?? '—'));
    linha.append(criarCelula(material.description ?? '—'));
    const acoes = document.createElement('td');
    acoes.className = 'text-end';
    const grupo = document.createElement('div');
    grupo.className = 'btn-group btn-group-sm';
    grupo.append(
      criarBotao('Consultar', 'btn btn-outline-secondary', () => void consultar(material.id)),
      criarBotao('Editar', 'btn btn-primary', () => void editar(material.id)),
      criarBotao('Desativar', 'btn btn-outline-danger', () => void desativar(material)),
    );
    acoes.append(grupo);
    linha.append(acoes);
    corpoTabela.append(linha);
  }
}

async function consultar(id: number): Promise<void> {
  try {
    const material = await window.api.buscarMaterial(id);
    if (!material) {
      mostrarAviso('Material não encontrado.', 'erro');
      await carregar();
      return;
    }
    window.alert(
      `Nome: ${material.name}\nUnidade: ${material.unit ?? '—'}\nDescrição: ${material.description ?? '—'}`,
    );
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível consultar o material.'), 'erro');
  }
}

async function editar(id: number): Promise<void> {
  try {
    const material = await window.api.buscarMaterial(id);
    if (!material) {
      mostrarAviso('Material não encontrado.', 'erro');
      await carregar();
      return;
    }
    abrirFormulario(material);
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível consultar o material.'), 'erro');
  }
}

function abrirFormulario(material: Material | null): void {
  idEmEdicao = material?.id ?? null;
  exigirElemento<HTMLHeadingElement>('#tituloModal').textContent =
    material ? 'Editar material' : 'Novo material';
  exigirElemento<HTMLInputElement>('#campoNome').value = material?.name ?? '';
  exigirElemento<HTMLInputElement>('#campoUnidade').value = material?.unit ?? '';
  exigirElemento<HTMLTextAreaElement>('#campoDescricao').value = material?.description ?? '';
  erroFormulario.textContent = '';
  erroFormulario.classList.add('d-none');
  modal.show();
}

async function desativar(material: Material): Promise<void> {
  if (!window.confirm(`Desativar "${material.name}"? O material deixa de aparecer na lista ativa.`)) {
    return;
  }
  try {
    await window.api.desativarMaterial(material.id);
    mostrarAviso('Material desativado. Os itens históricos de compras são preservados.', 'sucesso');
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível desativar o material.'), 'erro');
  }
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  btnSalvar.disabled = true;
  erroFormulario.classList.add('d-none');
  const dados = {
    name: exigirElemento<HTMLInputElement>('#campoNome').value,
    unit: exigirElemento<HTMLInputElement>('#campoUnidade').value,
    description: exigirElemento<HTMLTextAreaElement>('#campoDescricao').value,
  };
  try {
    if (idEmEdicao === null) {
      await window.api.criarMaterial(dados);
      mostrarAviso('Material cadastrado.', 'sucesso');
    } else {
      await window.api.atualizarMaterial({ id: idEmEdicao, ...dados });
      mostrarAviso('Material atualizado.', 'sucesso');
    }
    modal.hide();
    await carregar();
  } catch (erro) {
    erroFormulario.textContent = mensagemDeErro(erro, 'Não foi possível salvar o material.');
    erroFormulario.classList.remove('d-none');
  } finally {
    btnSalvar.disabled = false;
  }
});

exigirElemento<HTMLButtonElement>('#btnNovo').addEventListener('click', () => abrirFormulario(null));
exigirElemento<HTMLButtonElement>('#btnAtualizar').addEventListener('click', () => void carregar());
exigirElemento<HTMLButtonElement>('#btnBuscar').addEventListener('click', () => void carregar());
campoBusca.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') {
    evento.preventDefault();
    void carregar();
  }
});

void carregar();
