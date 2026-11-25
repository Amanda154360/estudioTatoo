import type { WindowManager } from '../windows/windowManager';
import registrarCepIpc from './cepIpc';
import registrarClienteIpc from './clienteIpc';
import registrarProfissionalIpc from './profissionalIpc';
import { registrarLembreteIpc } from './lembreteIpc';
import { registrarServicoIpc } from './servicoIpc';
import { registrarMaterialCompraIpc } from './materialCompraIpc';

export function registrarTodosIpcs(windowManager: WindowManager): void {
  // Módulos legados (JS) — portados para TS na próxima fase.
  registrarCepIpc();
  registrarClienteIpc(windowManager);
  registrarProfissionalIpc(windowManager);

  // Módulos novos, 100% TypeScript.
  registrarServicoIpc();
  registrarLembreteIpc();
  registrarMaterialCompraIpc();
}
