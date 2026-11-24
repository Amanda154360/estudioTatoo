const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ==========================================
  // CLIENTES
  // ==========================================
  criarCliente: (cliente_) => ipcRenderer.invoke('cliente:criar', cliente_),
  listarClientes: (filtro) => ipcRenderer.invoke('cliente:listar', filtro),
  abrirEdicaoCliente: (cliente_) => ipcRenderer.send('cliente:abrirEdicao', cliente_),
  abrirNovoCliente: () => ipcRenderer.send('cliente:abrirNovo'),
  atualizarCliente: (cliente_) => ipcRenderer.invoke('cliente:atualizar', cliente_),
  excluirCliente: (id) => ipcRenderer.invoke('cliente:excluir', id),
  buscarClientesPorCep: (cep) => ipcRenderer.invoke('cliente:buscarPorCep', cep),

  aoReceberClienteParaEditar: (callback) =>
    ipcRenderer.on('cliente:preencher', (evento, cliente_) => callback(cliente_)),

  // ==========================================
  // PROFISSIONAIS
  // ==========================================
  criarProfissional: (profissional_) => ipcRenderer.invoke('profissional:criar', profissional_),
  listarProfissionais: (especialidade, apenasAtivos) =>
    ipcRenderer.invoke('profissional:listar', especialidade, apenasAtivos),
  abrirEdicaoProfissional: (profissional_) =>
    ipcRenderer.send('profissional:abrirEdicao', profissional_),
  abrirNovoProfissional: () => ipcRenderer.send('profissional:abrirNovo'),
  atualizarProfissional: (profissional_) =>
    ipcRenderer.invoke('profissional:atualizar', profissional_),
  excluirProfissional: (id) => ipcRenderer.invoke('profissional:excluir', id),

  aoReceberProfissionalParaEditar: (callback) =>
    ipcRenderer.on('profissional:preencher', (evento, prof_) => callback(prof_)),

  // ==========================================
  // BUSCA DE CEP NO BANCO SQL
  // ==========================================
  buscarCepSql: (cep) => ipcRenderer.invoke('sql:buscarCep', cep),

  // ==========================================
  // SISTEMA
  // ==========================================
  aoRecarregar: (callback) =>
    ipcRenderer.on('sistema:recarregar', () => callback()),
});
