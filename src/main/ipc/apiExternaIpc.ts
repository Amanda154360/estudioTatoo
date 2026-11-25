import cepRepository from '../repositories/cepRepository';
import { CepLookupApplicationService } from '../application/CepLookupApplicationService';
import { CotacaoDolarApplicationService } from '../application/CotacaoDolarApplicationService';
import { CANAIS } from '../../shared/contracts/ipc';
import { SegurancaIpc } from './seguranca';
import { z } from 'zod';

const dataCep = z.string().trim().regex(/^(?:\d{8}|\d{5}-\d{3})$/);
const ladoSchema = z.enum(['buy', 'sell']);

export function registrarApiExternaIpc(): void {
  const cep = new CepLookupApplicationService({
    buscarCepSql: (codigo) => cepRepository.buscarCep(codigo),
  });
  const cotacao = new CotacaoDolarApplicationService();

  SegurancaIpc.registrarCanal(CANAIS.cepConsultarEndereco, dataCep, (codigo) =>
    cep.consultar(codigo),
  );
  SegurancaIpc.registrarCanal(CANAIS.cotacaoDolarConsultar, ladoSchema, (lado) =>
    cotacao.consultar(lado),
  );
}
