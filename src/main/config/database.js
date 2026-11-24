const path = require('path');
// O bundle roda em dist/main; o .env fica na raiz (cwd ao executar npm start).
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const mysql = require('mysql2');

const conexao = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'estudio_tattoo',
  charset: 'utf8mb4',
  // A aplicação nunca executa múltiplos comandos em uma chamada.
  // Só o script de migração (sql/init-db.js) habilita essa opção.
  multipleStatements: false,
});

module.exports = conexao;
