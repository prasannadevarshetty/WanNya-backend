const Clinic = require('../models/Clinic');
const { createCatalogRouter } = require('../utils/catalogRoutes');

module.exports = createCatalogRouter({
  model: Clinic,
  singularLabel: 'Clinic',
  pluralLabel: 'clinics'
});
