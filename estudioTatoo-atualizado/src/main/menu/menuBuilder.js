const { Menu } = require('electron');

function criarMenuPrincipal(windowManager) {
  const templateDoMenu = [
    {
      label: 'Cadastros',
      submenu: [
        {
          label: 'Cadastrar Cliente',
          accelerator: 'CmdOrCtrl+N',
          click: () => windowManager.abrirModalCliente(),
        },
        {
          label: 'Cadastrar Profissional',
          accelerator: 'CmdOrCtrl+P',
          click: () => windowManager.abrirModalProfissional(),
        },
      ],
    },
    {
      label: 'Sistema',
      submenu: [
        {
          label: 'Recarregar Dados',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (windowManager.janelaPrincipal) {
              windowManager.janelaPrincipal.webContents.send('sistema:recarregar');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Sair Imediatamente',
          role: 'quit',
          accelerator: 'CmdOrCtrl+Q',
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(templateDoMenu);
  Menu.setApplicationMenu(menu);
}

module.exports = { criarMenuPrincipal };
