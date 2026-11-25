import type { MaterialDto } from "../contracts/material.contracts";
import type { MaterialId, UnitOfMeasure } from "../../../shared/primitives";
import type { ProcedureRow } from "../../persistence/contracts/ProcedureExecutorPort";

/**
 * Maps the provisional SQL column names to the domain DTO without exposing
 * the SQL-only `ativo` column through a contract that does not define it.
 */
export class MaterialSqlRowMapper {
  toDto(row: ProcedureRow): MaterialDto {
    const id = this.readPositiveInteger(row.id, "id");
    const name = this.readRequiredString(row.nome, "nome");
    const unit = this.readRequiredString(row.unidade_medida, "unidade_medida");
    const description = this.readOptionalString(row.descricao, "descricao");

    // Validate the SQL-only state, but intentionally do not add it to MaterialDto.
    this.readActiveFlag(row.ativo);

    return {
      id: id as MaterialId,
      name,
      ...(description === undefined ? {} : { description }),
      unit: unit as UnitOfMeasure,
    };
  }

  readPositiveInteger(value: unknown, field: string): number {
    const numberValue =
      typeof value === "number"
        ? value
        : typeof value === "string" && /^[0-9]+$/.test(value)
          ? Number(value)
          : Number.NaN;

    if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
      throw new MaterialSqlRowError(`Campo SQL inválido: ${field}.`);
    }
    return numberValue;
  }

  readActiveFlag(value: unknown): 0 | 1 {
    if (value === 0 || value === false) return 0;
    if (value === 1 || value === true) return 1;
    throw new MaterialSqlRowError("Campo SQL inválido: ativo.");
  }

  private readRequiredString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim() === "") {
      throw new MaterialSqlRowError(`Campo SQL inválido: ${field}.`);
    }
    return value;
  }

  private readOptionalString(value: unknown, field: string): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "string") {
      throw new MaterialSqlRowError(`Campo SQL inválido: ${field}.`);
    }
    return value === "" ? undefined : value;
  }
}

export class MaterialSqlRowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaterialSqlRowError";
  }
}
