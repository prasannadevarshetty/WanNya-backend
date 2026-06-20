require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

const Clinic = require('./models/Clinic');

const clinics = [];

async function importClinics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    fs.createReadStream('./data/clinic.csv')
      .pipe(csv({
        mapHeaders: ({ header }) => header.replace(/^\ufeff/, '').replace(/^["']|["']$/g, '').trim()
      }))
      .on('data', (row) => {
        clinics.push({
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
        });
      })
      .on('end', async () => {
        await Clinic.deleteMany();
        await Clinic.insertMany(clinics);

        console.log(`${clinics.length} clinics imported`);
        process.exit();
      });

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

importClinics();