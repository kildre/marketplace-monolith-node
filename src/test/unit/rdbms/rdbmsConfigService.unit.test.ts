// src/test/unit/rdbms/rdbmsConfigService.unit.test.ts
import 'reflect-metadata';

describe('rdbmsConfigService branch coverage (parsed.* || default)', () => {
  const REAL_ENV = process.env;

  const loadConfig = async () => {
    jest.resetModules();
    return await import('../../../main/service/config/rdbmsConfigService');
  };

  beforeEach(() => {
    process.env = { ...REAL_ENV };
    delete process.env['secret-env-postgresql'];
    delete process.env['SECRET_ENV_POSTGRESQL'];
  });

  afterAll(() => {
    process.env = REAL_ENV;
  });

  it('env precedence: prefers secret-env-postgresql over SECRET_ENV_POSTGRESQL', async () => {
    process.env['secret-env-postgresql'] =
      'postgres://alpha:apw@db-primary.local:5433/maindb';
    process.env['SECRET_ENV_POSTGRESQL'] =
      'postgres://beta:bpw@db-secondary.local:5432/otherdb';

    const cfg = await loadConfig();

    expect(cfg.rdbmsUrl).toBe('postgres://alpha:apw@db-primary.local:5433/maindb');
    expect(cfg.rdbmsDriver).toBe('postgres');           // from URL
    expect(cfg.rdbmsUser).toBe('alpha');                // from URL
    expect(cfg.rdbmsPassword).toBe('apw');              // from URL
    expect(cfg.rdbmsHost).toBe('db-primary.local');     // from URL
    expect(cfg.rdbmsPort).toBe('5433');                 // NOTE: ts-parse-database-url returns port as STRING
    expect(cfg.rdbmsDatabase).toBe('maindb');           // from URL
  });

  it('fallback to SECRET_ENV_POSTGRESQL when the lower-case var is absent', async () => {
    process.env['SECRET_ENV_POSTGRESQL'] =
      'postgres://me:secret@localhost:5432/appdb';

    const cfg = await loadConfig();

    expect(cfg.rdbmsDriver).toBe('postgres');
    expect(cfg.rdbmsUser).toBe('me');
    expect(cfg.rdbmsPassword).toBe('secret');
    expect(cfg.rdbmsHost).toBe('localhost');
    expect(cfg.rdbmsPort).toBe('5432');                // STRING
    expect(cfg.rdbmsDatabase).toBe('appdb');
  });

  it('defaults when URL is empty/unset → driver="sqlite3" (parser default), others empty/0', async () => {
    const cfg = await loadConfig();

    expect(cfg.rdbmsUrl).toBe('');
    // When no URL, ts-parse-database-url yields driver "sqlite3"
    expect(cfg.rdbmsDriver).toBe('sqlite3');
    expect(cfg.rdbmsUser).toBe('');
    expect(cfg.rdbmsPassword).toBe('');
    expect(cfg.rdbmsHost).toBe('');
    expect(cfg.rdbmsPort).toBe(0);                     // default from our code path
    expect(cfg.rdbmsDatabase).toBe('');
  });

  it('user branch: truthy when present, falsy → default when missing', async () => {
    process.env['secret-env-postgresql'] = 'postgres://u:p@h:5432/db';
    let cfg = await loadConfig();
    expect(cfg.rdbmsUser).toBe('u');                   // left side (parsed.user)

    // missing user → default ''
    process.env['secret-env-postgresql'] = 'postgres://h:5432/db';
    cfg = await loadConfig();
    expect(cfg.rdbmsUser).toBe('');                    // right side default
  });

  it('user branch: empty username segment (":") → default ""', async () => {
    process.env['secret-env-postgresql'] = 'postgres://:pw@h:5432/db';
    const cfg = await loadConfig();
    expect(cfg.rdbmsUser).toBe('');                    // empty → falsy → default
    expect(cfg.rdbmsPassword).toBe('pw');              // still truthy
  });

  it('password branch: present vs missing', async () => {
    process.env['secret-env-postgresql'] = 'postgres://u:pw@h:5432/db';
    let cfg = await loadConfig();
    expect(cfg.rdbmsPassword).toBe('pw');

    process.env['secret-env-postgresql'] = 'postgres://u@h:5432/db';
    cfg = await loadConfig();
    expect(cfg.rdbmsPassword).toBe('');                // default
  });

  it('host branch: present vs missing', async () => {
    process.env['secret-env-postgresql'] = 'postgres://u:p@host123:5432/db';
    let cfg = await loadConfig();
    expect(cfg.rdbmsHost).toBe('host123');

    // scheme with only path — parser yields no host → default ''
    process.env['secret-env-postgresql'] = 'postgres:///dbonly';
    cfg = await loadConfig();
    expect(cfg.rdbmsHost).toBe('');
  });

  it('port branch: present vs missing → present is STRING, missing → 0 (number)', async () => {
    process.env['secret-env-postgresql'] = 'postgres://u:p@h:6543/db';
    let cfg = await loadConfig();
    expect(cfg.rdbmsPort).toBe('6543');                // STRING when present

    process.env['secret-env-postgresql'] = 'postgres://u:p@h/db';
    cfg = await loadConfig();
    expect(cfg.rdbmsPort).toBe(0);                     // NUMBER when missing
  });

  it('database branch: present vs missing', async () => {
    process.env['secret-env-postgresql'] = 'postgres://u:p@h:5432/mydb';
    let cfg = await loadConfig();
    expect(cfg.rdbmsDatabase).toBe('mydb');

    process.env['secret-env-postgresql'] = 'postgres://u:p@h:5432';
    cfg = await loadConfig();
    expect(cfg.rdbmsDatabase).toBe('');                // default
  });

  it('driver branch: respects non-postgres scheme; scheme-less defaults to parser "sqlite3"', async () => {
    process.env['secret-env-postgresql'] = 'mysql://u:p@h:3306/mdb';
    let cfg = await loadConfig();
    expect(cfg.rdbmsDriver).toBe('mysql');             // left side (parsed.driver)

    // No scheme → parser sets driver "sqlite3", not undefined
    process.env['secret-env-postgresql'] = '//h:5432/db';
    cfg = await loadConfig();
    expect(cfg.rdbmsDriver).toBe('sqlite3');           // parser default wins
  });
});
