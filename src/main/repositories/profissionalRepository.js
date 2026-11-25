const conexao = require('../config/database');

class ProfissionalRepository {
  /**
   * Cadastra um novo profissional via Stored Procedure
   */
  cadastrar(p) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_cadastrar_profissional(?, ?, ?, ?, ?, ?, ?, ?)';
      const parametros = [
        p.nome,
        p.cpf || null,
        p.telefone,
        p.email || null,
        p.especialidade || 'Tatuador',
        p.comissao_percentual ? Number(p.comissao_percentual) : 0,
        p.ativo !== undefined ? (p.ativo ? 1 : 0) : 1,
        p.observacoes || null,
      ];

      conexao.query(sql, parametros, (erro, resultados) => {
        if (erro) return reject(erro);
        const dados = resultados && resultados[0] ? resultados[0][0] : {};
        resolve({ id: dados.id, ...p });
      });
    });
  }

  /**
   * Lista os profissionais do estúdio com filtros opcionais
   */
  listar(especialidade = '', apenasAtivos = 0) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_listar_profissionais(?, ?)';
      conexao.query(sql, [especialidade || null, apenasAtivos], (erro, resultados) => {
        if (erro) return reject(erro);
        const linhas = resultados && resultados[0] ? resultados[0] : [];
        resolve(linhas);
      });
    });
  }

  /**
   * Atualiza os dados do profissional
   */
  atualizar(p) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_atualizar_profissional(?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const parametros = [
        p.id,
        p.nome,
        p.cpf || null,
        p.telefone,
        p.email || null,
        p.especialidade,
        p.comissao_percentual ? Number(p.comissao_percentual) : 0,
        p.ativo !== undefined ? (p.ativo ? 1 : 0) : 1,
        p.observacoes || null,
      ];

      conexao.query(sql, parametros, (erro, resultados) => {
        if (erro) return reject(erro);
        resolve(resultados);
      });
    });
  }

  /**
   * Exclui um profissional pelo ID
   */
  excluir(id) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_excluir_profissional(?)';
      conexao.query(sql, [id], (erro, resultados) => {
        if (erro) return reject(erro);
        resolve(resultados);
      });
    });
  }

  /**
   * Busca um profissional por ID
   */
  buscarPorId(id) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_buscar_profissional_por_id(?)';
      conexao.query(sql, [id], (erro, resultados) => {
        if (erro) return reject(erro);
        const linhas = resultados && resultados[0] ? resultados[0] : [];
        resolve(linhas.length > 0 ? linhas[0] : null);
      });
    });
  }
}

module.exports = new ProfissionalRepository();
