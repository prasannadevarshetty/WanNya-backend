const { getTranslations, translate } = require('../../utils/translate');

const en = require('../../locales/en.json');
const ja = require('../../locales/ja.json');

describe('getTranslations', () => {
  it('returns the locale bundle for a supported language', () => {
    expect(getTranslations('en')).toBe(en);
    expect(getTranslations('ja')).toBe(ja);
  });

  it('falls back to English for unknown or missing languages', () => {
    expect(getTranslations('de')).toBe(en);
    expect(getTranslations(undefined)).toBe(en);
    expect(getTranslations('')).toBe(en);
  });
});

describe('translate', () => {
  const translations = {
    greeting: 'Hello {{name}}!',
    notifications: {
      orderPlaced: 'Order {{orderNumber}} for ¥{{totalAmount}} placed',
      repeat: '{{word}} {{word}}'
    }
  };

  it('resolves nested keys via dot paths', () => {
    expect(translate('notifications.orderPlaced', { orderNumber: 'A1', totalAmount: 500 }, translations))
      .toBe('Order A1 for ¥500 placed');
  });

  it('interpolates every occurrence of a placeholder', () => {
    expect(translate('notifications.repeat', { word: 'hi' }, translations)).toBe('hi hi');
  });

  it('returns the key itself when it cannot be resolved', () => {
    expect(translate('missing.key', {}, translations)).toBe('missing.key');
    expect(translate('greeting.deeper.path', {}, translations)).toBe('greeting.deeper.path');
  });

  it('leaves placeholders untouched when no data is supplied', () => {
    expect(translate('greeting', undefined, translations)).toBe('Hello {{name}}!');
    expect(translate('greeting', null, translations)).toBe('Hello {{name}}!');
  });

  it('ignores data keys that have no matching placeholder', () => {
    expect(translate('greeting', { name: 'Ana', unused: 'x' }, translations)).toBe('Hello Ana!');
  });
});
