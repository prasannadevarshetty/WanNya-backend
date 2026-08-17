const Salon = require('./models/Salon');
const { runWithDatabase } = require('./utils/dbScript');
const { replaceCollectionFromCsv } = require('./utils/csvImport');

runWithDatabase(() =>
  replaceCollectionFromCsv({
    file: './data/salon.csv',
    model: Salon,
    label: 'salons',
    mapRow: (row) => ({
      nameEn: row.nameEn,
      nameJa: row.nameJa,
      descriptionEn: row.descriptionEn,
      descriptionJa: row.descriptionJa,
      price: Number(String(row.price || '0').replace(/[^0-9.]/g, '')) || 0,
      duration: row.duration,
      image: row.image,
      petSize: row.petSize,
      locationEn: row.locationEn,
      locationJa: row.locationJa
    })
  })
);
