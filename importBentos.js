require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

const Bento = require('./models/Bento');

const bentos = [];

async function importBentos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    fs.createReadStream('./data/bentos.csv')
      .pipe(csv())
      .on('data', (row) => {
        bentos.push({
          nameEn: row.nameEn,
          nameJa: row.nameJa,
          price: Number(row.price),
          descriptionEn: row.descriptionEn,
          descriptionJa: row.descriptionJa,
            rating: Number(row.rating) || 0,
            images: row.images
              ? row.images.split(',').map(img => img.trim()).filter(Boolean)
              : []
          });
        })
      .on('end', async () => {
        await Bento.deleteMany();
        await Bento.insertMany(bentos);

        console.log(`${bentos.length} bentos imported successfully`);
        process.exit();
      });

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importBentos();