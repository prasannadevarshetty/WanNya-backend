const { generateOTP } = require('../../utils/otpGenerator');

describe('generateOTP', () => {
  it('returns a six digit numeric string', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateOTP()).toMatch(/^\d{6}$/);
    }
  });

  it.each([
    [0, '100000'],
    [0.999999999, '999999']
  ])('maps a random value of %s to %s', (randomValue, expected) => {
    jest.spyOn(Math, 'random').mockReturnValue(randomValue);

    expect(generateOTP()).toBe(expected);
  });
});
