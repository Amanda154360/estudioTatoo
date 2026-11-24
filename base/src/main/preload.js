const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  criarConsole: (console_) => ipcRenderer.invoke('console:criar', console_),
  listarConsoles: () => ipcRenderer.invoke('console:listar'),
  editarConsole: (console_) => ipcRenderer.send('console:abrirEdicao', console_),
  atualizarConsole: (console_) => ipcRenderer.invoke('console:atualizar', console_),
  excluirConsole: (id) => ipcRenderer.invoke('console:excluir', id),

  aoReceberConsoleParaEditar: (callback) =>
    ipcRenderer.on('console:preencher', (evento, console_) => callback(console_)),


  criarJogo: (jogo_) => ipcRenderer.invoke('jogo:criar', jogo_),
  listarJogos: () => ipcRenderer.invoke('jogo:listar'),
  editarJogo: (jogo_) => ipcRenderer.send('jogo:abrirEdicaoJogo', jogo_),
  atualizarJogo: (jogo_) => ipcRenderer.invoke('jogo:atualizar', jogo_),
  excluirJogo: (id) => ipcRenderer.invoke('jogo:excluir', id),

  aoReceberJogoParaEditar: (callback) =>
    ipcRenderer.on('jogo:preencher', (evento, jogo_) => callback(jogo_)),

});
