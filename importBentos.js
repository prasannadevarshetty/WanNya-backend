const Bento = require('./models/Bento');
const { runWithDatabase } = require('./utils/dbScript');
const { replaceCollectionFromCsv } = require('./utils/csvImport');

runWithDatabase(() =>
  replaceCollectionFromCsv({
    file: './data/bentos.csv',
    model: Bento,
    label: 'bentos',
    mapRow: (row) => ({
      nameEn: row.nameEn,
      nameJa: row.nameJa,
      price: Number(row.price),
      descriptionEn: row.descriptionEn,
      descriptionJa: row.descriptionJa,
      rating: Number(row.rating) || 0,
      images: row.images
        ? row.images.split(',').map(img => img.trim()).filter(Boolean)
        : []
    })
  })
);
