const Salon = require('../models/Salon');
const { createCatalogRouter } = require('../utils/catalogRoutes');

module.exports = createCatalogRouter({
  model: Salon,
  singularLabel: 'Salon service',
  pluralLabel: 'salon services'
});
