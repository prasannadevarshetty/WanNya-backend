jest.mock('jsonwebtoken');
jest.mock('../../models/User', () => ({ findById: jest.fn() }));

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { authenticate, optionalAuth, requireEmailVerification } = require('../../middleware/auth');
const en = require('../../locales/en.json');
const ja = require('../../locales/ja.json');
const { mockRequest, mockResponse } = require('../helpers/mockHttp');

const mockUserLookup = (user) => {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
};

const bearer = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

describe('authenticate', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('attaches the user and calls next for a valid token', async () => {
    const user = { _id: 'u1', name: 'Ana' };
    jwt.verify.mockReturnValue({ id: 'u1' });
    mockUserLookup(user);
    const req = mockRequest(bearer('valid'));
    const res = mockResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid', 'test-secret');
    expect(User.findById).toHaveBeenCalledWith('u1');
    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects requests without an Authorization header', async () => {
    const res = mockResponse();
    const next = jest.fn();

    await authenticate(mockRequest(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ message: en.accessDeniedNoToken, key: 'accessDeniedNoToken' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests when the token belongs to a deleted user', async () => {
    jwt.verify.mockReturnValue({ id: 'gone' });
    mockUserLookup(null);
    const res = mockResponse();
    const next = jest.fn();

    await authenticate(mockRequest(bearer('valid')), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.key).toBe('invalidTokenUserNotFound');
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['JsonWebTokenError', 'invalidToken'],
    ['TokenExpiredError', 'tokenExpired']
  ])('maps a %s to a 401 with key %s', async (errorName, key) => {
    const error = new Error('bad token');
    error.name = errorName;
    jwt.verify.mockImplementation(() => {
      throw error;
    });
    const res = mockResponse();

    await authenticate(mockRequest(bearer('bad')), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ message: en[key], key });
  });

  it('returns 500 for unexpected failures', async () => {
    jwt.verify.mockReturnValue({ id: 'u1' });
    User.findById.mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('db down')) });
    const res = mockResponse();

    await authenticate(mockRequest(bearer('valid')), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.key).toBe('serverErrorDuringAuthentication');
  });

  it('localises error messages using the lang query parameter', async () => {
    const res = mockResponse();

    await authenticate(mockRequest({ query: { lang: 'ja' } }), res, jest.fn());

    expect(res.body.message).toBe(ja.accessDeniedNoToken);
  });
});

describe('optionalAuth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('populates req.user when a valid token is present', async () => {
    const user = { _id: 'u1' };
    jwt.verify.mockReturnValue({ id: 'u1' });
    mockUserLookup(user);
    const req = mockRequest(bearer('valid'));
    const next = jest.fn();

    await optionalAuth(req, mockResponse(), next);

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('continues anonymously when no token is present', async () => {
    const req = mockRequest();
    const next = jest.fn();

    await optionalAuth(req, mockResponse(), next);

    expect(jwt.verify).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('continues anonymously when the user no longer exists', async () => {
    jwt.verify.mockReturnValue({ id: 'gone' });
    mockUserLookup(null);
    const req = mockRequest(bearer('valid'));

    await optionalAuth(req, mockResponse(), jest.fn());

    expect(req.user).toBeUndefined();
  });

  it('swallows token errors and calls next', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = mockRequest(bearer('bad'));
    const res = mockResponse();
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('requireEmailVerification', () => {
  it('calls next for verified users', () => {
    const next = jest.fn();
    const res = mockResponse();

    requireEmailVerification(mockRequest({ user: { isEmailVerified: true } }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 for unverified users', () => {
    const res = mockResponse();
    const next = jest.fn();

    requireEmailVerification(mockRequest({ user: { isEmailVerified: false } }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({
      message: en.emailVerificationRequired,
      key: 'emailVerificationRequired'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
