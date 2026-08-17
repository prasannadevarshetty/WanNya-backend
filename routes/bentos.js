const Bento = require('../models/Bento');
const { createCatalogRouter } = require('../utils/catalogRoutes');

module.exports = createCatalogRouter({
  model: Bento,
  singularLabel: 'Bento',
  pluralLabel: 'bentos'
});
