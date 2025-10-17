import parseDatabaseUrl from 'ts-parse-database-url';

export const rdbmsUrl = process.env['secret-env-postgresql'] || process.env['SECRET_ENV_POSTGRESQL'] || '';

const parsed = parseDatabaseUrl(rdbmsUrl);

export const rdbmsUser = parsed.user || '';
export const rdbmsPassword = parsed.password || '';
export const rdbmsDriver = parsed.driver || 'postgres';
export const rdbmsHost = parsed.host || '';
export const rdbmsPort = parsed.port || 0;
export const rdbmsDatabase = parsed.database || '';

