import type {
  AddressDto,
  AddressLookupContract,
  AddressLookupError,
  AddressLookupQuery,
  AddressLookupResult,
  PostalCode,
} from "../contracts/address.contracts";
import type { Result } from "../../../shared/result";
import type { ValidationError } from "../../../shared/validation";
import { CepLookupService } from "./CepLookupService";

type LookupReply = Result<
  AddressLookupResult,
  AddressLookupError | ValidationError
>;

class FakeLocalLookup implements Pick<AddressLookupContract, "lookupLocal"> {
  readonly calls: string[] = [];

  constructor(private readonly reply: LookupReply | Error) {}

  async lookupLocal(query: AddressLookupQuery): Promise<LookupReply> {
    this.calls.push(query.postalCode);
    if (this.reply instanceof Error) throw this.reply;
    return this.reply;
  }
}

class FakeExternalLookup implements Pick<AddressLookupContract, "lookupExternal"> {
  readonly calls: string[] = [];

  constructor(private readonly reply: LookupReply | Error) {}

  async lookupExternal(query: AddressLookupQuery): Promise<LookupReply> {
    this.calls.push(query.postalCode);
    if (this.reply instanceof Error) throw this.reply;
    return this.reply;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falha no teste do serviço CEP: ${message}`);
}

function address(cep = "01234567"): AddressDto {
  return {
    cep: cep as PostalCode,
    logradouro: "Rua Teste",
    bairro: "Centro",
    cidade: "Campinas",
    estado: "SP",
    ibge: "3509502",
  };
}

function found(
  source: "local-mysql" | "external-api",
  cep = "01234567",
): LookupReply {
  return {
    ok: true,
    value: { found: true, source, address: address(cep) },
  };
}

function missing(source: "local-mysql" | "external-api"): LookupReply {
  return { ok: true, value: { found: false, source } };
}

function failure(
  code: AddressLookupError["code"],
  message = "public-safe",
): LookupReply {
  return { ok: false, error: { code, message } };
}

function makeService(
  localReply: LookupReply | Error,
  externalReply: LookupReply | Error,
): {
  readonly service: CepLookupService;
  readonly local: FakeLocalLookup;
  readonly external: FakeExternalLookup;
  readonly order: string[];
} {
  const local = new FakeLocalLookup(localReply);
  const external = new FakeExternalLookup(externalReply);
  const order: string[] = [];
  const tracedLocal: Pick<AddressLookupContract, "lookupLocal"> = {
    async lookupLocal(query) {
      order.push("local");
      return local.lookupLocal(query);
    },
  };
  const tracedExternal: Pick<AddressLookupContract, "lookupExternal"> = {
    async lookupExternal(query) {
      order.push("external");
      return external.lookupExternal(query);
    },
  };
  return {
    service: new CepLookupService(tracedLocal, tracedExternal),
    local,
    external,
    order,
  };
}

async function runTests(): Promise<void> {
  const localFound = makeService(found("local-mysql"), missing("external-api"));
  const localResult = await localFound.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(localResult.ok && localResult.value.found, "local hit retorna endereço");
  assert(localResult.value.source === "local-mysql", "origem local preservada");
  assert(localFound.local.calls.length === 1, "local consultado uma vez");
  assert(localFound.external.calls.length === 0, "ViaCEP não é chamado no local hit");
  assert(localFound.order.join(",") === "local", "local retorna imediatamente");

  const fallbackFound = makeService(missing("local-mysql"), found("external-api"));
  const fallbackResult = await fallbackFound.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(fallbackResult.ok && fallbackResult.value.found, "fallback externo retorna endereço");
  assert(fallbackResult.value.source === "external-api", "origem externa preservada");
  assert(
    fallbackFound.order.join(",") === "local,external",
    "ordem de consulta é local e depois externa",
  );
  assert(
    fallbackFound.local.calls[0] === "01234567" &&
      fallbackFound.external.calls[0] === "01234567",
    "ambas as fontes recebem CEP canônico",
  );

  const bothMiss = makeService(missing("local-mysql"), missing("external-api"));
  const bothMissResult = await bothMiss.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    bothMissResult.ok &&
      !bothMissResult.value.found &&
      bothMissResult.value.source === "external-api",
    "duas ausências retornam found=false",
  );
  assert(bothMiss.order.join(",") === "local,external", "fallback só depois da ausência local");

  const invalid = makeService(missing("local-mysql"), missing("external-api"));
  const invalidResult = await invalid.service.lookup({
    postalCode: "0123A567" as PostalCode,
  });
  assert(!invalidResult.ok && invalidResult.error.code === "VALIDATION_FAILED", "CEP inválido rejeitado");
  assert(
    invalid.local.calls.length === 0 && invalid.external.calls.length === 0,
    "input inválido não chama fontes",
  );

  const formatted = makeService(missing("local-mysql"), found("external-api"));
  const formattedResult = await formatted.service.lookup({
    postalCode: "01234-567" as PostalCode,
  });
  assert(formattedResult.ok && formattedResult.value.found, "CEP com hífen aceito");
  assert(formatted.local.calls[0] === "01234567", "hífen retirado para o local");
  assert(formatted.external.calls[0] === "01234567", "hífen retirado para o externo");

  const leadingZero = makeService(
    missing("local-mysql"),
    found("external-api", "00123456"),
  );
  const leadingZeroResult = await leadingZero.service.lookup({
    postalCode: "00123456" as PostalCode,
  });
  assert(leadingZeroResult.ok && leadingZeroResult.value.found, "CEP com zero inicial consultado");
  assert(leadingZero.local.calls[0] === "00123456", "zero inicial preservado no local");
  assert(leadingZero.external.calls[0] === "00123456", "zero inicial preservado no externo");

  const localUnavailable = makeService(
    failure("LOOKUP_UNAVAILABLE", "DB_PASSWORD_SECRET"),
    found("external-api"),
  );
  const localUnavailableResult = await localUnavailable.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !localUnavailableResult.ok &&
      localUnavailableResult.error.code === "LOOKUP_UNAVAILABLE" &&
      !localUnavailableResult.error.message.includes("SECRET"),
    "erro local seguro é propagado",
  );
  assert(localUnavailable.external.calls.length === 0, "falha local não dispara fallback");

  const localInvalid = makeService(
    failure("INVALID_LOOKUP_RESPONSE", "private driver detail"),
    found("external-api"),
  );
  const localInvalidResult = await localInvalid.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !localInvalidResult.ok &&
      localInvalidResult.error.code === "INVALID_LOOKUP_RESPONSE",
    "resposta local inválida é propagada",
  );
  assert(localInvalid.external.calls.length === 0, "resposta local inválida não dispara fallback");

  const localThrows = makeService(
    new Error("private SQL connection"),
    found("external-api"),
  );
  const localThrowsResult = await localThrows.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !localThrowsResult.ok &&
      localThrowsResult.error.code === "LOOKUP_UNAVAILABLE" &&
      !localThrowsResult.error.message.includes("SQL"),
    "rejeição inesperada local vira erro público seguro",
  );
  assert(localThrows.external.calls.length === 0, "rejeição local não dispara fallback");

  const timeout = makeService(
    missing("local-mysql"),
    failure("LOOKUP_TIMEOUT", "private timeout details"),
  );
  const timeoutResult = await timeout.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !timeoutResult.ok &&
      timeoutResult.error.code === "LOOKUP_TIMEOUT" &&
      !timeoutResult.error.message.includes("private"),
    "timeout externo preserva categoria sem vazar detalhes",
  );

  const externalUnavailable = makeService(
    missing("local-mysql"),
    failure("LOOKUP_UNAVAILABLE", "network host secret"),
  );
  const externalUnavailableResult = await externalUnavailable.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !externalUnavailableResult.ok &&
      externalUnavailableResult.error.code === "LOOKUP_UNAVAILABLE" &&
      !externalUnavailableResult.error.message.includes("secret"),
    "falha de rede externa não é tratada como ausência",
  );

  const externalInvalid = makeService(
    missing("local-mysql"),
    failure("INVALID_LOOKUP_RESPONSE"),
  );
  const externalInvalidResult = await externalInvalid.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !externalInvalidResult.ok &&
      externalInvalidResult.error.code === "INVALID_LOOKUP_RESPONSE",
    "resposta externa inválida não é tratada como ausência",
  );

  const externalThrows = makeService(
    missing("local-mysql"),
    new Error("private network stack"),
  );
  const externalThrowsResult = await externalThrows.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !externalThrowsResult.ok &&
      externalThrowsResult.error.code === "LOOKUP_UNAVAILABLE" &&
      !externalThrowsResult.error.message.includes("stack"),
    "rejeição externa inesperada vira erro seguro",
  );

  const wrongLocalSource = makeService(
    missing("external-api"),
    found("external-api"),
  );
  const wrongLocalResult = await wrongLocalSource.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !wrongLocalResult.ok &&
      wrongLocalResult.error.code === "INVALID_LOOKUP_RESPONSE",
    "ausência com origem incompatível não dispara fallback",
  );
  assert(wrongLocalSource.external.calls.length === 0, "origem inválida para antes do ViaCEP");

  const mismatchedExternal = makeService(
    missing("local-mysql"),
    found("external-api", "76543210"),
  );
  const mismatchedResult = await mismatchedExternal.service.lookup({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !mismatchedResult.ok &&
      mismatchedResult.error.code === "INVALID_LOOKUP_RESPONSE",
    "endereço externo com outro CEP é rejeitado",
  );

  // Ports expose lookup operations only; this coordinator has no write capability.
  assert(
    !("salvarCep" in (new CepLookupService(
      new FakeLocalLookup(missing("local-mysql")),
      new FakeExternalLookup(missing("external-api")),
    ) as object)),
    "serviço não expõe operação de persistência",
  );

  console.log("CepLookupService tests passed (16 scenarios).");
}

void runTests();
