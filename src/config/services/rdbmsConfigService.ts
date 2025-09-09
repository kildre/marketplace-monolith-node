import parseDatabaseUrl from 'ts-parse-database-url';

const dbUrl = process.env['secret-env-postgresql'] || '';

const parsed = parseDatabaseUrl(dbUrl);

export const rdbmsUser = parsed.user || '';
export const rdbmsPassword = parsed.password || '';
export const rdbmsDriver = parsed.driver || '';
export const rdbmsHost = parsed.host || '';
export const rdbmsPort = parsed.port || 0;
export const rdbmsDatabase = parsed.database || '';

