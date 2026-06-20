require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

const Salon = require('./models/Salon');

const salons = [];

async function importSalons() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    fs.createReadStream('./data/salon.csv')
      .pipe(csv({
        mapHeaders: ({ header }) => header.replace(/^\ufeff/, '').replace(/^["']|["']$/g, '').trim()
      }))
      .on('data', (row) => {
        salons.push({
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
        });
      })
      .on('end', async () => {
        await Salon.deleteMany();
        await Salon.insertMany(salons);

        console.log(`${salons.length} salons imported`);
        process.exit();
      });

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

importSalons();