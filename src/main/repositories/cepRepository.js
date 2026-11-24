const conexao = require('../config/database');

class CepRepository {
  /**
   * Consulta um CEP diretamente no banco SQL via Stored Procedure
   * @param {string} cep 
   * @returns {Promise<object|null>}
   */
  buscarCep(cep) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_buscar_cep(?)';
      conexao.query(sql, [cep], (erro, resultados) => {
        if (erro) return reject(erro);
        const linhas = resultados && resultados[0] ? resultados[0] : [];
        resolve(linhas.length > 0 ? linhas[0] : null);
      });
    });
  }

  /**
   * Salva ou atualiza um CEP na base de dados
   */
  salvarCep(cep, logradouro, bairro, cidade, estado) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_salvar_cep(?, ?, ?, ?, ?)';
      conexao.query(sql, [cep, logradouro, bairro, cidade, estado], (erro, resultados) => {
        if (erro) return reject(erro);
        resolve(resultados);
      });
    });
  }
}

module.exports = new CepRepository();
