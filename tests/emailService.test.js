const mockSendTransacEmail = jest.fn();

jest.mock('sib-api-v3-sdk', () => ({
  ApiClient: {
    instance: {
      authentications: {
        'api-key': {}
      }
    }
  },
  TransactionalEmailsApi: jest.fn().mockImplementation(() => ({
    sendTransacEmail: mockSendTransacEmail
  }))
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

process.env.BREVO_API_KEY = 'test-key';

const { sendOtpEmail } = require('../utils/emailService');

describe('sendOtpEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BREVO_API_KEY = 'test-key';
  });

  it('rejects when delivery fails so callers can invalidate the OTP', async () => {
    const providerError = new Error('provider down');
    mockSendTransacEmail.mockRejectedValueOnce(providerError);

    await expect(sendOtpEmail('user@example.com', '123456')).rejects.toThrow('provider down');
  });

  it('rejects when the API key is missing', async () => {
    delete process.env.BREVO_API_KEY;

    await expect(sendOtpEmail('user@example.com', '123456')).rejects.toThrow('BREVO_API_KEY');
    expect(mockSendTransacEmail).not.toHaveBeenCalled();
  });

  it('resolves on success', async () => {
    mockSendTransacEmail.mockResolvedValueOnce({});

    await expect(sendOtpEmail('user@example.com', '123456')).resolves.toBe(true);
  });
});
