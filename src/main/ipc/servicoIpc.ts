import { CANAIS } from '../../shared/contracts/ipc';
import { idSchema } from '../../shared/validation/comum';
import {
  atualizacaoServicoSchema,
  dadosServicoSchema,
  filtroServicosSchema,
} from '../../shared/validation/servicoSchemas';
import { ServicoService } from '../application/ServicoService';
import { SegurancaIpc } from './seguranca';

export function registrarServicoIpc(): void {
  const servico = new ServicoService();

  SegurancaIpc.registrarCanal(CANAIS.servicoListar, filtroServicosSchema, (filtro) =>
    servico.listar(filtro),
  );

  SegurancaIpc.registrarCanal(CANAIS.servicoBuscar, idSchema, (id) => servico.buscar(id));

  SegurancaIpc.registrarCanal(CANAIS.servicoCriar, dadosServicoSchema, (dados) =>
    servico.criar(dados),
  );

  SegurancaIpc.registrarCanal(CANAIS.servicoAtualizar, atualizacaoServicoSchema, (dados) =>
    servico.atualizar(dados),
  );

  SegurancaIpc.registrarCanal(CANAIS.servicoExcluir, idSchema, (id) => servico.excluir(id));
}
