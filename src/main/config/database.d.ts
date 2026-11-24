import type { Connection } from 'mysql2';

/**
 * Tipagem da conexão exportada por config/database.js (CommonJS).
 * O esbuild consome o .js em tempo de execução; este arquivo dá os tipos.
 */
declare const conexao: Connection;
export default conexao;
