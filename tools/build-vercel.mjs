// Builds the deployment in Vercel's Build Output format (.vercel/output):
// the game as static files, and each leaderboard endpoint as one bundled
// Node function that already contains the game rules it replays runs with.
// Bundling here avoids Vercel's own TypeScript import resolution.
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = '.vercel/output';
const ROUTES = ['scores', 'leaderboard', 'report', 'forget'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/static`, { recursive: true });
cpSync('dist', `${OUT}/static`, { recursive: true });

for (const route of ROUTES) {
  const dir = `${OUT}/functions/api/${route}.func`;
  mkdirSync(dir, { recursive: true });
  await build({
    stdin: {
      contents: `import { nodeHandler } from './server/node';\nmodule.exports = nodeHandler(${JSON.stringify(route)});\n`,
      resolveDir: '.',
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: `${dir}/index.js`,
    logLevel: 'warning',
  });
  // The bundle is CommonJS; say so, since the repository itself uses ES modules.
  writeFileSync(`${dir}/package.json`, JSON.stringify({ type: 'commonjs' }));
  writeFileSync(
    `${dir}/.vc-config.json`,
    JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.js', launcherType: 'Nodejs', maxDuration: 10 }, null, 2),
  );
}

writeFileSync(`${OUT}/config.json`, JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }] }, null, 2));
console.log(`Built ${OUT}: static game + ${ROUTES.length} functions`);
