interface ErroMySql {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

class ErroEstruturaIndividualAusente extends Error {
  readonly code = 'INDIVIDUAL_SCHEMA_MISSING';

  constructor() {
    super(
      'As tabelas ou procedures de materiais e compras não estão disponíveis. Solicite a aplicação da migração individual aprovada; o aplicativo não cria a estrutura automaticamente.',
    );
    this.name = 'ErroEstruturaIndividualAusente';
  }
}

/**
 * Converte erros do MySQL em mensagens de domínio.
 * Evita devolver SQL, nome de tabela ou stack para o renderer.
 */
export class ErroBanco {
  static traduzir(erro: unknown, mensagemPadrao = 'Não foi possível concluir a operação no banco de dados.'): Error {
    if (typeof erro === 'object' && erro !== null) {
      const mysql = erro as ErroMySql;

      if (
        (mysql.code === 'ER_NO_SUCH_TABLE' || mysql.code === 'ER_SP_DOES_NOT_EXIST') &&
        /materiais|compras|itens_compra|sp_(listar|buscar|cadastrar|atualizar|excluir)_(material|materiais)|sp_(listar|buscar|criar|atualizar)_compra/i.test(
          mysql.sqlMessage ?? '',
        )
      ) {
        return new ErroEstruturaIndividualAusente();
      }

      if (mysql.code === 'ER_SIGNAL_EXCEPTION' && mysql.sqlMessage) {
        return new Error(mysql.sqlMessage);
      }

      if (mysql.code === 'ER_DUP_ENTRY') {
        return new Error('Já existe um registro com esses dados.');
      }

      if (mysql.code === 'ER_NO_REFERENCED_ROW_2' || mysql.code === 'ER_NO_REFERENCED_ROW') {
        return new Error('O registro vinculado não existe mais. Atualize a tela e tente novamente.');
      }

      if (mysql.code === 'ER_ROW_IS_REFERENCED_2' || mysql.code === 'ER_ROW_IS_REFERENCED') {
        return new Error('Este registro está em uso e não pode ser excluído.');
      }
    }

    return new Error(mensagemPadrao);
  }
}
