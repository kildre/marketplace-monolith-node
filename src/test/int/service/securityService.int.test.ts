import fs from 'fs';
import os from 'os';
import path from 'path';
import { getCert } from '../../../main/service/securityService'; // <-- adjust import path

describe('getCert (integration)', () => {
  const CERT_ENV = 'SSL_CERT';
  const CERT_PATH_ENV = 'SSL_CERT_PATH';
  const originalEnv = { ...process.env };

  let tmpDir: string;
  let tmpFile: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'getcert-'));
  });

  afterAll(() => {
    try {
      if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      if (tmpDir && fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    } catch {
      // ignore cleanup errors
    }
  });

  beforeEach(() => {
    // reset env before each test
    process.env = { ...originalEnv };
    delete process.env[CERT_ENV];
    delete process.env[CERT_PATH_ENV];
    // ensure tmpFile is unique each test if needed
    tmpFile = path.join(tmpDir, `cert-${Date.now()}.pem`);
  });

  afterEach(() => {
    // cleanup created file
    if (fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  });

  it('returns env var cert with \\n sequences converted to real newlines', () => {
    const raw = '-----BEGIN CERT-----\\nLINE1\\nLINE2\\n-----END CERT-----';
    process.env[CERT_ENV] = raw;

    const result = getCert(CERT_ENV, CERT_PATH_ENV);

    expect(result).toBe('-----BEGIN CERT-----\nLINE1\nLINE2\n-----END CERT-----');
  });

  it('returns file contents when env value is absent but file path env is set', () => {
    const fileContent = '-----BEGIN CERT-----\nFILECERT\n-----END CERT-----';
    fs.writeFileSync(tmpFile, fileContent, { encoding: 'ascii' });
    process.env[CERT_PATH_ENV] = tmpFile;

    const result = getCert(CERT_ENV, CERT_PATH_ENV);

    expect(result).toBe(fileContent);
  });

  it('prefers env value (certName) over file path when both are set', () => {
    const envContent = 'ENV_CERT_LINE1\\nENV_CERT_LINE2';
    const fileContent = 'FILE_CERT_SHOULD_NOT_BE_USED';
    fs.writeFileSync(tmpFile, fileContent, { encoding: 'ascii' });

    process.env[CERT_ENV] = envContent;
    process.env[CERT_PATH_ENV] = tmpFile;

    const result = getCert(CERT_ENV, CERT_PATH_ENV);

    expect(result).toBe('ENV_CERT_LINE1\nENV_CERT_LINE2');
  });

  it('returns empty string when neither env var nor file path env is set', () => {
    const result = getCert(CERT_ENV, CERT_PATH_ENV);
    expect(result).toBe('');
  });

  it('throws when file path env is set but file does not exist', () => {
    process.env[CERT_PATH_ENV] = path.join(tmpDir, 'missing.pem');

    expect(() => getCert(CERT_ENV, CERT_PATH_ENV)).toThrow();
  });
});
