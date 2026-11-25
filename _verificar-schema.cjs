const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const q = async (sql) => (await c.query(sql))[0];

  const tabelas = await q('SHOW TABLES');
  console.log('TABELAS (' + tabelas.length + '):', tabelas.map((r) => Object.values(r)[0]).join(', '));

  const procs = await q("SHOW PROCEDURE STATUS WHERE Db = DATABASE()");
  console.log('PROCEDURES (' + procs.length + '):', procs.map((p) => p.Name).sort().join(', '));

  const funcs = await q("SHOW FUNCTION STATUS WHERE Db = DATABASE()");
  console.log('FUNCTIONS (' + funcs.length + '):', funcs.map((f) => f.Name).sort().join(', '));

  const trigs = await q("SHOW TRIGGERS");
  console.log('TRIGGERS (' + trigs.length + '):', trigs.map((t) => t.Trigger).sort().join(', '));

  const views = await q("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
  console.log('VIEWS (' + views.length + '):', views.map((v) => Object.values(v)[0]).join(', '));

  const contagens = await q(`
    SELECT 'clientes' t, COUNT(*) n FROM clientes
    UNION ALL SELECT 'profissionais', COUNT(*) FROM profissionais
    UNION ALL SELECT 'servicos', COUNT(*) FROM servicos
    UNION ALL SELECT 'agendamentos', COUNT(*) FROM agendamentos
    UNION ALL SELECT 'lembretes', COUNT(*) FROM lembretes
  `);
  console.log('REGISTROS:', contagens.map((r) => `${r.t}=${r.n}`).join(', '));

  await c.end();
})();
