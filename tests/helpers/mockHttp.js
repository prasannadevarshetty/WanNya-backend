// Minimal Express req/res doubles for unit testing middleware and controllers.
const mockRequest = (overrides = {}) => ({
  query: {},
  params: {},
  body: {},
  headers: {},
  method: 'GET',
  originalUrl: '/api/test',
  header(name) {
    return this.headers[name] ?? this.headers[name.toLowerCase()];
  },
  get(name) {
    return this.headers[name] ?? this.headers[name.toLowerCase()];
  },
  ...overrides
});

const mockResponse = () => {
  const res = {
    statusCode: 200,
    body: undefined,
    listeners: {}
  };

  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });

  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });

  res.on = jest.fn((event, handler) => {
    res.listeners[event] = handler;
    return res;
  });

  res.emit = (event) => res.listeners[event] && res.listeners[event]();

  return res;
};

module.exports = { mockRequest, mockResponse };
