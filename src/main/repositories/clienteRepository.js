const conexao = require('../config/database');

class ClienteRepository {
  /**
   * Cadastra um novo cliente no banco via Stored Procedure
   */
  cadastrar(c) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_cadastrar_cliente(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const parametros = [
        c.nome,
        c.cpf || null,
        c.telefone,
        c.email || null,
        c.data_nascimento || null,
        c.cep,
        c.logradouro,
        c.numero,
        c.complemento || null,
        c.bairro,
        c.cidade,
        c.estado,
        c.observacoes_medicas || null,
      ];

      conexao.query(sql, parametros, (erro, resultados) => {
        if (erro) return reject(erro);
        const dados = resultados && resultados[0] ? resultados[0][0] : {};
        resolve({ id: dados.id, ...c });
      });
    });
  }

  /**
   * Lista clientes com filtro opcional por Nome, CPF, Telefone ou CEP
   */
  listar(filtro = '') {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_listar_clientes(?)';
      conexao.query(sql, [filtro], (erro, resultados) => {
        if (erro) return reject(erro);
        const linhas = resultados && resultados[0] ? resultados[0] : [];
        resolve(linhas);
      });
    });
  }

  /**
   * Atualiza os dados do cliente
   */
  atualizar(c) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_atualizar_cliente(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const parametros = [
        c.id,
        c.nome,
        c.cpf || null,
        c.telefone,
        c.email || null,
        c.data_nascimento || null,
        c.cep,
        c.logradouro,
        c.numero,
        c.complemento || null,
        c.bairro,
        c.cidade,
        c.estado,
        c.observacoes_medicas || null,
      ];

      conexao.query(sql, parametros, (erro, resultados) => {
        if (erro) return reject(erro);
        resolve(resultados);
      });
    });
  }

  /**
   * Exclui um cliente pelo ID
   */
  excluir(id) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_excluir_cliente(?)';
      conexao.query(sql, [id], (erro, resultados) => {
        if (erro) return reject(erro);
        resolve(resultados);
      });
    });
  }

  /**
   * Busca um cliente por ID
   */
  buscarPorId(id) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_buscar_cliente_por_id(?)';
      conexao.query(sql, [id], (erro, resultados) => {
        if (erro) return reject(erro);
        const linhas = resultados && resultados[0] ? resultados[0] : [];
        resolve(linhas.length > 0 ? linhas[0] : null);
      });
    });
  }

  /**
   * Busca clientes por CEP
   */
  buscarPorCep(cep) {
    return new Promise((resolve, reject) => {
      const sql = 'CALL sp_buscar_clientes_por_cep(?)';
      conexao.query(sql, [cep], (erro, resultados) => {
        if (erro) return reject(erro);
        const linhas = resultados && resultados[0] ? resultados[0] : [];
        resolve(linhas);
      });
    });
  }
}

module.exports = new ClienteRepository();
