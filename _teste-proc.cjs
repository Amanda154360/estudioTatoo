const mysql = require('mysql2/promise');
require('dotenv').config();

const base = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

(async () => {
  for (const charset of ['utf8mb4', 'UTF8MB4_UNICODE_CI', 'utf8mb4_unicode_ci']) {
    const c = await mysql.createConnection({ ...base, charset });
    const [v] = await c.query('SELECT @@character_set_connection cs, @@collation_connection col');
    console.log(charset, '->', v[0]);
    await c.end();
  }

  // Alternativa: SET NAMES explícito
  const c2 = await mysql.createConnection(base);
  await c2.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
  const [v2] = await c2.query('SELECT @@collation_connection col');
  console.log('SET NAMES ->', v2[0]);
  const [r] = await c2.query('CALL sp_listar_servicos(?, ?, ?)', ['', '', 0]);
  console.log('consulta OK:', r[0].length, 'linhas');
  await c2.end();
})();
