jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    host: 'localhost',
    on: jest.fn(),
    close: jest.fn()
  }
}));

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../../config/db');

const connectionHandler = (event) => {
  const call = mongoose.connection.on.mock.calls.find(([name]) => name === event);
  return call && call[1];
};

describe('connectDB', () => {
  const originalUri = process.env.MONGODB_URI;
  let processOnSpy;

  beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    // Avoid registering real SIGINT/SIGTERM handlers on the test process.
    processOnSpy = jest.spyOn(process, 'on').mockImplementation(() => process);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    processOnSpy.mockRestore();
    if (originalUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = originalUri;
    }
  });

  it('connects with the configured URI and pool options', async () => {
    const conn = { connection: { host: 'db.example.com' } };
    mongoose.connect.mockResolvedValue(conn);

    await expect(connectDB()).resolves.toBe(conn);
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test', {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000
    });
  });

  it('registers error, disconnected and reconnected handlers', async () => {
    mongoose.connect.mockResolvedValue({ connection: { host: 'db' } });

    await connectDB();

    expect(mongoose.connection.on.mock.calls.map(([event]) => event)).toEqual(
      expect.arrayContaining(['error', 'disconnected', 'reconnected'])
    );
  });

  it('logs connection errors and reconnections without throwing', async () => {
    mongoose.connect.mockResolvedValue({ connection: { host: 'db' } });

    await connectDB();
    connectionHandler('error')(new Error('socket closed'));
    connectionHandler('reconnected')();

    expect(console.error).toHaveBeenCalledWith('❌ MongoDB connection error:', expect.any(Error));
  });

  it('schedules a reconnect attempt when the connection drops', async () => {
    mongoose.connect.mockResolvedValue({ connection: { host: 'db' } });

    await connectDB();
    mongoose.connect.mockClear();
    connectionHandler('disconnected')();

    expect(mongoose.connect).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000);
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it('retries after five seconds when the initial connection fails', async () => {
    mongoose.connect.mockRejectedValueOnce(new Error('unreachable'));

    await expect(connectDB()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('❌ Database connection failed:', 'unreachable');

    mongoose.connect.mockResolvedValue({ connection: { host: 'db' } });
    jest.advanceTimersByTime(5000);
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it('registers graceful shutdown handlers for SIGINT and SIGTERM', async () => {
    mongoose.connect.mockResolvedValue({ connection: { host: 'db' } });

    await connectDB();

    expect(processOnSpy.mock.calls.map(([signal]) => signal)).toEqual(
      expect.arrayContaining(['SIGINT', 'SIGTERM'])
    );
  });
});

describe('disconnectDB', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('closes the connection', async () => {
    mongoose.connection.close.mockResolvedValue(undefined);

    await disconnectDB();

    expect(mongoose.connection.close).toHaveBeenCalledTimes(1);
  });

  it('logs but swallows close failures', async () => {
    mongoose.connection.close.mockRejectedValue(new Error('already closed'));

    await expect(disconnectDB()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('❌ Error disconnecting from MongoDB:', 'already closed');
  });
});
