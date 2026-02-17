// src/bootstrap/migrate.ts
import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import { pathToFileURL } from 'url';

function makeGlob(relPattern: string) {
  const abs = path.resolve(process.cwd(), relPattern);
  return abs.replace(/\\/g, '/');
}

/** Try to print the directory that contains the glob; helps when no files are found. */
function logDirPreview(globPath: string) {
  const dir = path.dirname(globPath);
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile())
      .map(e => e.name)
      .filter(n => n.endsWith('.js') || n.endsWith('.ts'));
    console.log('[migrate] Dir preview:', dir);
    console.log('[migrate] Files seen:', files.length ? files : '(none)');
  } catch (e: any) {
    console.warn('[migrate] Cannot read dir:', dir, e?.message);
  }
}

export function makeMigrator(sequelize: Sequelize) {
  const isProd = process.env.NODE_ENV === 'production';

  // NOTE: point to dist in prod, src in dev. Adjust to your layout.
  const rel = isProd 
    ? 'dist/main/rdbms/migrations/**/*.js'
    : 'src/main/rdbms/migrations/**/*.ts';

  const glob = makeGlob(rel);

  console.log('────────────────────────────────────────────────────────');
  console.log('[migrate] NODE_ENV:', process.env.NODE_ENV);
  console.log('[migrate] CWD     :', process.cwd());
  console.log('[migrate] Glob    :', glob);
  logDirPreview(glob);
  console.log('────────────────────────────────────────────────────────');

  const umzug = new Umzug({
    migrations: {
      glob,
      resolve: ({ name, path: p }) => {
        if (!p) throw new Error(`[migrate] Path missing for migration ${name}`);
        return {
          name,
          up: async () => {
            console.log(`[migrate] Loading module for: ${name} (${p})`);
            try {
              const mod: any = await import(pathToFileURL(p).href);
              const up =
                mod?.up ??
                mod?.default?.up ??
                (typeof mod?.default === 'function' ? mod.default : undefined);
              if (typeof up !== 'function') {
                throw new Error(`Migration ${name} has no 'up' export`);
              }
              console.time(`[migrate] up ${name}`);
              const res = await up(sequelize.getQueryInterface(), Sequelize);
              console.timeEnd(`[migrate] up ${name}`);
              return res;
            } catch (err) {
              console.error(`[migrate] Failed to run UP for ${name}:`, err);
              throw err;
            }
          },
          down: async () => {
            console.log(`[migrate] Loading module for DOWN: ${name} (${p})`);
            try {
              const mod: any = await import(pathToFileURL(p).href);
              const down =
                mod?.down ??
                mod?.default?.down ??
                (typeof mod?.default === 'function' ? undefined : mod?.default);
              if (!down) {
                console.warn(`[migrate] Migration ${name} has no 'down'; skipping`);
                return;
              }
              console.time(`[migrate] down ${name}`);
              const res = await down(sequelize.getQueryInterface(), Sequelize);
              console.timeEnd(`[migrate] down ${name}`);
              return res;
            } catch (err) {
              console.error(`[migrate] Failed to run DOWN for ${name}:`, err);
              throw err;
            }
          },
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console, // Umzug will log basic events
  });

  // Extra event hooks for more verbosity
  umzug.on('migrating', ev => console.log('[migrate] → migrating:', ev.name));
  umzug.on('migrated',  ev => console.log('[migrate] ✓ migrated :', ev.name));
  umzug.on('reverting', ev => console.log('[migrate] ↩ reverting:', ev.name));
  umzug.on('reverted',  ev => console.log('[migrate] ✓ reverted :', ev.name));

  return umzug;
}

/** Call this at startup for maximal visibility. */
export async function runMigrations(sequelize: Sequelize) {
  // Show DB info
  // @ts-ignore – dialect types differ by driver
  const { database, host, port } = (sequelize.config ?? {}) as any;
  // @ts-ignore
  const dialect = sequelize.getDialect?.() ?? sequelize.options?.dialect;
  console.log('[migrate] Dialect:', dialect, '| DB:', database, '| Host:', host, '| Port:', port);

  // Ensure connection
  console.log('[migrate] Testing DB connection…');
  await sequelize.authenticate();
  console.log('[migrate] DB connection OK');

  // What does SequelizeMeta say?
  try {
    const [rows] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY 1');
    console.log('[migrate] SequelizeMeta present, applied migrations:', (rows as any[]).map(r => r.name));
  } catch {
    console.log('[migrate] SequelizeMeta not found (first run is expected).');
  }

  const migrator = makeMigrator(sequelize);

  const executed = await migrator.executed();
  const pending  = await migrator.pending();

  console.log('[migrate] Executed:', executed.map(m => m.name));
  console.log('[migrate] Pending :', pending.map(m => m.name));

  if (pending.length === 0) {
    console.log('[migrate] No pending migrations.');
    return;
  }

  console.time('[migrate] up all');
  await migrator.up();
  console.timeEnd('[migrate] up all');

  const executedAfter = await migrator.executed();
  console.log('[migrate] Now executed:', executedAfter.map(m => m.name));
}
