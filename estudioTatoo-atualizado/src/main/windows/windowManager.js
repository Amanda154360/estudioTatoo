const { BrowserWindow } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.janelaPrincipal = null;
  }

  criarJanelaPrincipal() {
    this.janelaPrincipal = new BrowserWindow({
      width: 1100,
      height: 780,
      minWidth: 900,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
      },
    });

    this.janelaPrincipal.loadFile(
      path.join(__dirname, '../../renderer/frmPrincipal.html')
    );

    return this.janelaPrincipal;
  }

  abrirModalCliente(cliente = null) {
    const janelaModal = new BrowserWindow({
      width: 650,
      height: 780,
      parent: this.janelaPrincipal,
      modal: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
      },
    });

    janelaModal.removeMenu();
    janelaModal.loadFile(
      path.join(__dirname, '../../renderer/frmCliente.html')
    );

    if (cliente) {
      janelaModal.webContents.once('did-finish-load', () => {
        janelaModal.webContents.send('cliente:preencher', cliente);
      });
    }

    return janelaModal;
  }

  abrirModalProfissional(profissional = null) {
    const janelaModal = new BrowserWindow({
      width: 550,
      height: 680,
      parent: this.janelaPrincipal,
      modal: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
      },
    });

    janelaModal.removeMenu();
    janelaModal.loadFile(
      path.join(__dirname, '../../renderer/frmProfissional.html')
    );

    if (profissional) {
      janelaModal.webContents.once('did-finish-load', () => {
        janelaModal.webContents.send('profissional:preencher', profissional);
      });
    }

    return janelaModal;
  }
}

module.exports = new WindowManager();
