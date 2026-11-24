const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const mysql = require('mysql2');

const conexao = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'estudio_tattoo',
  multipleStatements: true,
});

module.exports = conexao;
