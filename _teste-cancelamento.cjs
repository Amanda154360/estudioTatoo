const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4_unicode_ci',
  });

  const q = async (sql, p = []) => (await c.query(sql, p))[0];

  const [ag] = await q(
    "SELECT id FROM agendamentos WHERE observacoes LIKE 'DEMO: atendimento próximo%' LIMIT 1",
  );
  console.log('agendamento demo:', ag);

  // Volta o lembrete para Pendente e cancela o atendimento.
  await q("UPDATE lembretes SET status='Pendente', tentativas=0, enviado_em=NULL, erro=NULL WHERE agendamento_id=?", [ag.id]);
  await q("UPDATE agendamentos SET status='Cancelado' WHERE id=?", [ag.id]);

  const [antes] = await q('SELECT status FROM lembretes WHERE agendamento_id=?', [ag.id]);
  console.log('antes do ciclo:', antes.status);

  const [ger] = await q('CALL sp_gerar_lembretes_pendentes(48)');
  console.log('gerados no ciclo:', ger[0].lembretes_criados);

  const [depois] = await q('SELECT status FROM lembretes WHERE agendamento_id=?', [ag.id]);
  console.log('depois do ciclo:', depois.status);

  const [fila] = await q('CALL sp_lembretes_para_envio(10)');
  console.log('lembretes prontos para envio:', fila[0].length);

  // Restaura o cenário de demonstração.
  await q("UPDATE agendamentos SET status='Confirmado' WHERE id=?", [ag.id]);
  await q("UPDATE lembretes SET status='Pendente', tentativas=0, enviado_em=NULL, erro=NULL WHERE agendamento_id=?", [ag.id]);
  const [final] = await q('SELECT status, tentativas FROM lembretes WHERE agendamento_id=?', [ag.id]);
  console.log('restaurado para demo:', final);

  await c.end();
})();
