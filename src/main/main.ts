import { app, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import conexao from './config/database';
import { LembreteScheduler } from './infra/jobs/LembreteScheduler';
import { registrarTodosIpcs } from './ipc';
import { criarMenuPrincipal } from './menu/menuBuilder';
import gerenciadorJanelas from './windows/windowManager';

// Pasta de sessão do Electron (fora do diretório do projeto).
const pastaSessao = path.join(app.getPath('appData'), 'estudio-tattoo', 'session');
fs.mkdirSync(pastaSessao, { recursive: true });
app.setPath('sessionData', pastaSessao);

const agendadorLembretes = new LembreteScheduler();

function testarConexaoBanco(): void {
  try {
    conexao.connect((erro) => {
      if (erro) {
        console.error('[ERRO] Conexão com o MySQL falhou:', erro.message);
        dialog.showErrorBox(
          'Erro de conexão com o banco',
          `Não foi possível conectar ao MySQL.\n\nVerifique a configuração e a disponibilidade do banco. Migrações não são executadas automaticamente pelo aplicativo.\n\nDetalhes: ${erro.message}`,
        );
        return;
      }
      console.log('[OK] Conectado ao MySQL com sucesso!');
    });
  } catch (excecao) {
    console.error('[ERRO FATAL] Falha de inicialização do banco:', excecao);
  }
}

app.whenReady().then(() => {
  testarConexaoBanco();

  // Handlers primeiro: a janela já nasce com todos os canais disponíveis.
  registrarTodosIpcs(gerenciadorJanelas);
  gerenciadorJanelas.criarJanelaPrincipal();
  criarMenuPrincipal(gerenciadorJanelas);

  agendadorLembretes.iniciar();

  app.on('activate', () => {
    if (!gerenciadorJanelas.janelaPrincipal) {
      gerenciadorJanelas.criarJanelaPrincipal();
    }
  });
});

app.on('before-quit', () => {
  agendadorLembretes.parar();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
