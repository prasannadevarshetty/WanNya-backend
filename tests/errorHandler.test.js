const { AppError, globalErrorHandler, catchAsync, notFound } = require('../middleware/errorHandler');
const { logError, warn } = require('../utils/logger');

jest.mock('../utils/logger', () => ({
  logError: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}));

const createRes = () => {
  const res = {
    headersSent: false,
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  return res;
};

const createReq = (overrides = {}) => ({
  originalUrl: '/api/test',
  method: 'GET',
  query: {},
  ...overrides
});

describe('globalErrorHandler', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('records expected client errors as warnings', () => {
    const res = createRes();

    globalErrorHandler(new AppError('nope', 400, 'invalidInputData'), createReq(), res, jest.fn());

    expect(warn).toHaveBeenCalledTimes(1);
    expect(logError).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('nope');
  });

  it('logs unexpected errors with their stack', () => {
    const res = createRes();

    globalErrorHandler(new Error('unexpected'), createReq(), res, jest.fn());

    expect(logError).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(500);
  });

  it('maps mongoose CastError to a 400 in production', () => {
    const err = new Error('Cast to ObjectId failed');
    err.name = 'CastError';
    err.path = '_id';
    err.value = 'not-an-id';

    const res = createRes();
    globalErrorHandler(err, createReq(), res, jest.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body.key).toBe('invalidInputData');
  });

  it('handles duplicate key errors without an errmsg field', () => {
    const err = new Error('E11000 duplicate key error');
    err.name = 'MongoServerError';
    err.code = 11000;
    err.keyValue = { email: 'taken@example.com' };

    const res = createRes();
    globalErrorHandler(err, createReq(), res, jest.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('taken@example.com');
  });

  it('does not lose the error name when normalizing in production', () => {
    const err = new Error('bad input');
    err.name = 'ValidationError';
    err.errors = { name: { message: 'name is required' } };

    const res = createRes();
    globalErrorHandler(err, createReq(), res, jest.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body.key).toBe('validationFailed');
  });

  it('wraps thrown non-error values', () => {
    const res = createRes();

    globalErrorHandler('kaboom', createReq(), res, jest.fn());

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(res.statusCode).toBe(500);
  });

  it('delegates to express when the response has already been sent', () => {
    const res = createRes();
    res.headersSent = true;
    const next = jest.fn();
    const err = new AppError('too late', 500);

    globalErrorHandler(err, createReq(), res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.statusCode).toBeNull();
    expect(logError).toHaveBeenCalledTimes(1);
  });
});

describe('catchAsync', () => {
  it('forwards rejected promises to next', async () => {
    const err = new Error('async boom');
    const next = jest.fn();

    await catchAsync(async () => {
      throw err;
    })(createReq(), createRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('forwards synchronous throws to next', () => {
    const err = new Error('sync boom');
    const next = jest.fn();

    catchAsync(() => {
      throw err;
    })(createReq(), createRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('does not blow up on handlers that return a non-promise', () => {
    const next = jest.fn();

    expect(() => {
      catchAsync(() => 'not a promise')(createReq(), createRes(), next);
    }).not.toThrow();

    expect(next).not.toHaveBeenCalled();
  });
});

describe('notFound', () => {
  it('passes a keyed 404 AppError to next', () => {
    const next = jest.fn();

    notFound(createReq({ originalUrl: '/api/missing' }), createRes(), next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.key).toBe('notFound');
  });
});
