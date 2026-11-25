import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { ZodType } from 'zod';

/**
 * Fachada de segurança para todo canal IPC novo:
 * 1. só aceita chamada vinda das telas do próprio app (file://.../renderer/...);
 * 2. valida o payload com zod antes de chegar na regra de negócio.
 */
export class SegurancaIpc {
  static origemPermitida(evento: IpcMainInvokeEvent): boolean {
    const url = evento.senderFrame?.url ?? '';
    const normalizada = url.replace(/\\/g, '/');
    return normalizada.startsWith('file://') && normalizada.includes('/renderer/');
  }

  static registrarCanal<Entrada, Saida>(
    canal: string,
    schema: ZodType<Entrada>,
    aoExecutar: (dados: Entrada) => Promise<Saida> | Saida,
  ): void {
    ipcMain.handle(canal, async (evento, bruto: unknown) => {
      if (!SegurancaIpc.origemPermitida(evento)) {
        throw new Error('Origem da chamada não autorizada.');
      }

      const dados = schema.parse(bruto);
      return aoExecutar(dados);
    });
  }
}
