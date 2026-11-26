import type { Material } from '../../shared/contracts/material';
import type {
  CompraDetalhada,
  CriarCompra,
  ItemCompraExistenteAtualizacao,
  ItemCompraInput,
  OperacaoItemCompraAtualizacao,
} from '../../shared/contracts/compra';
import type { ExchangeRateSide } from '../../../SergioWilliam2209/src/modules/exchange-rates/contracts/exchange-rate.contracts';
import {
  criarBotao,
  criarCelula,
  exigirElemento,
  mensagemDeErro,
  mostrarAviso,
} from '../components/dom';

interface ItemRascunho {
  readonly materialId: number;
  readonly materialName: string;
  readonly quantity: string;
  readonly amount: string;
}

interface ItemExistenteRascunho {
  readonly id: number;
  readonly materialName: string;
  readonly quantity: string;
  readonly amount: string;
}

let compras: readonly CompraDetalhada[] = [];
let materiais: readonly Material[] = [];
let itensNovos: ItemRascunho[] = [];
let itensExistentes: ItemExistenteRascunho[] = [];
let compraEmEdicao: CompraDetalhada | null = null;

const corpoTabela = exigirElemento<HTMLTableSectionElement>('#corpoTabela');
const form = exigirElemento<HTMLFormElement>('#formCompra');
const modal = new window.bootstrap.Modal(exigirElemento<HTMLDivElement>('#modalCompra'));
const erroFormulario = exigirElemento<HTMLDivElement>('#erroFormulario');
const listaItens = exigirElemento<HTMLUListElement>('#listaItensNovos');
const listaItensExistentes = exigirElemento<HTMLUListElement>('#listaItensExistentes');
const selectMaterial = exigirElemento<HTMLSelectElement>('#campoMaterial');
const btnSalvar = exigirElemento<HTMLButtonElement>('#btnSalvar');
const campoMoeda = exigirElemento<HTMLInputElement>('#campoMoeda');
const estadoCotacao = exigirElemento<HTMLDivElement>('#estadoCotacao');
const resultadoCotacao = exigirElemento<HTMLDivElement>('#resultadoCotacao');
const btnConsultarCotacao = exigirElemento<HTMLButtonElement>('#btnConsultarCotacao');

async function carregar(): Promise<void> {
  try {
    const filtro = {
      from: exigirElemento<HTMLInputElement>('#filtroDe').value || undefined,
      through: exigirElemento<HTMLInputElement>('#filtroAte').value || undefined,
    };
    compras = await window.api.listarCompras(filtro);
    renderizar();
  } catch (erro) {
    compras = [];
    renderizar();
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível consultar as compras.'), 'erro');
  }
}

async function carregarMateriais(): Promise<void> {
  materiais = await window.api.listarMateriais({ search: '' });
  selectMaterial.replaceChildren();
  for (const material of materiais) {
    const option = document.createElement('option');
    option.value = String(material.id);
    option.textContent = `${material.name} (${material.unit ?? 'unidade não informada'})`;
    selectMaterial.append(option);
  }
  exigirElemento<HTMLButtonElement>('#btnAdicionarItem').disabled = materiais.length === 0;
}

function renderizar(): void {
  corpoTabela.replaceChildren();
  if (compras.length === 0) {
    const linha = document.createElement('tr');
    const celula = criarCelula('Nenhuma compra encontrada.', 'text-center text-muted');
    celula.colSpan = 5;
    linha.append(celula);
    corpoTabela.append(linha);
    return;
  }

  for (const compra of compras) {
    const linha = document.createElement('tr');
    linha.append(
      criarCelula(compra.date ?? '—'),
      criarCelula(compra.currency ?? '—'),
      criarCelula(compra.notes ?? '—'),
    );
    const statusCell = criarCelula('');
    const badge = document.createElement('span');
    badge.className = `badge ${compra.status === 'CANCELADA' ? 'bg-secondary' : 'bg-success'}`;
    badge.textContent = compra.status;
    statusCell.append(badge);
    linha.append(statusCell);
    const acoes = document.createElement('td');
    acoes.className = 'text-end';
    const cancelada = compra.status === 'CANCELADA';
    acoes.append(criarBotao(
      cancelada ? 'Consultar' : 'Consultar / editar',
      'btn btn-sm btn-primary me-1',
      () => void abrirCompra(compra.id),
    ));
    if (!cancelada) {
      acoes.append(criarBotao(
        'Cancelar compra',
        'btn btn-sm btn-outline-danger',
        () => void cancelarCompra(compra.id),
      ));
    }
    linha.append(acoes);
    corpoTabela.append(linha);
  }
}

