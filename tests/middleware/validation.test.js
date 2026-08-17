const {
  validateUserRegistration,
  validateUserLogin,
  validateOtpRequest,
  validateOtpVerify,
  validateResetPassword,
  validateReview,
  validatePetCreation,
  handleValidationErrors
} = require('../../middleware/validation');
const en = require('../../locales/en.json');
const ja = require('../../locales/ja.json');
const { mockRequest, mockResponse } = require('../helpers/mockHttp');

// Runs a validation chain array the way Express would: every validator first,
// then the terminating handleValidationErrors middleware.
const runChain = async (chain, req) => {
  const res = mockResponse();
  const next = jest.fn();

  for (const validator of chain.slice(0, -1)) {
    await validator.run(req);
  }

  chain[chain.length - 1](req, res, next);

  return { res, next, passed: next.mock.calls.length === 1 };
};

const failedKeys = (res) => res.body.errors.map((error) => error.key);

describe('handleValidationErrors', () => {
  it('calls next when there are no validation errors', () => {
    const res = mockResponse();
    const next = jest.fn();

    handleValidationErrors(mockRequest(), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('validateUserRegistration', () => {
  it('accepts a valid registration payload', async () => {
    const { passed } = await runChain(
      validateUserRegistration,
      mockRequest({ body: { name: 'Ana', email: 'ana@example.com', password: 'Passw0rd' } })
    );

    expect(passed).toBe(true);
  });

  it('reports the name length, email and password strength problems', async () => {
    const { res, next } = await runChain(
      validateUserRegistration,
      mockRequest({ body: { name: 'A', email: 'not-an-email', password: 'alllowercase' } })
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({ message: en.validationFailed, key: 'validationFailed' });
    expect(failedKeys(res)).toEqual(
      expect.arrayContaining(['nameLength', 'validEmailRequired', 'passwordRequirements'])
    );
  });

  it('reports short passwords', async () => {
    const { res } = await runChain(
      validateUserRegistration,
      mockRequest({ body: { name: 'Ana', email: 'ana@example.com', password: 'Ab1' } })
    );

    expect(failedKeys(res)).toContain('passwordMinLength');
  });

  it('skips password rules when no password is supplied (social sign-up)', async () => {
    const { passed } = await runChain(
      validateUserRegistration,
      mockRequest({ body: { name: 'Ana', email: 'ana@example.com' } })
    );

    expect(passed).toBe(true);
  });

  it('returns messages translated into the requested language', async () => {
    const { res } = await runChain(
      validateUserRegistration,
      mockRequest({ query: { lang: 'ja' }, body: { name: 'A', email: 'ana@example.com' } })
    );

    expect(res.body.message).toBe(ja.validationFailed);
    expect(res.body.errors[0].message).toBe(ja.nameLength);
  });

  it('exposes the offending field name for each error', async () => {
    const { res } = await runChain(
      validateUserRegistration,
      mockRequest({ body: { name: 'A', email: 'ana@example.com' } })
    );

    expect(res.body.errors[0].field).toBe('name');
  });
});

describe('validateUserLogin', () => {
  it('accepts an email and password', async () => {
    const { passed } = await runChain(
      validateUserLogin,
      mockRequest({ body: { email: 'ana@example.com', password: 'anything' } })
    );

    expect(passed).toBe(true);
  });

  it('rejects a missing password', async () => {
    const { res } = await runChain(
      validateUserLogin,
      mockRequest({ body: { email: 'ana@example.com', password: '' } })
    );

    expect(failedKeys(res)).toContain('passwordRequired');
  });
});

describe('validateOtpRequest', () => {
  it('requires a valid email', async () => {
    const { res } = await runChain(validateOtpRequest, mockRequest({ body: { email: 'nope' } }));

    expect(failedKeys(res)).toEqual(['validEmailRequired']);
  });
});

describe('validateOtpVerify', () => {
  it('accepts a numeric OTP', async () => {
    const { passed } = await runChain(
      validateOtpVerify,
      mockRequest({ body: { email: 'ana@example.com', otp: '123456' } })
    );

    expect(passed).toBe(true);
  });

  it.each([['12'], ['12345678901'], ['12ab56']])('rejects the malformed OTP %s', async (otp) => {
    const { res } = await runChain(
      validateOtpVerify,
      mockRequest({ body: { email: 'ana@example.com', otp } })
    );

    expect(failedKeys(res)).toContain('otpNumeric');
  });
});

describe('validateResetPassword', () => {
  it('accepts an email, OTP and long enough new password', async () => {
    const { passed } = await runChain(
      validateResetPassword,
      mockRequest({ body: { email: 'ana@example.com', otp: '1234', newPassword: 'newpass' } })
    );

    expect(passed).toBe(true);
  });

  it('rejects a short new password', async () => {
    const { res } = await runChain(
      validateResetPassword,
      mockRequest({ body: { email: 'ana@example.com', otp: '1234', newPassword: 'abc' } })
    );

    expect(failedKeys(res)).toContain('newPasswordMinLength');
  });
});

describe('validateReview', () => {
  it('accepts a well formed review', async () => {
    const { passed } = await runChain(
      validateReview,
      mockRequest({
        body: { productId: '507f1f77bcf86cd799439011', rating: 4, comment: 'Great product' }
      })
    );

    expect(passed).toBe(true);
  });

  it.each([
    ['a non-Mongo product id', { productId: 'nope', rating: 4, comment: 'Great product' }],
    ['an out of range rating', { productId: '507f1f77bcf86cd799439011', rating: 9, comment: 'Great' }],
    ['a too short comment', { productId: '507f1f77bcf86cd799439011', rating: 4, comment: 'x' }]
  ])('rejects %s', async (_label, body) => {
    const { res, next } = await runChain(validateReview, mockRequest({ body }));

    expect(next).not.toHaveBeenCalled();
    expect(failedKeys(res)).toContain('invalidInputData');
  });
});

describe('validatePetCreation', () => {
  it('accepts a complete pet payload', async () => {
    const { passed } = await runChain(
      validatePetCreation,
      mockRequest({ body: { name: 'Momo', breed: 'Shiba', type: 'dog', dob: '2020-01-01' } })
    );

    expect(passed).toBe(true);
  });

  it('rejects an unsupported pet type', async () => {
    const { res } = await runChain(
      validatePetCreation,
      mockRequest({ body: { name: 'Momo', breed: 'Shiba', type: 'parrot', dob: '2020-01-01' } })
    );

    expect(res.body.errors.map((error) => error.field)).toContain('type');
  });

  it('reports every missing required field', async () => {
    const { res } = await runChain(validatePetCreation, mockRequest({ body: {} }));

    expect(res.body.errors.map((error) => error.field).sort()).toEqual(['breed', 'dob', 'name', 'type']);
  });
});
