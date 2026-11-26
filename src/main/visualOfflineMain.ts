import { app, BrowserWindow, ipcMain, type BrowserWindow as BrowserWindowType } from 'electron';
import { z } from 'zod';
import { CANAIS } from '../shared/contracts/ipc';
import { filtroMateriaisSchema, materialIdSchema, criarMaterialSchema, atualizarMaterialSchema } from '../shared/validation/materialSchemas';
import { filtroComprasSchema, compraIdSchema, criarCompraSchema, atualizarCompraSchema } from '../shared/validation/compraSchemas';
import { SegurancaIpc } from './ipc/seguranca';
import { criarMenuPrincipal } from './menu/menuBuilder';
import { WindowManager } from './windows/windowManager';

/**
 * Isolated visual runner. Intentionally does not import main.ts, database
 * configuration, repositories, production IPC registration, or schedulers.
 * All data returned here is temporary demonstration data held in memory.
 */
class VisualOfflineDemo {
  private materials: Array<{
    id: number;
    name: string;
    unit: string;
    description: string;
  }> = [{
    id: 1,
    name: 'Tinta preta (amostra)',
    unit: 'ml',
    description: 'Fake record for offline visual verification.',
  }];
  private nextMaterialId = 2;

  register(): void {
    // Empty lists keep the existing home page quiet; they are not database calls.
    ipcMain.handle('cliente:listar', (evento) => {
      if (!SegurancaIpc.origemPermitida(evento)) throw new Error('Unauthorized IPC origin.');
      return [];
    });
    ipcMain.handle('profissional:listar', (evento) => {
      if (!SegurancaIpc.origemPermitida(evento)) throw new Error('Unauthorized IPC origin.');
      return [];
    });

    SegurancaIpc.registrarCanal(CANAIS.materialListar, filtroMateriaisSchema, ({ search }) =>
      this.materials.filter((material) =>
        material.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      ),
    );
    SegurancaIpc.registrarCanal(CANAIS.materialBuscar, materialIdSchema, (id) =>
      this.materials.find((material) => material.id === id) ?? null,
    );
    SegurancaIpc.registrarCanal(CANAIS.materialCriar, criarMaterialSchema, (dados) => {
      const material = {
        id: this.nextMaterialId++,
        name: dados.name,
        unit: dados.unit,
        description: dados.description ?? '',
      };
      this.materials.push(material);
      return material;
    });
    SegurancaIpc.registrarCanal(CANAIS.materialAtualizar, atualizarMaterialSchema, (dados) => {
      const index = this.materials.findIndex((material) => material.id === dados.id);
      if (index < 0) return null;
      this.materials[index] = {
        ...this.materials[index]!,
        ...dados,
        description: dados.description ?? this.materials[index]!.description,
      };
      return this.materials[index];
    });
    SegurancaIpc.registrarCanal(CANAIS.materialDesativar, materialIdSchema, (id) => {
      const originalLength = this.materials.length;
      this.materials = this.materials.filter((material) => material.id !== id);
      return this.materials.length !== originalLength;
    });

    SegurancaIpc.registrarCanal(CANAIS.compraListar, filtroComprasSchema, () => []);
    SegurancaIpc.registrarCanal(CANAIS.compraBuscar, compraIdSchema, () => null);
    SegurancaIpc.registrarCanal(CANAIS.compraCriar, criarCompraSchema, () => ({
      id: 1,
      date: new Date().toISOString().slice(0, 10),
      currency: 'BRL',
      notes: 'OFFLINE SIMULATION - not persisted',
    }));
    SegurancaIpc.registrarCanal(CANAIS.compraAtualizar, atualizarCompraSchema, () => null);

    SegurancaIpc.registrarCanal(CANAIS.cotacaoDolarConsultar, z.enum(['buy', 'sell']), (side) => {
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      return {
        ok: true,
        value: {
          baseCurrency: 'USD',
          quoteCurrency: 'BRL',
          side,
          rate: side === 'buy' ? '5.0000' : '5.1000',
          source: 'OFFLINE SIMULATION - no Banco Central request',
          quotedAt: `${date} 12:00:00`,
          effectiveDate: date,
          retrievedAt: now.toISOString(),
        },
      };
    });
  }
}

class VisualOfflineWindowManager extends WindowManager {
  override criarJanelaPrincipal(): BrowserWindowType {
    const janela = this.marcar(super.criarJanelaPrincipal(), 'Studio Tattoo - OFFLINE DEMO');
    janela.webContents.once('did-finish-load', () => {
      void janela.webContents.executeJavaScript(`(() => {
        const indicador = [...document.querySelectorAll('span.badge')]
          .find((item) => item.textContent?.trim() === 'SQL Engine: Ativo');
        if (!indicador) return false;
        indicador.textContent = 'Modo offline - dados simulados';
        indicador.className = 'badge bg-warning text-dark p-2';
        return true;
      })()`).then((atualizado) => {
        if (!atualizado) {
          console.warn('[OFFLINE DEMO] Indicador de modo offline não localizado.');
        }
      }).catch((erro: unknown) => {
        console.error('[OFFLINE DEMO] Não foi possível atualizar o indicador:', erro);
      });
    });
    return janela;
  }

  override abrirTelaMateriais(): BrowserWindowType {
    return this.marcar(super.abrirTelaMateriais(), 'Materials - OFFLINE DEMO');
  }

  override abrirTelaCompras(): BrowserWindowType {
    return this.marcar(super.abrirTelaCompras(), 'Purchases - OFFLINE DEMO');
  }

  private marcar(janela: BrowserWindowType, titulo: string): BrowserWindowType {
    janela.webContents.on('page-title-updated', (evento) => {
      evento.preventDefault();
      janela.setTitle(titulo);
    });
    janela.setTitle(titulo);
    return janela;
  }
}

const gerenciador = new VisualOfflineWindowManager();

app.whenReady().then(() => {
  new VisualOfflineDemo().register();
  gerenciador.criarJanelaPrincipal();
  criarMenuPrincipal(gerenciador);

  // Optional direct routes let the visual runner inspect screens even where
  // native menu automation is unavailable; normal production startup is untouched.
  console.log(`[OFFLINE DEMO] screen=${process.env.ESTUDIO_VISUAL_SCREEN ?? 'home'}`);
  if (process.env.ESTUDIO_VISUAL_SCREEN === 'materials') {
    console.log('[OFFLINE DEMO] opening materials window');
    const window = gerenciador.abrirTelaMateriais();
    window.show();
    window.focus();
    console.log('[OFFLINE DEMO] windows:', BrowserWindow.getAllWindows().map((item) => ({
      title: item.getTitle(),
      visible: item.isVisible(),
      destroyed: item.isDestroyed(),
    })));
  } else if (process.env.ESTUDIO_VISUAL_SCREEN === 'purchases') {
    console.log('[OFFLINE DEMO] opening purchases window');
    const window = gerenciador.abrirTelaCompras();
    window.show();
    window.focus();
    console.log('[OFFLINE DEMO] windows:', BrowserWindow.getAllWindows().map((item) => ({
      title: item.getTitle(),
      visible: item.isVisible(),
      destroyed: item.isDestroyed(),
    })));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
