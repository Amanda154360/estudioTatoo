import type { ListPurchasesQuery, PurchaseDto } from "../contracts/purchase.contracts";
import type { PurchaseId } from "../../../shared/primitives";
import type {
  ProcedureExecutorPort,
  ProcedureRow,
} from "../../persistence/contracts/ProcedureExecutorPort";
import type { PurchaseRepositoryPort } from "./PurchaseRepositoryPort";
import {
  PurchaseSqlRowMapper,
  PurchaseSqlRowMapperError,
  type PurchaseReadDto,
} from "./PurchaseSqlRowMapper";

/** Read-only slice of the future full repository contract. */
export type PurchaseReadRepositoryPort = Pick<
  PurchaseRepositoryPort,
  "findMany" | "findById"
>;

export type PurchaseReadRepositoryErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_FILTER"
  | "INVALID_SQL_RESPONSE"
  | "DATABASE_FAILURE";

export class PurchaseReadRepositoryError extends Error {
  constructor(
    readonly code: PurchaseReadRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PurchaseReadRepositoryError";
  }
}

/** Read-only purchase repository. It receives, but never creates, a DB executor. */
export class PurchaseReadRepository implements PurchaseReadRepositoryPort {
  constructor(
    private readonly executor: ProcedureExecutorPort,
    private readonly mapper: PurchaseSqlRowMapper = new PurchaseSqlRowMapper(),
  ) {}

  async findMany(query?: ListPurchasesQuery): Promise<readonly PurchaseReadDto[]> {
    if (query?.supplierId !== undefined) {
      throw new PurchaseReadRepositoryError(
        "UNSUPPORTED_FILTER",
        "Filtro por fornecedor não está disponível no esquema atual.",
      );
    }

    const from = query?.from;
    const through = query?.through;
    if (from !== undefined && !this.isDateOnly(from)) {
      throw new PurchaseReadRepositoryError("INVALID_INPUT", "Data inicial inválida.");
    }
    if (through !== undefined && !this.isDateOnly(through)) {
      throw new PurchaseReadRepositoryError("INVALID_INPUT", "Data final inválida.");
    }
    if (from !== undefined && through !== undefined && from > through) {
      throw new PurchaseReadRepositoryError(
        "INVALID_INPUT",
        "O intervalo de datas da consulta é inválido.",
      );
    }

    const rows = await this.call(
      "CALL sp_listar_compras(?, ?)",
      [from ?? null, through ?? null],
    );
    return rows.map((row) => this.mapListRow(row));
  }

  async findById(id: PurchaseId): Promise<PurchaseReadDto | null> {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new PurchaseReadRepositoryError("INVALID_INPUT", "Identificador de compra inválido.");
    }

    const rows = await this.call("CALL sp_buscar_compra_por_id(?)", [id]);
    return this.mapDetailRows(rows);
  }

  private async call(
    sql: string,
    parameters: readonly unknown[],
  ): Promise<readonly ProcedureRow[]> {
    try {
      return await this.executor.consultar(sql, parameters);
    } catch (error: unknown) {
      if (isMissingIndividualSchema(error)) {
        throw new PurchaseReadRepositoryError(
          "DATABASE_FAILURE",
          error.message,
        );
      }
      throw new PurchaseReadRepositoryError(
        "DATABASE_FAILURE",
        "Não foi possível consultar compras.",
      );
    }
  }

  private mapListRow(row: ProcedureRow): PurchaseReadDto {
    try {
      return this.mapper.mapListRow(row);
    } catch (error: unknown) {
      this.handleMapperError(error);
    }
  }

  private mapDetailRows(rows: readonly ProcedureRow[]): PurchaseReadDto | null {
    try {
      return this.mapper.mapDetailRows(rows);
    } catch (error: unknown) {
      this.handleMapperError(error);
    }
  }

  private handleMapperError(error: unknown): never {
    if (error instanceof PurchaseSqlRowMapperError) {
      throw new PurchaseReadRepositoryError(
        "INVALID_SQL_RESPONSE",
        "O banco retornou dados de compra inválidos.",
      );
    }
    throw new PurchaseReadRepositoryError(
      "INVALID_SQL_RESPONSE",
      "O banco retornou uma resposta inesperada para compras.",
    );
  }

  private isDateOnly(value: string): boolean {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    if (year! < 1000 || year! > 9999) return false;
    const date = new Date(Date.UTC(year!, month! - 1, day!));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }
}

function isMissingIndividualSchema(error: unknown): error is Error & { code: string } {
  return (
    error instanceof Error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "INDIVIDUAL_SCHEMA_MISSING"
  );
}
