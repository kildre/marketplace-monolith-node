import run from './src/app.ts' ;

console.log('ENTRY', { pid: process.pid, ts: new Date().toISOString() });

// TEMP: guard against accidental re-entry
if (!(globalThis as any).__APP_STARTED__) {
  (globalThis as any).__APP_STARTED__ = true;
  run().catch((err) => {
    // log the full error (see section 2)
    console.error('Startup failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
} else {
  console.warn('App already started in this process, ignoring duplicate call.');
}
