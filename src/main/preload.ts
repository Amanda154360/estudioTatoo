import { contextBridge, ipcRenderer } from 'electron';
import { CANAIS, type ApiEstudio } from '../shared/contracts/ipc';

const api: ApiEstudio = {
  // ==========================================
  // CLIENTES
  // ==========================================
  criarCliente: (dados) => ipcRenderer.invoke('cliente:criar', dados),
  listarClientes: (filtro) => ipcRenderer.invoke('cliente:listar', filtro),
  abrirEdicaoCliente: (cliente) => ipcRenderer.send('cliente:abrirEdicao', cliente),
  abrirNovoCliente: () => ipcRenderer.send('cliente:abrirNovo'),
  atualizarCliente: (dados) => ipcRenderer.invoke('cliente:atualizar', dados),
  excluirCliente: (id) => ipcRenderer.invoke('cliente:excluir', id),
  buscarClientesPorCep: (cep) => ipcRenderer.invoke('cliente:buscarPorCep', cep),
  aoReceberClienteParaEditar: (callback) => {
    ipcRenderer.on('cliente:preencher', (_evento, cliente: unknown) => callback(cliente));
  },

  // ==========================================
  // PROFISSIONAIS
  // ==========================================
  criarProfissional: (dados) => ipcRenderer.invoke('profissional:criar', dados),
  listarProfissionais: (especialidade, apenasAtivos) =>
    ipcRenderer.invoke('profissional:listar', especialidade, apenasAtivos),
  abrirEdicaoProfissional: (profissional) =>
    ipcRenderer.send('profissional:abrirEdicao', profissional),
  abrirNovoProfissional: () => ipcRenderer.send('profissional:abrirNovo'),
  atualizarProfissional: (dados) => ipcRenderer.invoke('profissional:atualizar', dados),
  excluirProfissional: (id) => ipcRenderer.invoke('profissional:excluir', id),
  aoReceberProfissionalParaEditar: (callback) => {
    ipcRenderer.on('profissional:preencher', (_evento, profissional: unknown) =>
      callback(profissional),
    );
  },

  // ==========================================
  // CEP
  // ==========================================
  buscarCepSql: (cep) => ipcRenderer.invoke('sql:buscarCep', cep),

  // ==========================================
  // PROCEDIMENTOS DO ESTÚDIO
  // ==========================================
  listarServicos: (filtro) => ipcRenderer.invoke(CANAIS.servicoListar, filtro),
  buscarServico: (id) => ipcRenderer.invoke(CANAIS.servicoBuscar, id),
  criarServico: (dados) => ipcRenderer.invoke(CANAIS.servicoCriar, dados),
  atualizarServico: (dados) => ipcRenderer.invoke(CANAIS.servicoAtualizar, dados),
  excluirServico: (id) => ipcRenderer.invoke(CANAIS.servicoExcluir, id),

  // ==========================================
  // LEMBRETES DE ATENDIMENTO
  // ==========================================
  listarLembretes: (filtro) => ipcRenderer.invoke(CANAIS.lembreteListar, filtro),
  gerarLembretesPendentes: () => ipcRenderer.invoke(CANAIS.lembreteGerarPendentes, undefined),
  enviarLembretesPendentes: () => ipcRenderer.invoke(CANAIS.lembreteEnviarPendentes, undefined),
  reprocessarLembrete: (id) => ipcRenderer.invoke(CANAIS.lembreteReprocessar, id),
  cancelarLembrete: (id) => ipcRenderer.invoke(CANAIS.lembreteCancelar, id),
  excluirLembrete: (id) => ipcRenderer.invoke(CANAIS.lembreteExcluir, id),
  criarLembreteManual: (agendamentoId) =>
    ipcRenderer.invoke(CANAIS.lembreteCriarManual, agendamentoId),

  // ==========================================
  // MATERIAIS
  // ==========================================
  listarMateriais: (filtro) => ipcRenderer.invoke(CANAIS.materialListar, filtro),
  buscarMaterial: (id) => ipcRenderer.invoke(CANAIS.materialBuscar, id),
  criarMaterial: (dados) => ipcRenderer.invoke(CANAIS.materialCriar, dados),
  atualizarMaterial: (dados) => ipcRenderer.invoke(CANAIS.materialAtualizar, dados),
  desativarMaterial: (id) => ipcRenderer.invoke(CANAIS.materialDesativar, id),

  // ==========================================
  // COMPRAS
  // ==========================================
  listarCompras: (filtro) => ipcRenderer.invoke(CANAIS.compraListar, filtro),
  buscarCompra: (id) => ipcRenderer.invoke(CANAIS.compraBuscar, id),
  criarCompra: (dados) => ipcRenderer.invoke(CANAIS.compraCriar, dados),
  atualizarCompra: (dados) => ipcRenderer.invoke(CANAIS.compraAtualizar, dados),

  // ==========================================
  // SISTEMA
  // ==========================================
  aoRecarregar: (callback) => {
    ipcRenderer.on('sistema:recarregar', () => callback());
  },
};

contextBridge.exposeInMainWorld('api', api);
