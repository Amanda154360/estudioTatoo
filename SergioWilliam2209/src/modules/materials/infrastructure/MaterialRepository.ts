import type {
  CreateMaterialInput,
  ListMaterialsQuery,
  MaterialDto,
  UpdateMaterialInput,
} from "../contracts/material.contracts";
import type { MaterialId } from "../../../shared/primitives";
import type { ProcedureExecutorPort, ProcedureRow } from "../../persistence/contracts/ProcedureExecutorPort";
import { MaterialSqlRowError, MaterialSqlRowMapper } from "./MaterialSqlRowMapper";
import { MaterialRepositoryPort } from "./MaterialRepositoryPort";

const MATERIAL_NOT_FOUND_SIGNAL = "Material não encontrado.";

export type MaterialRepositoryErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "INVALID_SQL_RESPONSE"
  | "DATABASE_FAILURE";

/** Safe error surface: underlying driver/SQL details are never included. */
export class MaterialRepositoryError extends Error {
  constructor(
    readonly code: MaterialRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MaterialRepositoryError";
  }
}

/**
 * Materials repository backed by injected stored-procedure execution.
 * It owns neither a MySQL connection nor Electron dependencies.
 */
export class MaterialRepository implements MaterialRepositoryPort {
  constructor(
    private readonly executor: ProcedureExecutorPort,
    private readonly mapper: MaterialSqlRowMapper = new MaterialSqlRowMapper(),
  ) {}

  async findMany(query?: ListMaterialsQuery): Promise<readonly MaterialDto[]> {
    if (query?.search !== undefined && (typeof query.search !== "string" || query.search.length > 120)) {
      throw this.invalidInput("O termo de pesquisa deve ter até 120 caracteres.");
    }

    const rows = await this.call("CALL sp_listar_materiais(?)", [query?.search ?? null]);
    return rows.map((row) => this.mapRow(row));
  }

  async findById(id: MaterialId): Promise<MaterialDto | null> {
    this.validateId(id);
    const rows = await this.call("CALL sp_buscar_material_por_id(?)", [id]);
    if (rows.length === 0) return null;
    if (rows.length !== 1) {
      throw this.invalidSqlResponse();
    }
    return this.mapRow(rows[0]!);
  }

  async insert(input: CreateMaterialInput): Promise<MaterialDto> {
    this.validateName(input.name);
    this.validateUnit(input.unit);
    this.validateDescription(input.description);

    const rows = await this.call("CALL sp_cadastrar_material(?, ?, ?)", [
      input.name.trim(),
      input.description ?? null,
      input.unit.trim(),
    ]);
    if (rows.length !== 1) {
      throw this.invalidSqlResponse();
    }
    return this.mapRow(rows[0]!);
  }

  async update(
    id: MaterialId,
    input: UpdateMaterialInput,
  ): Promise<MaterialDto | null> {
    this.validateId(id);
    const existing = await this.findById(id);
    if (existing === null) return null;

    const name = input.name === undefined ? existing.name : input.name;
    const unit = input.unit === undefined ? existing.unit : input.unit;
    const description =
      input.description === undefined ? existing.description : input.description;

    this.validateName(name);
    this.validateUnit(unit);
    this.validateDescription(description);

    let rows: readonly ProcedureRow[];
    try {
      rows = await this.call(
        "CALL sp_atualizar_material(?, ?, ?, ?)",
        [id, name.trim(), description ?? null, unit.trim()],
        true,
      );
    } catch (error: unknown) {
      if (this.isRepositoryNotFound(error)) return null;
      throw error;
    }
    if (rows.length !== 1) {
      throw this.invalidSqlResponse();
    }
    return this.mapRow(rows[0]!);
  }

  async delete(id: MaterialId): Promise<boolean> {
    this.validateId(id);
    let rows: readonly ProcedureRow[];
    try {
      rows = await this.call("CALL sp_excluir_material(?)", [id], true);
    } catch (error: unknown) {
      if (this.isRepositoryNotFound(error)) return false;
      throw error;
    }
    if (rows.length !== 1) {
      throw this.invalidSqlResponse();
    }

    const row = rows[0]!;
    const returnedId = this.mapper.readPositiveInteger(row.id, "id");
    const active = this.mapper.readActiveFlag(row.ativo);
    if (returnedId !== id || active !== 0) {
      throw this.invalidSqlResponse();
    }
    return true;
  }

  private async call(
    sql: string,
    parameters: readonly unknown[],
    allowNotFound = false,
  ): Promise<readonly ProcedureRow[]> {
    try {
      return await this.executor.consultar(sql, parameters);
    } catch (error: unknown) {
      if (this.isMissingIndividualSchema(error)) {
        throw new MaterialRepositoryError("DATABASE_FAILURE", error.message);
      }
      if (allowNotFound && this.isNotFoundSignal(error)) {
        throw new MaterialRepositoryError("NOT_FOUND", "Material não encontrado.");
      }
      throw new MaterialRepositoryError(
        "DATABASE_FAILURE",
        "Não foi possível concluir a operação de materiais.",
      );
    }
  }

  private mapRow(row: ProcedureRow): MaterialDto {
    try {
      return this.mapper.toDto(row);
    } catch (error: unknown) {
      if (error instanceof MaterialSqlRowError) {
        throw new MaterialRepositoryError(
          "INVALID_SQL_RESPONSE",
          "O banco retornou dados de material inválidos.",
        );
      }
      throw error;
    }
  }

  private isNotFoundSignal(error: unknown): boolean {
    return error instanceof Error && error.message === MATERIAL_NOT_FOUND_SIGNAL;
  }

  private isMissingIndividualSchema(error: unknown): error is Error & { code: string } {
    return (
      error instanceof Error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "INDIVIDUAL_SCHEMA_MISSING"
    );
  }

  private isRepositoryNotFound(error: unknown): boolean {
    return error instanceof MaterialRepositoryError && error.code === "NOT_FOUND";
  }

  private validateId(id: MaterialId): void {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw this.invalidInput("Identificador de material inválido.");
    }
  }

  private validateName(value: string): void {
    if (typeof value !== "string" || value.trim() === "" || value.trim().length > 120) {
      throw this.invalidInput("O nome deve conter de 1 a 120 caracteres.");
    }
  }

  private validateUnit(value: string | undefined): asserts value is string {
    if (typeof value !== "string" || value.trim() === "" || value.trim().length > 30) {
      throw this.invalidInput("A unidade deve conter de 1 a 30 caracteres.");
    }
  }

  private validateDescription(value: string | undefined): void {
    if (value !== undefined && typeof value !== "string") {
      throw this.invalidInput("Descrição inválida.");
    }
  }

  private invalidInput(message: string): MaterialRepositoryError {
    return new MaterialRepositoryError("INVALID_INPUT", message);
  }

  private invalidSqlResponse(): MaterialRepositoryError {
    return new MaterialRepositoryError(
      "INVALID_SQL_RESPONSE",
      "O banco retornou uma resposta inesperada para materiais.",
    );
  }
}
