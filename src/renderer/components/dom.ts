/** Utilitários de DOM compartilhados pelas telas novas (sem innerHTML). */

export function exigirElemento<T extends Element>(seletor: string): T {
  const elemento = document.querySelector<T>(seletor);
  if (!elemento) {
    throw new Error(`Elemento obrigatório não encontrado: ${seletor}`);
  }
  return elemento;
}

export function criarCelula(texto: string, classe?: string): HTMLTableCellElement {
  const celula = document.createElement('td');
  celula.textContent = texto;
  if (classe) celula.className = classe;
  return celula;
}

export function criarBotao(
  texto: string,
  classe: string,
  aoClicar: () => void,
): HTMLButtonElement {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = classe;
  botao.textContent = texto;
  botao.addEventListener('click', aoClicar);
  return botao;
}

export function mostrarAviso(mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'info'): void {
  const area = document.querySelector<HTMLDivElement>('#areaAvisos');
  if (!area) {
    window.alert(mensagem);
    return;
  }

  const classe = tipo === 'sucesso' ? 'alert-success' : tipo === 'erro' ? 'alert-danger' : 'alert-info';
  const alerta = document.createElement('div');
  alerta.className = `alert ${classe} py-2 mb-2`;
  alerta.textContent = mensagem;
  area.prepend(alerta);

  window.setTimeout(() => alerta.remove(), 8000);
}

export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (!(erro instanceof Error)) return padrao;
  const limpa = erro.message.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '');
  return limpa.trim() || padrao;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`;
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
