const { ipcMain } = require('electron');
const clienteRepository = require('../repositories/clienteRepository');

function registrarClienteIpc(windowManager) {
  ipcMain.handle('cliente:criar', async (evento, dados) => {
    try {
      return await clienteRepository.cadastrar(dados);
    } catch (erro) {
      console.error('Erro IPC ao cadastrar cliente:', erro);
      throw erro;
    }
  });

  ipcMain.handle('cliente:listar', async (evento, filtro) => {
    try {
      return await clienteRepository.listar(filtro);
    } catch (erro) {
      console.error('Erro IPC ao listar clientes:', erro);
      throw erro;
    }
  });

  ipcMain.handle('cliente:atualizar', async (evento, dados) => {
    try {
      return await clienteRepository.atualizar(dados);
    } catch (erro) {
      console.error('Erro IPC ao atualizar cliente:', erro);
      throw erro;
    }
  });

  ipcMain.handle('cliente:excluir', async (evento, id) => {
    try {
      return await clienteRepository.excluir(id);
    } catch (erro) {
      console.error('Erro IPC ao excluir cliente:', erro);
      throw erro;
    }
  });

  ipcMain.handle('cliente:buscarPorCep', async (evento, cep) => {
    try {
      return await clienteRepository.buscarPorCep(cep);
    } catch (erro) {
      console.error('Erro IPC ao buscar clientes por CEP:', erro);
      throw erro;
    }
  });

  // Eventos de navegação e abertura de modais
  ipcMain.on('cliente:abrirNovo', () => {
    windowManager.abrirModalCliente();
  });

  ipcMain.on('cliente:abrirEdicao', (evento, cliente) => {
    windowManager.abrirModalCliente(cliente);
  });
}

module.exports = registrarClienteIpc;
