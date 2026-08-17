const Hotel = require('../models/Hotel');
const { createCatalogRouter } = require('../utils/catalogRoutes');

module.exports = createCatalogRouter({
  model: Hotel,
  singularLabel: 'Hotel',
  pluralLabel: 'hotels'
});
