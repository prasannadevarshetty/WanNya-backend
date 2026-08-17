const { AppError, globalErrorHandler, catchAsync, notFound } = require('../../middleware/errorHandler');
const en = require('../../locales/en.json');
const { mockRequest, mockResponse } = require('../helpers/mockHttp');

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('AppError', () => {
  it('marks 4xx errors as fail and 5xx errors as error', () => {
    expect(new AppError('nope', 404, 'k').status).toBe('fail');
    expect(new AppError('boom', 500, 'k').status).toBe('error');
  });

  it('is operational and carries the translation key', () => {
    const err = new AppError('nope', 400, 'invalidInputData');

    expect(err).toBeInstanceOf(Error);
    expect(err.isOperational).toBe(true);
    expect(err.key).toBe('invalidInputData');
    expect(err.stack).toBeDefined();
  });
});

describe('globalErrorHandler in development', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  it('includes the stack and raw error for API routes', () => {
    const res = mockResponse();
    const err = new AppError('broken', 400, 'invalidInputData');

    globalErrorHandler(err, mockRequest({ originalUrl: '/api/pets' }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({ status: 'fail', message: 'broken', key: 'invalidInputData' });
    expect(res.body.stack).toBeDefined();
  });

  it('defaults missing status information to a 500 error', () => {
    const res = mockResponse();

    globalErrorHandler(new Error('unexpected'), mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.status).toBe('error');
  });

  it('returns a title/msg payload for non-API routes', () => {
    const res = mockResponse();

    globalErrorHandler(new AppError('broken', 400, 'k'), mockRequest({ originalUrl: '/health' }), res, jest.fn());

    expect(res.body).toEqual({ title: 'Something went wrong!', msg: 'broken' });
  });
});

describe('globalErrorHandler in production', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  it('exposes operational errors without the stack', () => {
    const res = mockResponse();

    globalErrorHandler(new AppError('no pet found', 404, 'userNotFound'), mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ status: 'fail', message: 'no pet found', key: 'userNotFound' });
  });

  it('hides details of unknown programming errors', () => {
    const res = mockResponse();

    globalErrorHandler(new Error('secret internals'), mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({
      status: 'error',
      message: en.somethingWentVeryWrong,
      key: 'somethingWentVeryWrong'
    });
  });

  it('converts a Mongoose CastError into a 400', () => {
    const res = mockResponse();
    const err = Object.assign(new Error('cast failed'), { name: 'CastError', path: '_id', value: 'abc' });

    globalErrorHandler(err, mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({ message: 'Invalid _id: abc', key: 'invalidInputData' });
  });

  it('converts a duplicate key error into a 400 naming the duplicate value', () => {
    const res = mockResponse();
    const err = Object.assign(new Error('dup'), {
      code: 11000,
      errmsg: 'E11000 duplicate key error: { email: "taken@example.com" }'
    });

    globalErrorHandler(err, mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toContain('"taken@example.com"');
    expect(res.body.key).toBe('invalidInputData');
  });

  it('aggregates Mongoose validation messages into a 400', () => {
    const res = mockResponse();
    const err = Object.assign(new Error('validation'), {
      name: 'ValidationError',
      errors: { name: { message: 'name is required' }, age: { message: 'age must be a number' } }
    });

    globalErrorHandler(err, mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toBe('Invalid input data. name is required. age must be a number');
    expect(res.body.key).toBe('validationFailed');
  });

  it.each([
    ['JsonWebTokenError', 'invalidTokenLoginAgain'],
    ['TokenExpiredError', 'tokenExpiredLoginAgain']
  ])('turns a %s into a 401 with key %s', (name, key) => {
    const res = mockResponse();

    globalErrorHandler(Object.assign(new Error('jwt'), { name }), mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ status: 'fail', message: en[key], key });
  });

  it('returns a generic page payload for operational non-API errors', () => {
    const res = mockResponse();

    globalErrorHandler(new AppError('broken', 400, 'k'), mockRequest({ originalUrl: '/health' }), res, jest.fn());

    expect(res.body).toEqual({ title: en.somethingWentWrong, msg: 'broken' });
  });

  it('hides details of unknown non-API errors', () => {
    const res = mockResponse();

    globalErrorHandler(new Error('secret internals'), mockRequest({ originalUrl: '/health' }), res, jest.fn());

    expect(res.body).toEqual({ title: en.somethingWentWrong, msg: en.pleaseTryAgainLater });
  });
});

describe('catchAsync', () => {
  it('forwards rejections to next', async () => {
    const failure = new Error('async boom');
    const next = jest.fn();

    await catchAsync(async () => {
      throw failure;
    })(mockRequest(), mockResponse(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });

  it('passes the handler arguments through and does not call next on success', async () => {
    const handler = jest.fn().mockResolvedValue('ok');
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    await catchAsync(handler)(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('notFound', () => {
  it('passes a 404 AppError describing the unknown route to next', () => {
    const next = jest.fn();

    notFound(mockRequest({ originalUrl: '/api/nope' }), mockResponse(), next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Can't find /api/nope on this server!");
  });
});
