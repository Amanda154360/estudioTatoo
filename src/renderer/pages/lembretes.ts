import type { Lembrete, StatusLembrete } from '../../shared/contracts/lembrete';
import {
  criarBotao,
  criarCelula,
  exigirElemento,
  formatarDataHora,
  mensagemDeErro,
  mostrarAviso,
} from '../components/dom';

let lembretes: Lembrete[] = [];

const corpoTabela = exigirElemento<HTMLTableSectionElement>('#corpoTabela');
const contador = exigirElemento<HTMLSpanElement>('#contador');
const filtroStatus = exigirElemento<HTMLSelectElement>('#filtroStatus');
const campoAgendamento = exigirElemento<HTMLInputElement>('#campoAgendamento');
const areaPreview = exigirElemento<HTMLDivElement>('#areaPreview');

function statusSelecionado(): StatusLembrete | '' {
  return filtroStatus.value as StatusLembrete | '';
}

async function carregar(): Promise<void> {
  try {
    lembretes = await window.api.listarLembretes({
      status: statusSelecionado(),
      limite: 100,
    });
    renderizar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível carregar os lembretes.'), 'erro');
  }
}

function renderizar(): void {
  corpoTabela.replaceChildren();
  contador.textContent = `${lembretes.length} lembrete(s)`;

  if (lembretes.length === 0) {
    const linha = document.createElement('tr');
    const celula = criarCelula('Nenhum lembrete encontrado.', 'text-center text-muted');
    celula.colSpan = 8;
    linha.append(celula);
    corpoTabela.append(linha);
    return;
  }

  for (const lembrete of lembretes) {
    const linha = document.createElement('tr');
    linha.append(criarCelula(lembrete.cliente_nome));
    linha.append(criarCelula(formatarDataHora(lembrete.data_atendimento)));
    linha.append(criarCelula(lembrete.servico_nome ?? '-'));
    linha.append(criarCelula(lembrete.destinatario));
    linha.append(criarCelula(formatarDataHora(lembrete.enviar_em)));
    linha.append(criarStatus(lembrete));
    linha.append(criarCelula(String(lembrete.tentativas), 'text-center'));
    linha.append(criarAcoes(lembrete));
    corpoTabela.append(linha);
  }
}

function criarStatus(lembrete: Lembrete): HTMLTableCellElement {
  const celula = document.createElement('td');
  const badge = document.createElement('span');

  const classe: Record<StatusLembrete, string> = {
    Pendente: 'bg-warning text-dark',
    Enviado: 'bg-success',
    Falhou: 'bg-danger',
    Cancelado: 'bg-secondary',
  };

  badge.className = `badge ${classe[lembrete.status]}`;
  badge.textContent = lembrete.status;
  celula.append(badge);

  if (lembrete.erro) {
    const detalhe = document.createElement('div');
    detalhe.className = 'small text-danger text-truncate';
    detalhe.style.maxWidth = '180px';
    detalhe.textContent = lembrete.erro;
    detalhe.title = lembrete.erro;
    celula.append(detalhe);
  }

  return celula;
}

function criarAcoes(lembrete: Lembrete): HTMLTableCellElement {
  const celula = document.createElement('td');
  celula.className = 'text-center';

  const grupo = document.createElement('div');
  grupo.className = 'btn-group btn-group-sm';

  if (lembrete.status === 'Pendente' || lembrete.status === 'Falhou') {
    grupo.append(
      criarBotao('Reprocessar', 'btn btn-outline-primary', () => void reprocessar(lembrete.id)),
    );
  }

  if (lembrete.status === 'Pendente' || lembrete.status === 'Falhou') {
    grupo.append(criarBotao('Cancelar', 'btn btn-outline-warning', () => void cancelar(lembrete.id)));
  }

  grupo.append(criarBotao('Excluir', 'btn btn-danger', () => void excluir(lembrete.id)));

  celula.append(grupo);
  return celula;
}

async function gerarPendentes(): Promise<void> {
  try {
    const criados = await window.api.gerarLembretesPendentes();
    mostrarAviso(
      criados > 0
        ? `${criados} lembrete(s) criado(s) para os próximos atendimentos.`
        : 'Nenhum agendamento novo precisava de lembrete.',
      criados > 0 ? 'sucesso' : 'info',
    );
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível gerar os lembretes pendentes.'), 'erro');
  }
}

async function enviarPendentes(): Promise<void> {
  const botao = exigirElemento<HTMLButtonElement>('#btnEnviar');
  botao.disabled = true;

  try {
    const resultado = await window.api.enviarLembretesPendentes();
    mostrarAviso(
      `Total: ${resultado.total} • enviados: ${resultado.enviados} • falhas: ${resultado.falhas}`,
      resultado.falhas > 0 ? 'erro' : 'sucesso',
    );

    exibirPreviews(resultado.detalhes.filter((item) => item.previewUrl));
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível enviar os lembretes.'), 'erro');
  } finally {
    botao.disabled = false;
  }
}

function exibirPreviews(previews: Array<{ id: number; previewUrl?: string }>): void {
  areaPreview.replaceChildren();
  if (previews.length === 0) return;

  const cartao = document.createElement('div');
  cartao.className = 'alert alert-info py-2';

  const titulo = document.createElement('strong');
  titulo.textContent = 'E-mails de teste (Ethereal) gerados: ';
  cartao.append(titulo);

  for (const item of previews) {
    if (!item.previewUrl) continue;
    const linha = document.createElement('div');
    linha.className = 'small mt-1';
    const codigo = document.createElement('code');
    codigo.textContent = item.previewUrl;
    linha.append(`#${item.id} `, codigo);
    cartao.append(linha);
  }

  areaPreview.append(cartao);
}

async function reprocessar(id: number): Promise<void> {
  try {
    await window.api.reprocessarLembrete(id);
    mostrarAviso('Lembrete marcado como pendente novamente.', 'sucesso');
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível reprocessar o lembrete.'), 'erro');
  }
}

async function cancelar(id: number): Promise<void> {
  try {
    await window.api.cancelarLembrete(id);
    mostrarAviso('Lembrete cancelado.', 'sucesso');
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível cancelar o lembrete.'), 'erro');
  }
}

async function excluir(id: number): Promise<void> {
  if (!window.confirm('Excluir este lembrete? Esta ação não pode ser desfeita.')) return;

  try {
    await window.api.excluirLembrete(id);
    mostrarAviso('Lembrete excluído.', 'sucesso');
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível excluir o lembrete.'), 'erro');
  }
}

async function criarManual(): Promise<void> {
  const agendamentoId = Number(campoAgendamento.value);

  if (!Number.isInteger(agendamentoId) || agendamentoId <= 0) {
    mostrarAviso('Informe um número de agendamento válido.', 'erro');
    return;
  }

  try {
    const criado = await window.api.criarLembreteManual(agendamentoId);
    mostrarAviso(`Lembrete criado para ${criado.cliente_nome}.`, 'sucesso');
    campoAgendamento.value = '';
    await carregar();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro, 'Não foi possível criar o lembrete manual.'), 'erro');
  }
}

exigirElemento<HTMLButtonElement>('#btnAtualizar').addEventListener('click', () => void carregar());
exigirElemento<HTMLButtonElement>('#btnGerar').addEventListener('click', () => void gerarPendentes());
exigirElemento<HTMLButtonElement>('#btnEnviar').addEventListener('click', () => void enviarPendentes());
exigirElemento<HTMLButtonElement>('#btnCriarManual').addEventListener('click', () => void criarManual());
filtroStatus.addEventListener('change', () => void carregar());

void carregar();
