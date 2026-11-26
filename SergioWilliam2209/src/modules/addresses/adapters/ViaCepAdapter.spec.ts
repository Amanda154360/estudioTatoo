import type { PostalCode } from "../contracts/address.contracts";
import {
  ViaCepAdapter,
} from "./ViaCepAdapter";
import {
  ViaCepHttpClientError,
  type ViaCepHttpClientPort,
  type ViaCepHttpResponse,
} from "../infrastructure/ViaCepHttpClientPort";

type Reply =
  | { readonly response: ViaCepHttpResponse }
  | { readonly error: Error };

class FakeViaCepClient implements ViaCepHttpClientPort {
  readonly requestedCeps: string[] = [];
  private readonly replies: Reply[];

  constructor(replies: readonly Reply[]) {
    this.replies = [...replies];
  }

  async consultarPorCep(cep: string): Promise<ViaCepHttpResponse> {
    this.requestedCeps.push(cep);
    const reply = this.replies.shift();
    if (!reply) throw new Error("Fake sem resposta.");
    if ("error" in reply) throw reply.error;
    return reply.response;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falha no teste ViaCEP: ${message}`);
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    cep: "01234-567",
    logradouro: "Rua Um",
    bairro: "Centro",
    localidade: "Campinas",
    uf: "sp",
    ibge: "3509502",
    ...overrides,
  };
}

function adapter(
  replies: readonly Reply[],
): { readonly adapter: ViaCepAdapter; readonly client: FakeViaCepClient } {
  const client = new FakeViaCepClient(replies);
  return { adapter: new ViaCepAdapter(client), client };
}

async function runTests(): Promise<void> {
  const found = adapter([{ response: { status: 200, body: validBody() } }]);
  const foundResult = await found.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(foundResult.ok && foundResult.value.found, "CEP válido encontrado");
  assert(foundResult.value.source === "external-api", "origem externa preservada");
  assert(foundResult.value.address.cep === "01234567", "CEP canonicalizado sem hífen");
  assert(foundResult.value.address.estado === "SP", "UF normalizada em maiúsculas");
  assert(foundResult.value.address.cidade === "Campinas", "localidade mapeada para cidade");
  assert(foundResult.value.address.ibge === "3509502", "IBGE mapeado");
  assert(found.client.requestedCeps[0] === "01234567", "zero à esquerda preservado");

  const hyphenated = adapter([{ response: { status: 200, body: validBody() } }]);
  const hyphenatedResult = await hyphenated.adapter.lookupExternal({
    postalCode: "01234-567" as PostalCode,
  });
  assert(hyphenatedResult.ok && hyphenatedResult.value.found, "entrada com hífen aceita");
  assert(hyphenated.client.requestedCeps[0] === "01234567", "hífen removido antes da consulta");

  const invalid = adapter([]);
  const invalidResult = await invalid.adapter.lookupExternal({
    postalCode: "0123A567" as PostalCode,
  });
  assert(!invalidResult.ok && invalidResult.error.code === "VALIDATION_FAILED", "CEP inválido");
  assert(invalid.client.requestedCeps.length === 0, "input inválido não consulta cliente");

  const absent = adapter([{ response: { status: 200, body: { erro: true } } }]);
  const absentResult = await absent.adapter.lookupExternal({
    postalCode: "99999999" as PostalCode,
  });
  assert(
    absentResult.ok &&
      !absentResult.value.found &&
      absentResult.value.source === "external-api",
    "erro true representa CEP não encontrado, não falha técnica",
  );

  const emptyStreet = adapter([{
    response: { status: 200, body: validBody({ logradouro: "" }) },
  }]);
  const emptyStreetResult = await emptyStreet.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    emptyStreetResult.ok &&
      emptyStreetResult.value.found &&
      emptyStreetResult.value.address.logradouro === "",
    "logradouro vazio é permitido",
  );

  const emptyNeighborhood = adapter([{
    response: { status: 200, body: validBody({ bairro: "" }) },
  }]);
  const emptyNeighborhoodResult = await emptyNeighborhood.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    emptyNeighborhoodResult.ok &&
      emptyNeighborhoodResult.value.found &&
      emptyNeighborhoodResult.value.address.bairro === "",
    "bairro vazio é permitido",
  );

  for (const malformed of [
    { cep: "01234-567" },
    validBody({ localidade: "" }),
    validBody({ uf: "Sao Paulo" }),
    validBody({ ibge: 3509502 }),
    validBody({ erro: "true" }),
    [],
    null,
  ]) {
    const invalidResponse = adapter([{ response: { status: 200, body: malformed } }]);
    const result = await invalidResponse.adapter.lookupExternal({
      postalCode: "01234567" as PostalCode,
    });
    assert(
      !result.ok && result.error.code === "INVALID_LOOKUP_RESPONSE",
      "resposta incompleta/inválida é rejeitada",
    );
  }

  const mismatch = adapter([{
    response: { status: 200, body: validBody({ cep: "76543-210" }) },
  }]);
  const mismatchResult = await mismatch.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !mismatchResult.ok && mismatchResult.error.code === "INVALID_LOOKUP_RESPONSE",
    "CEP retornado incompatível é rejeitado",
  );

  const invalidJson = adapter([
    { error: new ViaCepHttpClientError("invalid-response") },
  ]);
  const invalidJsonResult = await invalidJson.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !invalidJsonResult.ok &&
      invalidJsonResult.error.code === "INVALID_LOOKUP_RESPONSE",
    "JSON malformado é resposta inválida",
  );

  const httpFailure = adapter([
    { error: new ViaCepHttpClientError("http") },
  ]);
  const httpFailureResult = await httpFailure.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !httpFailureResult.ok &&
      httpFailureResult.error.code === "LOOKUP_UNAVAILABLE",
    "falha HTTP é indisponibilidade",
  );

  const timeout = adapter([
    { error: new ViaCepHttpClientError("timeout") },
  ]);
  const timeoutResult = await timeout.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !timeoutResult.ok && timeoutResult.error.code === "LOOKUP_TIMEOUT",
    "timeout tem código distinto de falha de rede",
  );

  const network = adapter([{ error: new Error("secret internal host") }]);
  const networkResult = await network.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !networkResult.ok &&
      networkResult.error.code === "LOOKUP_UNAVAILABLE" &&
      !networkResult.error.message.includes("secret"),
    "erro de rede é sanitizado",
  );

  const oversized = adapter([
    { error: new ViaCepHttpClientError("invalid-response") },
  ]);
  const oversizedResult = await oversized.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !oversizedResult.ok &&
      oversizedResult.error.code === "INVALID_LOOKUP_RESPONSE",
    "resposta excessiva é resposta inválida",
  );

  const redirect = adapter([
    { error: new ViaCepHttpClientError("redirect") },
  ]);
  const redirectResult = await redirect.adapter.lookupExternal({
    postalCode: "01234567" as PostalCode,
  });
  assert(
    !redirectResult.ok &&
      redirectResult.error.code === "LOOKUP_UNAVAILABLE",
    "redirect rejeitado não segue destino",
  );

  console.log("ViaCepAdapter tests passed (20 scenarios).");
}

void runTests();
