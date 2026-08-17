const Hotel = require('./models/Hotel');
const { runWithDatabase } = require('./utils/dbScript');
const { replaceCollectionFromCsv } = require('./utils/csvImport');

runWithDatabase(() =>
  replaceCollectionFromCsv({
    file: './data/hotel.csv',
    model: Hotel,
    label: 'hotels',
    mapRow: (row) => ({
      nameEn: row.nameEn,
      nameJa: row.nameJa,
      descriptionEn: row.descriptionEn,
      descriptionJa: row.descriptionJa,
      price: Number(row.price),
      duration: row.duration,
      rating: Number(row.rating) || 0,
      image: row.image,
      category: 'hotel',
      petSize: row.petSize,
      locationEn: row.locationEn,
      locationJa: row.locationJa,
      checkIn: row.checkIn,
      checkOut: row.checkOut
    })
  })
);
