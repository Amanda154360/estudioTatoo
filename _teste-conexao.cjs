const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: '143.106.241.4',
    user: 'cl205349',
    password: 'cl*31122008',
    connectTimeout: 8000,
  });

  const [grants] = await c.query('SHOW GRANTS');
  console.log('GRANTS:', grants.map((g) => Object.values(g)[0]).join('\n'));

  try {
    await c.query('CREATE DATABASE IF NOT EXISTS estudio_tattoo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('CREATE DATABASE: permitido');
    const [t] = await c.query('SHOW TABLES FROM estudio_tattoo');
    console.log('tabelas em estudio_tattoo:', t.length);
  } catch (e) {
    console.log('CREATE DATABASE: negado ->', e.code, e.message);
  }

  const [t2] = await c.query('SHOW TABLES FROM cl205349');
  console.log('tabelas em cl205349:', t2.length, t2.map((r) => Object.values(r)[0]).join(', '));

  await c.end();
})();
