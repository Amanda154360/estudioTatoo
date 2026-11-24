const { ipcMain } = require('electron');
const profissionalRepository = require('../repositories/profissionalRepository');

function registrarProfissionalIpc(windowManager) {
  ipcMain.handle('profissional:criar', async (evento, dados) => {
    try {
      return await profissionalRepository.cadastrar(dados);
    } catch (erro) {
      console.error('Erro IPC ao cadastrar profissional:', erro);
      throw erro;
    }
  });

  ipcMain.handle('profissional:listar', async (evento, especialidade, apenasAtivos) => {
    try {
      return await profissionalRepository.listar(especialidade, apenasAtivos);
    } catch (erro) {
      console.error('Erro IPC ao listar profissionais:', erro);
      throw erro;
    }
  });

  ipcMain.handle('profissional:atualizar', async (evento, dados) => {
    try {
      return await profissionalRepository.atualizar(dados);
    } catch (erro) {
      console.error('Erro IPC ao atualizar profissional:', erro);
      throw erro;
    }
  });

  ipcMain.handle('profissional:excluir', async (evento, id) => {
    try {
      return await profissionalRepository.excluir(id);
    } catch (erro) {
      console.error('Erro IPC ao excluir profissional:', erro);
      throw erro;
    }
  });

  // Eventos de navegação e abertura de modais
  ipcMain.on('profissional:abrirNovo', () => {
    windowManager.abrirModalProfissional();
  });

  ipcMain.on('profissional:abrirEdicao', (evento, profissional) => {
    windowManager.abrirModalProfissional(profissional);
  });
}

module.exports = registrarProfissionalIpc;
