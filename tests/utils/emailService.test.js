const mockSendTransacEmail = jest.fn();
const mockApiKeyAuth = {};

jest.mock('sib-api-v3-sdk', () => ({
  ApiClient: {
    instance: { authentications: { 'api-key': mockApiKeyAuth } }
  },
  TransactionalEmailsApi: jest.fn(() => ({ sendTransacEmail: mockSendTransacEmail }))
}));

const loadEmailService = () => {
  jest.resetModules();
  return require('../../utils/emailService');
};

describe('sendOtpEmail', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.BREVO_API_KEY = 'brevo-key';
    process.env.BREVO_SENDER_EMAIL = 'noreply@wannya.test';
    mockSendTransacEmail.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('configures the Brevo client with the API key from the environment', () => {
    loadEmailService();

    expect(mockApiKeyAuth.apiKey).toBe('brevo-key');
  });

  it('sends the OTP to the recipient and resolves true', async () => {
    const { sendOtpEmail } = loadEmailService();
    mockSendTransacEmail.mockResolvedValue({});

    await expect(sendOtpEmail('ana@example.com', '123456')).resolves.toBe(true);

    const payload = mockSendTransacEmail.mock.calls[0][0];
    expect(payload.sender).toEqual({ email: 'noreply@wannya.test', name: 'WanNya' });
    expect(payload.to).toEqual([{ email: 'ana@example.com' }]);
    expect(payload.subject).toBe('Your WanNya OTP');
    expect(payload.htmlContent).toContain('123456');
  });

  it('resolves false when the provider rejects the send', async () => {
    const { sendOtpEmail } = loadEmailService();
    mockSendTransacEmail.mockRejectedValue(new Error('quota exceeded'));

    await expect(sendOtpEmail('ana@example.com', '123456')).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith('❌ Email error:', expect.any(Error));
  });
});
