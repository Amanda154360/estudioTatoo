import {
  CrispinLocalCepAdapter,
  type LocalCepLookupPort,
} from '../../../SergioWilliam2209/src/modules/addresses/adapters/CrispinLocalCepAdapter';
import {
  ViaCepAdapter,
} from '../../../SergioWilliam2209/src/modules/addresses/adapters/ViaCepAdapter';
import {
  ViaCepHttpClient,
} from '../../../SergioWilliam2209/src/modules/addresses/infrastructure/ViaCepHttpClient';
import type {
  ViaCepHttpClientPort,
} from '../../../SergioWilliam2209/src/modules/addresses/infrastructure/ViaCepHttpClientPort';
import {
  CepLookupService,
} from '../../../SergioWilliam2209/src/modules/addresses/services/CepLookupService';
import type { AddressDto } from '../../../SergioWilliam2209/src/modules/addresses/contracts/address.contracts';

/** Pesquisa primeiro no catálogo existente e usa ViaCEP somente se não encontrar. */
export class CepLookupApplicationService {
  private readonly service: CepLookupService;

  constructor(
    local: LocalCepLookupPort,
    httpClient: ViaCepHttpClientPort = new ViaCepHttpClient(),
  ) {
    this.service = new CepLookupService(
      new CrispinLocalCepAdapter(local),
      new ViaCepAdapter(httpClient),
    );
  }

  async consultar(cep: string): Promise<AddressDto | null> {
    const result = await this.service.lookup({ postalCode: cep as AddressDto['cep'] });
    if (!result.ok) throw new Error(result.error.message);
    return result.value.found ? result.value.address : null;
  }
}