function novoItem(): void {
  const materialId = Number(selectMaterial.value);
  const material = materiais.find((item) => item.id === materialId);
  const quantity = exigirElemento<HTMLInputElement>('#campoQuantidade').value.trim();
  const amount = exigirElemento<HTMLInputElement>('#campoPreco').value.trim();
  if (!material || quantity === '' || amount === '') {
    mostrarAviso('Selecione um material e informe quantidade e preço unitário.', 'erro');
    return;
  }
  itensNovos = [...itensNovos, { materialId, materialName: material.name, quantity, amount }];
  exigirElemento<HTMLInputElement>('#campoQuantidade').value = '';
  exigirElemento<HTMLInputElement>('#campoPreco').value = '';
  renderizarItensNovos();
}

function renderizarItensNovos(): void {
  listaItens.replaceChildren();
  itensNovos.forEach((item, index) => {
    const linha = document.createElement('li');
    linha.className = 'list-group-item d-flex justify-content-between align-items-center';
    const descricao = document.createElement('span');
    descricao.textContent = `${item.materialName} — ${item.quantity} × ${item.amount} ${campoMoeda.value.toUpperCase()}`;
    linha.append(descricao);
    linha.append(criarBotao('Remover da lista', 'btn btn-sm btn-outline-danger', () => {
      itensNovos = itensNovos.filter((_, itemIndex) => itemIndex !== index);
      renderizarItensNovos();
    }));
    listaItens.append(linha);
  });
}

function renderizarItensExistentes(somenteLeitura: boolean): void {
  listaItensExistentes.replaceChildren();
  for (const item of itensExistentes) {
    const linha = document.createElement('li');
    linha.className = 'list-group-item';

    const nome = document.createElement('div');
    nome.className = 'fw-semibold mb-2';
    nome.textContent = `${item.materialName} (item #${item.id})`;
    linha.append(nome);

    const campos = document.createElement('div');
    campos.className = 'row g-2';
    campos.append(
      criarCampoItemExistente(item, 'quantity', 'Quantidade', 3, somenteLeitura),
      criarCampoItemExistente(item, 'amount', 'Preço unitário', 4, somenteLeitura),
    );
    linha.append(campos);
    listaItensExistentes.append(linha);
  }
}

function criarCampoItemExistente(
  item: ItemExistenteRascunho,
  campo: 'quantity' | 'amount',
  rotulo: string,
  casasDecimais: number,
  somenteLeitura: boolean,
): HTMLDivElement {
  const coluna = document.createElement('div');
  coluna.className = 'col-sm-6';
  const label = document.createElement('label');
  label.className = 'form-label small mb-1';
  label.textContent = rotulo;
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.className = 'form-control form-control-sm';
  input.value = campo === 'quantity' ? item.quantity : item.amount;
  input.disabled = somenteLeitura;
  input.dataset.itemId = String(item.id);
  input.dataset.itemField = campo;
  input.setAttribute('aria-label', `${rotulo} do item ${item.id}`);
  input.placeholder = `0.${'0'.repeat(casasDecimais)}`;
  label.htmlFor = `item-${item.id}-${campo}`;
  input.id = label.htmlFor;
  coluna.append(label, input);
  return coluna;
}

