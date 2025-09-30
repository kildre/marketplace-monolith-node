// src/bootstrap/migrate.ts
import path from 'path';
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import { pathToFileURL } from 'url';

//const isProd = process.env.NODE_ENV === 'production';

// Register only in dev
//if (!isProd) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
//  require('ts-node/register/transpile-only');
  // If you use TS path aliases:
//  try { require('tsconfig-paths/register'); } catch {}
//}

/** Normalize a glob for Umzug across OSes. */
function makeGlob(relPattern: string) {
  // Use cwd + forward slashes so globs work on Windows too
  const abs = path.resolve(process.cwd(), relPattern);
  return abs.replace(/\\/g, '/'); // ensure forward slashes
}

export function makeMigrator(sequelize: Sequelize) {
  // Adjust the relative path to where your migrations live (from project root)
  const glob = makeGlob('src/main/rdbms/migrations/*.js');
  console.log('[migrate] Using migration glob:', glob);

  return new Umzug({
    migrations: {
      glob,
      // Support both CJS & ESM & default exports
      resolve: ({ name, path: p }) => {
        if (!p) throw new Error(`[migrate] Path missing for migration ${name}`);

        const load = async () => {
          // Prefer dynamic import so it works in ESM projects too
          const mod: any =
            (await import(pathToFileURL(p).href)) ?? {};
          const up =
            mod.up ??
            mod.default?.up ??
            (mod.default && typeof mod.default === 'function' ? mod.default : undefined);
          const down =
            mod.down ??
            mod.default?.down ??
            (mod.default && typeof mod.default === 'function' ? undefined : mod.default);

          if (typeof up !== 'function') {
            throw new Error(`[migrate] Migration ${name} does not export an 'up' function`);
          }
          return { up, down };
        };

        return {
          name,
          up: async () => {
            const { up } = await load();
            return up(sequelize.getQueryInterface(), Sequelize);
          },
          down: async () => {
            const { down } = await load();
            if (!down) {
              console.warn(`[migrate] Migration ${name} has no 'down'; skipping`);
              return;
            }
            return down(sequelize.getQueryInterface(), Sequelize);
          },
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }), // table "SequelizeMeta"
    logger: console,
  });
}
