import {
  BcbPtaxProvider,
} from '../../../SergioWilliam2209/src/modules/exchange-rates/infrastructure/BcbPtaxProvider';
import {
  NodeFetchHttpClient,
} from '../../../SergioWilliam2209/src/modules/exchange-rates/infrastructure/NodeFetchHttpClient';
import {
  ExchangeRateService,
} from '../../../SergioWilliam2209/src/modules/exchange-rates/services/ExchangeRateService';
import type {
  ExchangeRateSide,
  ExchangeRateLookupContract,
} from '../../../SergioWilliam2209/src/modules/exchange-rates/contracts/exchange-rate.contracts';
import type { CurrencyCode } from '../../../SergioWilliam2209/src/shared/primitives';

/** Consulta temporária de compra e venda PTAX; não persiste snapshots. */
export class CotacaoDolarApplicationService {
  private readonly service: ExchangeRateLookupContract;

  constructor(service?: ExchangeRateLookupContract) {
    this.service = service ?? new ExchangeRateService(
      new BcbPtaxProvider(new NodeFetchHttpClient()),
    );
  }

  consultar(lado: ExchangeRateSide) {
    return this.service.getQuote({
      baseCurrency: 'USD' as CurrencyCode,
      quoteCurrency: 'BRL' as CurrencyCode,
      side: lado,
    });
  }
}
