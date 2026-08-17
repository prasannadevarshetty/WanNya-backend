const path = require('path');
const { warn } = require('./logger');

const warnedLocales = new Set();

const getTranslations = (lang) => {
  try {
    return require(path.join(__dirname, `../locales/${lang}.json`));
  } catch (err) {
    // Falling back to English is intentional, but a missing or malformed locale
    // file is worth reporting once per locale instead of failing silently.
    if (!warnedLocales.has(lang)) {
      warnedLocales.add(lang);
      warn('Locale unavailable, falling back to en', {
        lang,
        error: err.message
      });
    }

    return require('../locales/en.json');
  }
};

const getValueFromPath = (obj, pathStr) => {
  return pathStr.split('.').reduce((acc, key) => acc?.[key], obj);
};

const translate = (key, data, translations) => {
  let message = getValueFromPath(translations, key) || key;

  Object.keys(data || {}).forEach((k) => {
    const regex = new RegExp(`{{${k}}}`, 'g');
    message = message.replace(regex, data[k]);
  });

  return message;
};

module.exports = { getTranslations, translate };