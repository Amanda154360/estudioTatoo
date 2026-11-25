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
  '09_procedures_servicos.sql',
  '10_tabelas_lembretes.sql',
  '11_procedures_lembretes.sql',
  '12_seeds_demo.sql',
];

async function executarMigracao() {
  console.log('=====================================================');
  console.log(' INICIANDO MIGRAÇÃO MODULAR DO BANCO DE DADOS (SQL)  ');
  console.log('=====================================================\n');

  const nomeBanco = process.env.DB_NAME || 'estudio_tattoo';
  if (!/^[A-Za-z0-9_]+$/.test(nomeBanco)) {
    throw new Error('DB_NAME inválido: use apenas letras, números e underline.');
  }

  let conexao;
  try {
    conexao = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
      charset: 'utf8mb4_unicode_ci',
      multipleStatements: true,
    });

    console.log('[OK] Conectado ao servidor MySQL com sucesso.');
    console.log(`[INFO] Banco de destino: ${nomeBanco}`);

    // Alinha o collation padrão do schema com o das tabelas (utf8mb4_unicode_ci).
    // Sem isso, parâmetros de procedures nascem com o padrão do servidor
    // (utf8mb4_0900_ai_ci no MySQL 8) e o LIKE falha com "Illegal mix of collations".
    try {
      await conexao.query(
        `ALTER DATABASE \`${nomeBanco}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      console.log('[OK] Collation padrão do banco ajustado para utf8mb4_unicode_ci.');
    } catch (erroCollation) {
      console.warn(
        '[AVISO] Não foi possível ajustar o collation do banco:',
        erroCollation.message,
      );
    }

    for (const arquivo of modulos) {
      const caminhoArquivo = path.join(__dirname, 'modules', arquivo);
      if (!fs.existsSync(caminhoArquivo)) {
        console.warn(`[AVISO] Módulo não encontrado: ${arquivo}`);
        continue;
      }

      console.log(`-> Executando módulo: ${arquivo}...`);
      const sql = fs.readFileSync(caminhoArquivo, 'utf8');

      // Remove delimitações específicas de CLI (DELIMITER $$ / DELIMITER ;) para execução pelo driver
      // e descarta CREATE DATABASE/USE fixos: o schema vem do .env (DB_NAME).
      const sqlProcessado = sql
        .replace(/CREATE\s+DATABASE[\s\S]*?;/gi, '')
        .replace(/^\s*USE\s+[^;]+;\s*$/gim, '')
        .replace(/DELIMITER\s+\$\$/gi, '')
        .replace(/DELIMITER\s+;/gi, '')
        .replace(/\$\$/g, ';');

      await conexao.query(`USE \`${nomeBanco}\``);
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
