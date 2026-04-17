const path = require('path');

const getTranslations = (lang) => {
  try {
    return require(path.join(__dirname, `../locales/${lang}.json`));
  } catch {
    return require('../locales/en.json');
  }
};

const getValueFromPath = (obj, pathStr) => {
  return pathStr.split('.').reduce((acc, key) => acc?.[key], obj);
};

const translate = (key, data, translations) => {
  let message = getValueFromPath(translations, key) || key;

  Object.keys(data || {}).forEach((k) => {
    message = message.replace(`{{${k}}}`, data[k]);
  });

  return message;
};

module.exports = { getTranslations, translate };