jest.mock('fs');

const path = require('path');
const { mockRequest, mockResponse } = require('../helpers/mockHttp');

const logsDir = path.join(__dirname, '..', '..', 'logs');

// The logger touches the filesystem while being required, so each test loads it
// against a freshly mocked fs module.
let fs;

const loadLogger = ({ existingDir = true, logLevel } = {}) => {
  jest.resetModules();
  fs = require('fs');
  fs.existsSync.mockReturnValue(existingDir);
  fs.mkdirSync.mockImplementation(() => undefined);
  fs.appendFileSync.mockImplementation(() => undefined);

  if (logLevel === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = logLevel;
  }

  return require('../../utils/logger');
};

const writtenEntries = () =>
  fs.appendFileSync.mock.calls.map(([, line]) => JSON.parse(line));

describe('logger', () => {
  const originalLogLevel = process.env.LOG_LEVEL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('creates the logs directory when it does not exist', () => {
    loadLogger({ existingDir: false });

    expect(fs.mkdirSync).toHaveBeenCalledWith(logsDir, { recursive: true });
  });

  it('does not recreate the logs directory when it already exists', () => {
    loadLogger({ existingDir: true });

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('writes a JSON entry with level, message and meta to a dated log file', () => {
    const logger = loadLogger();

    logger.info('hello', { userId: '42' });

    const [logFile] = fs.appendFileSync.mock.calls[0];
    expect(logFile).toMatch(/logs\/\d{4}-\d{2}-\d{2}\.log$/);
    expect(writtenEntries()[0]).toMatchObject({
      level: 'INFO',
      message: 'hello',
      meta: { userId: '42' }
    });
  });

  it('omits the meta field when no meta is provided', () => {
    const logger = loadLogger();

    logger.warn('careful');

    expect(writtenEntries()[0]).not.toHaveProperty('meta');
  });

  it('suppresses messages below the configured log level', () => {
    const logger = loadLogger({ logLevel: 'warn' });

    logger.info('not logged');
    logger.debug('not logged either');
    logger.error('logged');

    expect(writtenEntries().map((entry) => entry.level)).toEqual(['ERROR']);
  });

  it('emits debug output when the log level allows it', () => {
    const logger = loadLogger({ logLevel: 'debug' });

    logger.debug('verbose');
    logger.logDbOperation('find', 'users', { id: '1' });
    logger.logApiResponse(mockRequest(), mockResponse(), { ok: true });

    expect(writtenEntries().map((entry) => entry.level)).toEqual(['DEBUG', 'DEBUG', 'DEBUG']);
  });

  it('treats unknown levels as info priority', () => {
    const logger = loadLogger();

    logger.logger('trace', 'unknown level');

    expect(writtenEntries()[0].level).toBe('TRACE');
  });

  it('reports file write failures on the console instead of throwing', () => {
    const logger = loadLogger();
    fs.appendFileSync.mockImplementation(() => {
      throw new Error('disk full');
    });

    expect(() => logger.info('boom')).not.toThrow();
    expect(console.error).toHaveBeenCalledWith('Failed to write to log file:', expect.any(Error));
  });

  it('logs application errors with the stack and optional request context', () => {
    const logger = loadLogger();
    const failure = new Error('kaboom');

    logger.logError(failure);
    logger.logError(failure, mockRequest({ method: 'PUT', originalUrl: '/api/pets/1', user: { id: 'u9' } }));

    const entries = writtenEntries();
    expect(entries[0]).toMatchObject({ level: 'ERROR', message: 'Application Error' });
    expect(entries[0].meta).toMatchObject({ name: 'Error', message: 'kaboom' });
    expect(entries[0].meta).not.toHaveProperty('request');
    expect(entries[1].meta.request).toMatchObject({ method: 'PUT', url: '/api/pets/1', userId: 'u9' });
  });

  it('logs auth successes as info and failures as warn', () => {
    const logger = loadLogger();

    logger.logAuth('login', 'user-1', true);
    logger.logAuth('login', 'user-1', false, { reason: 'bad password' });

    const entries = writtenEntries();
    expect(entries.map((entry) => entry.level)).toEqual(['INFO', 'WARN']);
    expect(entries[1].meta).toMatchObject({ action: 'login', success: false, reason: 'bad password' });
  });

  describe('requestLogger', () => {
    it('logs the incoming request and calls next', () => {
      const logger = loadLogger();
      const req = mockRequest({ method: 'POST', originalUrl: '/api/pets', ip: '1.2.3.4', user: { id: 'u1' } });
      const res = mockResponse();
      const next = jest.fn();

      logger.requestLogger(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(writtenEntries()[0]).toMatchObject({
        level: 'INFO',
        message: 'POST /api/pets'
      });
    });

    it('logs error responses at warn level once the response finishes', () => {
      const logger = loadLogger();
      const req = mockRequest({ method: 'GET', originalUrl: '/api/pets' });
      const res = mockResponse();

      logger.requestLogger(req, res, jest.fn());
      res.statusCode = 500;
      res.emit('finish');

      const entries = writtenEntries();
      expect(entries[1].level).toBe('WARN');
      expect(entries[1].meta).toMatchObject({ statusCode: 500 });
      expect(entries[1].meta.duration).toBeGreaterThanOrEqual(0);
    });

    it('logs successful responses at info level once the response finishes', () => {
      const logger = loadLogger();
      const res = mockResponse();

      logger.requestLogger(mockRequest(), res, jest.fn());
      res.statusCode = 201;
      res.emit('finish');

      expect(writtenEntries()[1].level).toBe('INFO');
    });
  });

  describe('cleanOldLogs', () => {
    it('deletes log files older than seven days and keeps recent ones', () => {
      const logger = loadLogger();
      const now = Date.now();
      fs.readdirSync.mockReturnValue(['old.log', 'recent.log']);
      fs.statSync.mockImplementation((filePath) => ({
        mtime: filePath.endsWith('old.log')
          ? new Date(now - 8 * 24 * 60 * 60 * 1000)
          : new Date(now)
      }));
      fs.unlinkSync.mockImplementation(() => undefined);

      logger.cleanOldLogs();

      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(logsDir, 'old.log'));
    });

    it('does not throw when the logs directory cannot be read', () => {
      const logger = loadLogger();
      fs.readdirSync.mockImplementation(() => {
        throw new Error('nope');
      });

      expect(() => logger.cleanOldLogs()).not.toThrow();
    });
  });
});
