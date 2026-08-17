const logger = require('../utils/logger');

describe('logError', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs the error instead of throwing (the local name used to shadow the error logger)', () => {
    const err = new Error('boom');
    err.statusCode = 500;

    expect(() => logger.logError(err)).not.toThrow();

    const logged = consoleSpy.mock.calls.map(call => call[0]).join('\n');
    expect(logged).toContain('Application Error');
    expect(logged).toContain('boom');
  });

  it('includes request context when given a request', () => {
    logger.logError(new Error('boom'), {
      method: 'POST',
      originalUrl: '/api/orders/create',
      ip: '127.0.0.1',
      user: { id: 'user-1' }
    });

    const logged = consoleSpy.mock.calls.map(call => call[0]).join('\n');
    expect(logged).toContain('/api/orders/create');
    expect(logged).toContain('user-1');
  });
});
