const jwt = require('jsonwebtoken');

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const { authenticate, optionalAuth } = require('../middleware/auth');

const createRes = () => ({
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
});

const createReq = (token) => ({
  method: 'GET',
  originalUrl: '/api/test',
  query: {},
  header: () => (token ? `Bearer ${token}` : undefined)
});

const mockUserLookup = (impl) => {
  User.findById.mockReturnValue({ select: impl });
};

describe('authenticate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('propagates unexpected errors instead of answering an opaque 500', async () => {
    const dbError = new Error('connection lost');
    mockUserLookup(() => Promise.reject(dbError));

    const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET);
    const res = createRes();
    const next = jest.fn();

    await authenticate(createReq(token), res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(dbError.statusCode).toBe(500);
    expect(res.statusCode).toBeNull();
  });

  it('still answers 401 for an invalid token', async () => {
    const res = createRes();
    const next = jest.fn();

    await authenticate(createReq('not-a-jwt'), res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('continues anonymously when the token is invalid', async () => {
    const req = createReq('not-a-jwt');
    const next = jest.fn();

    await optionalAuth(req, createRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
  });

  it('propagates database errors instead of silently dropping the user', async () => {
    const dbError = new Error('connection lost');
    mockUserLookup(() => Promise.reject(dbError));

    const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET);
    const next = jest.fn();

    await optionalAuth(createReq(token), createRes(), next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});