function abrirFormulario(compra: CompraDetalhada | null): void {
  compraEmEdicao = compra;
  const cancelada = compra?.status === 'CANCELADA';
  itensNovos = [];
  itensExistentes = (compra?.items ?? []).map((item) => ({
    id: item.id,
    materialName: item.materialNameSnapshot ?? `Material #${item.materialId}`,
    quantity: item.quantity,
    amount: item.unitPrice.amount,
  }));
  exigirElemento<HTMLHeadingElement>('#tituloModal').textContent =
    cancelada
      ? `Compra #${compra.id} — CANCELADA (consulta)`
      : compra ? `Compra #${compra.id} — atualização parcial` : 'Nova compra';
  const campoData = exigirElemento<HTMLInputElement>('#campoData');
  campoData.value = compra?.date ?? dataLocalHoje();
  campoData.disabled = cancelada;
  campoMoeda.value = compra?.currency ?? 'BRL';
  campoMoeda.disabled = compra !== null;
  const campoObservacoes = exigirElemento<HTMLTextAreaElement>('#campoObservacoes');
  campoObservacoes.value = compra?.notes ?? '';
  campoObservacoes.disabled = cancelada;
  const statusCompra = exigirElemento<HTMLDivElement>('#statusCompra');
  statusCompra.replaceChildren();
  if (compra) {
    const badge = document.createElement('span');
    badge.className = `badge ${cancelada ? 'bg-secondary' : 'bg-success'}`;
    badge.textContent = `Status: ${compra.status}`;
    statusCompra.append(badge);
  }
  const existentes = exigirElemento<HTMLDivElement>('#itensExistentes');
  if (itensExistentes.length > 0) {
    existentes.classList.remove('d-none');
  } else {
    existentes.classList.add('d-none');
  }
  renderizarItensExistentes(cancelada);
  exigirElemento<HTMLDivElement>('#areaAdicionarItens').classList.toggle('d-none', cancelada);
  btnSalvar.classList.toggle('d-none', cancelada);
  btnSalvar.disabled = cancelada;
  exigirElemento<HTMLInputElement>('#campoQuantidade').value = '';
  exigirElemento<HTMLInputElement>('#campoPreco').value = '';
  renderizarItensNovos();
  erroFormulario.classList.add('d-none');
  erroFormulario.textContent = '';
  modal.show();
}

function dataLocalHoje(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}

async function consultarCotacao(): Promise<void> {
  btnConsultarCotacao.disabled = true;
  resultadoCotacao.replaceChildren();
  estadoCotacao.textContent = 'Consultando o Banco Central...';
  try {
    const lados: readonly ExchangeRateSide[] = ['buy', 'sell'];
    const resultados = await Promise.all(
      lados.map((lado) => window.api.consultarCotacaoDolar(lado)),
    );
    for (let index = 0; index < resultados.length; index += 1) {
      const resultado = resultados[index]!;
      const linha = document.createElement('div');
      if (resultado.ok) {
        const quote = resultado.value;
        linha.textContent =
          `${lados[index] === 'buy' ? 'Compra' : 'Venda'}: R$ ${quote.rate} · ` +
          `data ${quote.effectiveDate} · origem ${quote.source}`;
      } else {
        linha.textContent =
          `${lados[index] === 'buy' ? 'Compra' : 'Venda'}: indisponível — ${resultado.error.message}`;
        linha.className = 'text-danger';
      }
      resultadoCotacao.append(linha);
    }
    estadoCotacao.textContent = 'Valores informativos; não alteram nem são armazenados na compra.';
  } catch {
    estadoCotacao.textContent = 'Não foi possível consultar a cotação. Verifique a conexão e tente novamente.';
    estadoCotacao.className = 'small text-danger';
  } finally {
    btnConsultarCotacao.disabled = false;
  }
}

async function abrirCompra(id: number): Promise<void> {
  try {
    const compra = await window.api.buscarCompra(id);
    if (!compra) {
      mostrarAviso('Compra não encontrada.', 'erro');
      await carregar();
      return;
    }
    if (compra.status === 'ATIVA') await carregarMateriais();
    abrirFormulario(compra);
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível consultar a compra.'), 'erro');
  }
}

