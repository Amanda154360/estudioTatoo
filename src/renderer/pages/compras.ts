import type { Material } from '../../shared/contracts/material';
import type { CompraDetalhada, CriarCompra } from '../../shared/contracts/compra';
import type { ItemCompraInput } from '../../shared/contracts/compra';
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

let compras: readonly CompraDetalhada[] = [];
let materiais: readonly Material[] = [];
let itensNovos: ItemRascunho[] = [];
let compraEmEdicao: CompraDetalhada | null = null;

const corpoTabela = exigirElemento<HTMLTableSectionElement>('#corpoTabela');
const form = exigirElemento<HTMLFormElement>('#formCompra');
const modal = new window.bootstrap.Modal(exigirElemento<HTMLDivElement>('#modalCompra'));
const erroFormulario = exigirElemento<HTMLDivElement>('#erroFormulario');
const listaItens = exigirElemento<HTMLUListElement>('#listaItensNovos');
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
    celula.colSpan = 4;
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
    const acoes = document.createElement('td');
    acoes.className = 'text-end';
    acoes.append(criarBotao('Consultar / editar', 'btn btn-sm btn-primary', () => void abrirCompra(compra.id)));
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

function abrirFormulario(compra: CompraDetalhada | null): void {
  compraEmEdicao = compra;
  itensNovos = [];
  exigirElemento<HTMLHeadingElement>('#tituloModal').textContent =
    compra ? `Compra #${compra.id} — atualização parcial` : 'Nova compra';
  exigirElemento<HTMLInputElement>('#campoData').value =
    compra?.date ?? dataLocalHoje();
  campoMoeda.value = compra?.currency ?? 'BRL';
  campoMoeda.disabled = compra !== null;
  exigirElemento<HTMLTextAreaElement>('#campoObservacoes').value = compra?.notes ?? '';
  const existentes = exigirElemento<HTMLDivElement>('#itensExistentes');
  if (compra) {
    existentes.textContent = `Itens já registrados: ${(compra.items ?? []).map((item) =>
      `${item.materialNameSnapshot ?? `Material #${item.materialId}`} — ${item.quantity} × ${item.unitPrice.amount}`,
    ).join('; ') || 'detalhes indisponíveis'}. Itens existentes não são alterados nem removidos por esta tela.`;
    existentes.classList.remove('d-none');
  } else {
    existentes.textContent = '';
    existentes.classList.add('d-none');
  }
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
    await carregarMateriais();
    abrirFormulario(compra);
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível consultar a compra.'), 'erro');
  }
}

function montarItens(): readonly ItemCompraInput[] {
  const currency = campoMoeda.value.trim().toUpperCase();
  return itensNovos.map((item) => ({
    materialId: item.materialId,
    quantity: item.quantity,
    unitPrice: { amount: item.amount, currency },
  }));
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  btnSalvar.disabled = true;
  erroFormulario.classList.add('d-none');
  const date = exigirElemento<HTMLInputElement>('#campoData').value;
  const notes = exigirElemento<HTMLTextAreaElement>('#campoObservacoes').value;
  const items = montarItens();
  try {
    if (compraEmEdicao) {
      await window.api.atualizarCompra({
        id: compraEmEdicao.id,
        date,
        notes,
        items,
      });
      mostrarAviso('Cabeçalho atualizado; os novos itens foram acrescentados. Itens antigos não foram removidos.', 'sucesso');
    } else {
      if (items.length === 0) {
        throw new Error('Adicione ao menos um item à compra.');
      }
      const dados = {
        date,
        currency: campoMoeda.value.trim().toUpperCase(),
        notes,
        items,
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
exigirElemento<HTMLButtonElement>('#btnAtualizar').addEventListener('click', () => void carregar());
exigirElemento<HTMLButtonElement>('#btnFiltrar').addEventListener('click', () => void carregar());
campoMoeda.addEventListener('input', renderizarItensNovos);
btnConsultarCotacao.addEventListener('click', () => void consultarCotacao());

void carregar();
