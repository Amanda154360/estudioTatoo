const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const conexao = require('./config/database');
const windowManager = require('./windows/windowManager');
const { criarMenuPrincipal } = require('./menu/menuBuilder');
const { registrarTodosIpcs } = require('./ipc');

// Configuração da pasta de sessão do Electron
const pastaSessao = path.join(app.getPath('appData'), 'estudio-tattoo', 'session');
fs.mkdirSync(pastaSessao, { recursive: true });
app.setPath('sessionData', pastaSessao);

// Verificação de conectividade com o banco MySQL
const testarConexaoBanco = () => {
  try {
    conexao.connect((erro) => {
      if (erro) {
        console.error('[ERRO] Conexão com o MySQL falhou:', erro.message);
        if (dialog) {
          dialog.showErrorBox(
            'Erro de conexão com o banco',
            `Não foi possível conectar ao MySQL.\n\nVerifique se o serviço está ativo e execute a migração (npm run db:init).\n\nDetalhes: ${erro.message}`
          );
        }
        return;
      }
      console.log('[OK] Conectado ao MySQL com sucesso!');
    });
  } catch (excecao) {
    console.error('[ERRO FATAL] Falha de inicialização do banco:', excecao);
  }
};

// Ciclo de vida da aplicação
app.whenReady().then(() => {
  testarConexaoBanco();

  // 1. Inicializa a janela principal
  windowManager.criarJanelaPrincipal();

  // 2. Constrói o menu superior da aplicação
  criarMenuPrincipal(windowManager);

  // 3. Registra os módulos de IPC (comunicação com as Stored Procedures em SQL)
  registrarTodosIpcs(windowManager);

  app.on('activate', () => {
    if (!windowManager.janelaPrincipal) {
      windowManager.criarJanelaPrincipal();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
