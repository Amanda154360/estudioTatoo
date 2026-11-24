const registrarCepIpc = require('./cepIpc');
const registrarClienteIpc = require('./clienteIpc');
const registrarProfissionalIpc = require('./profissionalIpc');

function registrarTodosIpcs(windowManager) {
  registrarCepIpc();
  registrarClienteIpc(windowManager);
  registrarProfissionalIpc(windowManager);
}

module.exports = { registrarTodosIpcs };
