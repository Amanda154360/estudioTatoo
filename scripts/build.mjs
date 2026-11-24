import { build } from 'esbuild';
import { rmSync } from 'node:fs';

const COMUM = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info',
  // Dependências nativas ou com requires dinâmicos ficam fora do bundle.
  external: ['electron', 'mysql2', 'dotenv', 'nodemailer'],
};

rmSync('dist', { recursive: true, force: true });

await build({
  ...COMUM,
  entryPoints: ['src/main/main.ts'],
  outfile: 'dist/main/main.js',
});

await build({
  ...COMUM,
  entryPoints: ['src/main/preload.ts'],
  outfile: 'dist/main/preload.js',
});

await build({
  bundle: true,
  platform: 'browser',
  target: 'es2022',
  format: 'iife',
  sourcemap: true,
  logLevel: 'info',
  entryPoints: {
    servicos: 'src/renderer/pages/servicos.ts',
    lembretes: 'src/renderer/pages/lembretes.ts',
  },
  outdir: 'src/renderer/pages',
  banner: {
    js: '/* Arquivo gerado por scripts/build.mjs. Edite o .ts correspondente. */',
  },
});

console.log('[BUILD] Concluído.');