async function cancelarCompra(id: number): Promise<void> {
  const confirmado = window.confirm(
    `Confirma o cancelamento lógico da compra #${id}? A compra e seus itens serão preservados.`,
  );
  if (!confirmado) return;

  try {
    await window.api.cancelarCompra(id);
    mostrarAviso(`Compra #${id} cancelada. O histórico e os itens foram preservados.`, 'sucesso');
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível cancelar a compra.'), 'erro');
  }
}

function montarItensNovos(): readonly ItemCompraInput[] {
  const currency = campoMoeda.value.trim().toUpperCase();
  return itensNovos.map((item) => ({
    materialId: item.materialId,
    quantity: item.quantity,
    unitPrice: { amount: item.amount, currency },
  }));
}

function montarOperacoesItens(): readonly OperacaoItemCompraAtualizacao[] {
  const existentes: readonly ItemCompraExistenteAtualizacao[] = itensExistentes.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unitPrice: { amount: item.amount },
  }));
  return [...existentes, ...montarItensNovos()];
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  btnSalvar.disabled = true;
  erroFormulario.classList.add('d-none');
  const date = exigirElemento<HTMLInputElement>('#campoData').value;
  const notes = exigirElemento<HTMLTextAreaElement>('#campoObservacoes').value;
  const itemsNovos = montarItensNovos();
  try {
    if (compraEmEdicao) {
      if (compraEmEdicao.status === 'CANCELADA') {
        throw new Error('Compras canceladas não podem ser alteradas.');
      }
      const items = montarOperacoesItens();
      await window.api.atualizarCompra({
        id: compraEmEdicao.id,
        date,
        notes,
        items,
      });
      mostrarAviso('Compra atualizada; itens existentes foram editados e os novos foram acrescentados.', 'sucesso');
    } else {
      if (itemsNovos.length === 0) {
        throw new Error('Adicione ao menos um item à compra.');
      }
      const dados = {
        date,
        currency: campoMoeda.value.trim().toUpperCase(),
        notes,
        items: itemsNovos,
      } satisfies CriarCompra;
      await window.api.criarCompra(dados);
      mostrarAviso('Compra cadastrada.', 'sucesso');
    }
    modal.hide();
    await carregar();
  } catch (erro) {
    erroFormulario.textContent = mensagemDeErro(erro, 'Não foi possível salvar a compra.');
    erroFormulario.classList.remove('d-none');
  } finally {
    btnSalvar.disabled = false;
  }
});

exigirElemento<HTMLButtonElement>('#btnNova').addEventListener('click', () => {
  void carregarMateriais()
    .then(() => abrirFormulario(null))
    .catch((erro: unknown) =>
      mostrarAviso(mensagemDeErro(erro, 'Não foi possível carregar os materiais.'), 'erro'),
    );
});
exigirElemento<HTMLButtonElement>('#btnAdicionarItem').addEventListener('click', novoItem);
listaItensExistentes.addEventListener('input', (evento) => {
  const alvo = evento.target;
  if (!(alvo instanceof HTMLInputElement)) return;
  const id = Number(alvo.dataset.itemId);
  const campo = alvo.dataset.itemField;
  if (!Number.isSafeInteger(id) || !['quantity', 'amount'].includes(campo ?? '')) return;
  itensExistentes = itensExistentes.map((item) => {
    if (item.id !== id) return item;
    return campo === 'quantity'
      ? { ...item, quantity: alvo.value.trim() }
      : { ...item, amount: alvo.value.trim() };
  });
});
exigirElemento<HTMLButtonElement>('#btnAtualizar').addEventListener('click', () => void carregar());
exigirElemento<HTMLButtonElement>('#btnFiltrar').addEventListener('click', () => void carregar());
campoMoeda.addEventListener('input', renderizarItensNovos);
btnConsultarCotacao.addEventListener('click', () => void consultarCotacao());

void carregar();
