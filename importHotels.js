require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

const Hotel = require('./models/Hotel');

const hotels = [];

async function importHotels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    fs.createReadStream('./data/hotel.csv')
      .pipe(csv({
        mapHeaders: ({ header }) => header.replace(/^\ufeff/, '').replace(/^["']|["']$/g, '').trim()
      }))
      .on('data', (row) => {
        hotels.push({
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
        });
      })
      .on('end', async () => {
        await Hotel.deleteMany();
        await Hotel.insertMany(hotels);

        console.log(`${hotels.length} hotels imported`);
        process.exit();
      });

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

importHotels();