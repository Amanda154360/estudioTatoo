import { Menu, type MenuItemConstructorOptions } from 'electron';
import type { WindowManager } from '../windows/windowManager';

export function criarMenuPrincipal(windowManager: WindowManager): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Cadastros',
      submenu: [
        {
          label: 'Materiais',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            windowManager.abrirTelaMateriais();
          },
        },
        {
          label: 'Cadastrar Cliente',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            windowManager.abrirModalCliente();
          },
        },
        {
          label: 'Cadastrar Profissional',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            windowManager.abrirModalProfissional();
          },
        },
      ],
    },
    {
      label: 'Estúdio',
      submenu: [
        {
          label: 'Compras de Materiais',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            windowManager.abrirTelaCompras();
          },
        },
        {
          label: 'Procedimentos do Estúdio',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            windowManager.abrirTelaServicos();
          },
        },
        {
          label: 'Lembretes de Atendimento',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            windowManager.abrirTelaLembretes();
          },
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
            windowManager.janelaPrincipal?.webContents.send('sistema:recarregar');
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

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
