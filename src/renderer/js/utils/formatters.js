/**
 * Utilitários modulares de formatação e segurança do frontend
 */

function formatarCep(cep) {
  if (!cep) return '';
  const d = String(cep).replace(/\D/g, '').slice(0, 8);
  if (d.length > 5) {
    return d.replace(/^(\d{5})(\d)/, '$1-$2');
  }
  return d;
}

function formatarCpf(cpf) {
  if (!cpf) return '';
  const d = String(cpf).replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function formatarTelefone(tel) {
  if (!tel) return '';
  const d = String(tel).replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function escapeHtml(string) {
  if (string === null || string === undefined) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatarDataBr(dataIso) {
  if (!dataIso) return 'Não informada';
  const data = new Date(dataIso);
  if (isNaN(data.getTime())) return dataIso;
  return data.toLocaleDateString('pt-BR');
}
