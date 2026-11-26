import {
  CrispinLocalCepAdapter,
  type LocalCepLookupPort,
} from "./CrispinLocalCepAdapter";
import type { PostalCode } from "../contracts/address.contracts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falha no teste: ${message}`);
}

function row(cep = "12345-678"): Record<string, unknown> {
  return {
    cep,
    logradouro: "Rua de Teste",
    bairro: "Centro",
    cidade: "Campinas",
    estado: "SP",
    ibge: null,
    encontrado: 1,
  };
}

async function runTests(): Promise<void> {
  const normalizedInputs: string[] = [];
  const successfulPort: LocalCepLookupPort = {
    async buscarCepSql(cep) {
      normalizedInputs.push(cep);
      return row();
    },
  };
  const successfulAdapter = new CrispinLocalCepAdapter(successfulPort);

  const found = await successfulAdapter.lookupLocal({
    postalCode: "12345-678" as PostalCode,
  });
  assert(found.ok, "CEP encontrado deve retornar sucesso");
  assert(found.value.found, "resultado encontrado deve indicar found=true");
  assert(found.value.source === "local-mysql", "origem deve ser local-mysql");
  assert(found.value.address.cep === "12345678", "CEP de saída deve ser normalizado");
  assert(normalizedInputs[0] === "12345678", "consulta deve receber CEP sem hífen");

  const notFoundAdapter = new CrispinLocalCepAdapter({
    async buscarCepSql() {
      return null;
    },
  });
  const notFound = await notFoundAdapter.lookupLocal({
    postalCode: "12345678" as PostalCode,
  });
  assert(notFound.ok, "CEP ausente é um resultado, não uma falha técnica");
  assert(!notFound.value.found, "null do repositório deve significar não encontrado");

  let queriedInvalidPostalCode = false;
  const invalidInputAdapter = new CrispinLocalCepAdapter({
    async buscarCepSql() {
      queriedInvalidPostalCode = true;
      return row();
    },
  });
  const invalidInput = await invalidInputAdapter.lookupLocal({
    postalCode: "12A45-678" as PostalCode,
  });
  assert(!invalidInput.ok, "formato inválido deve falhar");
  assert(
    invalidInput.error.code === "VALIDATION_FAILED",
    "formato inválido deve ser erro de validação",
  );
  assert(!queriedInvalidPostalCode, "não deve consultar com CEP inválido");

  const malformedAdapter = new CrispinLocalCepAdapter({
    async buscarCepSql() {
      const malformed = row();
      delete malformed.bairro;
      return malformed;
    },
  });
  const malformed = await malformedAdapter.lookupLocal({
    postalCode: "12345678" as PostalCode,
  });
  assert(!malformed.ok, "resposta incompleta deve falhar");
  assert(
    malformed.error.code === "INVALID_LOOKUP_RESPONSE",
    "resposta incompleta deve ser identificada como inválida",
  );

  const failingAdapter = new CrispinLocalCepAdapter({
    async buscarCepSql() {
      throw new Error("ER_ACCESS_DENIED: internal database details");
    },
  });
  const failed = await failingAdapter.lookupLocal({
    postalCode: "12345678" as PostalCode,
  });
  assert(!failed.ok, "rejeição da dependência deve ser convertida em falha");
  assert(
    failed.error.code === "LOOKUP_UNAVAILABLE",
    "falha assíncrona deve ser identificada como indisponibilidade",
  );
  assert(
    !failed.error.message.includes("ER_ACCESS_DENIED"),
    "mensagem pública não deve expor erro interno",
  );

  for (const input of ["12345678", "12345-678"]) {
    const inputPort: LocalCepLookupPort = {
      async buscarCepSql(cep) {
        normalizedInputs.push(cep);
        return row();
      },
    };
    const result = await new CrispinLocalCepAdapter(inputPort).lookupLocal({
      postalCode: input as PostalCode,
    });
    assert(result.ok && result.value.found, `entrada ${input} deve ser aceita`);
    assert(
      normalizedInputs.at(-1) === "12345678",
      `entrada ${input} deve ser enviada normalizada`,
    );
  }

  console.log("CEP adapter tests passed (7 scenarios).");
}

void runTests();
