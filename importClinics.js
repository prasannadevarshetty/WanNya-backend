const Clinic = require('./models/Clinic');
const { runWithDatabase } = require('./utils/dbScript');
const { replaceCollectionFromCsv } = require('./utils/csvImport');

runWithDatabase(() =>
  replaceCollectionFromCsv({
    file: './data/clinic.csv',
    model: Clinic,
    label: 'clinics',
    mapRow: (row) => ({
      nameEn: row.nameEn,
      nameJa: row.nameJa,
      descriptionEn: row.descriptionEn,
      descriptionJa: row.descriptionJa,
      price: Number(row.price),
      duration: row.duration,
      rating: Number(row.rating) || 0,
      image: row.image,
      category: 'clinic',
      locationEn: row.locationEn,
      locationJa: row.locationJa
    })
  })
);
