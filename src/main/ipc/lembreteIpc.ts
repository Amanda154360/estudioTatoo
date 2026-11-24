import { CANAIS } from '../../shared/contracts/ipc';
import { agendamentoIdSchema, idSchema, semParametrosSchema } from '../../shared/validation/comum';
import { filtroLembretesSchema } from '../../shared/validation/lembreteSchemas';
import { LembreteService } from '../application/LembreteService';
import { SegurancaIpc } from './seguranca';

export function registrarLembreteIpc(): void {
  const lembrete = new LembreteService();

  SegurancaIpc.registrarCanal(CANAIS.lembreteListar, filtroLembretesSchema, (filtro) =>
    lembrete.listar(filtro),
  );

  SegurancaIpc.registrarCanal(CANAIS.lembreteGerarPendentes, semParametrosSchema, async () =>
    lembrete.gerarPendentes(),
  );

  SegurancaIpc.registrarCanal(CANAIS.lembreteEnviarPendentes, semParametrosSchema, async () =>
    lembrete.enviarPendentes(),
  );

  SegurancaIpc.registrarCanal(CANAIS.lembreteReprocessar, idSchema, (id) =>
    lembrete.reprocessar(id),
  );

  SegurancaIpc.registrarCanal(CANAIS.lembreteCancelar, idSchema, (id) => lembrete.cancelar(id));

  SegurancaIpc.registrarCanal(CANAIS.lembreteExcluir, idSchema, (id) => lembrete.excluir(id));

  SegurancaIpc.registrarCanal(CANAIS.lembreteCriarManual, agendamentoIdSchema, (agendamentoId) =>
    lembrete.criarManual(agendamentoId),
  );
}
