const { ipcMain } = require('electron');
const cepRepository = require('../repositories/cepRepository');

function registrarCepIpc() {
  ipcMain.handle('sql:buscarCep', async (evento, cep) => {
    try {
      return await cepRepository.buscarCep(cep);
    } catch (erro) {
      console.error('Erro IPC ao buscar CEP:', erro);
      throw erro;
    }
  });
}

module.exports = registrarCepIpc;
