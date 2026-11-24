const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const modulos = [
  '01_tabelas.sql',
  '02_funcoes.sql',
  '03_triggers.sql',
  '04_views.sql',
  '05_procedures_ceps.sql',
  '06_procedures_clientes.sql',
  '07_procedures_profissionais.sql',
  '08_seeds.sql',
];

async function executarMigracao() {
  console.log('=====================================================');
  console.log(' INICIANDO MIGRAÇÃO MODULAR DO BANCO DE DADOS (SQL)  ');
  console.log('=====================================================\n');

  let conexao;
  try {
    conexao = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
      multipleStatements: true,
    });

    console.log('[OK] Conectado ao servidor MySQL com sucesso.');

    for (const arquivo of modulos) {
      const caminhoArquivo = path.join(__dirname, 'modules', arquivo);
      if (!fs.existsSync(caminhoArquivo)) {
        console.warn(`[AVISO] Módulo não encontrado: ${arquivo}`);
        continue;
      }

      console.log(`-> Executando módulo: ${arquivo}...`);
      const sql = fs.readFileSync(caminhoArquivo, 'utf8');

      // Remove delimitações específicas de CLI (DELIMITER $$ / DELIMITER ;) para execução pelo driver
      const sqlProcessado = sql
        .replace(/DELIMITER\s+\$\$/gi, '')
        .replace(/DELIMITER\s+;/gi, '')
        .replace(/\$\$/g, ';');

      await conexao.query(sqlProcessado);
      console.log(`   [CONCLUÍDO] ${arquivo} aplicado com sucesso.`);
    }

    console.log('\n=====================================================');
    console.log(' TODOS OS MÓDULOS SQL FORAM EXECUTADOS COM SUCESSO!  ');
    console.log('=====================================================');
  } catch (erro) {
    console.error('\n[ERRO FATAL NA MIGRAÇÃO]:', erro.message);
  } finally {
    if (conexao) {
      await conexao.end();
    }
  }
}

if (require.main === module) {
  executarMigracao();
}

module.exports = executarMigracao;
