import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import path from 'node:path';

/**
 * O bundle fica em dist/main/main.js; a raiz do renderer é resolvida a partir
 * dele. RENDERER_DIR permite apontar outro caminho ao empacotar.
 */
const RAIZ_RENDERER = process.env.RENDERER_DIR?.trim()
  ? path.resolve(process.env.RENDERER_DIR)
  : path.resolve(__dirname, '../../src/renderer');

const CAMINHO_PRELOAD = path.resolve(__dirname, 'preload.js');

const WEB_PREFERENCES = {
  preload: CAMINHO_PRELOAD,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
} as const;

export class WindowManager {
  janelaPrincipal: BrowserWindow | null = null;

  criarJanelaPrincipal(): BrowserWindow {
    const janela = this.criarJanela({
      width: 1100,
      height: 780,
      minWidth: 900,
      minHeight: 600,
    });

    this.janelaPrincipal = janela;
    void janela.loadFile(path.join(RAIZ_RENDERER, 'pages', 'frmPrincipal.html'));

    return janela;
  }

  abrirModalCliente(cliente: unknown = null): BrowserWindow {
    return this.abrirModal('frmCliente.html', { width: 650, height: 780 }, 'cliente:preencher', cliente);
  }

  abrirModalProfissional(profissional: unknown = null): BrowserWindow {
    return this.abrirModal(
      'frmProfissional.html',
      { width: 550, height: 680 },
      'profissional:preencher',
      profissional,
    );
  }

  abrirTelaServicos(): BrowserWindow {
    return this.abrirTela('servicos.html', { width: 980, height: 760 });
  }

  abrirTelaLembretes(): BrowserWindow {
    return this.abrirTela('lembretes.html', { width: 1120, height: 720 });
  }

  private abrirTela(arquivo: string, dimensoes: { width: number; height: number }): BrowserWindow {
    const janela = this.criarJanela({ ...dimensoes, parent: this.janelaPrincipal ?? undefined });
    void janela.loadFile(path.join(RAIZ_RENDERER, 'pages', arquivo));
    return janela;
  }

  private abrirModal(
    arquivo: string,
    dimensoes: { width: number; height: number },
    canal: string,
    dados: unknown,
  ): BrowserWindow {
    const janela = this.criarJanela({
      ...dimensoes,
      parent: this.janelaPrincipal ?? undefined,
      modal: true,
    });

    janela.removeMenu();
    void janela.loadFile(path.join(RAIZ_RENDERER, 'pages', arquivo));

    if (dados) {
      janela.webContents.once('did-finish-load', () => {
        janela.webContents.send(canal, dados);
      });
    }

    return janela;
  }

  private criarJanela(opcoes: BrowserWindowConstructorOptions): BrowserWindow {
    const janela = new BrowserWindow({ ...opcoes, webPreferences: WEB_PREFERENCES });

    // Bloqueia abrir janelas externas e navegar para fora do app.
    janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    janela.webContents.on('will-navigate', (evento) => evento.preventDefault());

    return janela;
  }
}

export const gerenciadorJanelas = new WindowManager();
export default gerenciadorJanelas;
