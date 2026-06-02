require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Service = require('./models/Service');

const bookings = [];
const allowedCategories = ['hotel', 'grooming', 'clinic'];

async function importBookings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB connected');
    console.log('DB:', mongoose.connection.name);
    console.log('Collection:', Service.collection.name);

    fs.createReadStream('./data/bookings.csv')
      .pipe(csv({
        skipEmptyLines: true,
        mapHeaders: ({ header }) => header.trim()
      }))
      .on('data', (row) => {
        if (!row.nameEn || !row.descriptionEn || !row.category) return;
        if (!allowedCategories.includes(row.category)) return;

        bookings.push({
          name: row.nameEn,
          nameEn: row.nameEn,
          nameJa: row.nameJa,

          description: row.descriptionEn,
          descriptionEn: row.descriptionEn,
          descriptionJa: row.descriptionJa,

          category: row.category,
          petType: 'dog',

          duration: row.duration || '',
          durationText: row.duration || '',

          price: row.price
            ? Number(row.price.trim().replace(/[^0-9.]/g, '')) || 0
            : 0,

          pricingType:
            row.duration === '1 night'
              ? 'per-night'
              : row.duration === '1 session'
              ? 'per-session'
              : 'per-day',

          image: row.image || '',
          images: row.image ? [row.image] : [],

          rating:
            row.rating && !isNaN(Number(row.rating.trim()))
              ? Number(row.rating.trim())
              : 0,

          location: {
            address: row.locationEn || '',
            addressEn: row.locationEn || '',
            addressJa: row.locationJa || '',
            city:
              row.locationEn && row.locationEn.includes('Shinjuku')
                ? 'Shinjuku'
                : 'Tokyo',
            country: 'Japan'
          },

          checkIn: row.checkIn || '',
          checkOut: row.checkOut || '',

          isActive: true,
          featured: false,
          maxPetSize: 'any',
          maxPets: 1
        });
      })
      .on('end', async () => {
        try {
          await Service.deleteMany({
            category: { $in: ['hotel', 'grooming', 'clinic'] }
          });

          await Service.insertMany(bookings);

          console.log(`${bookings.length} services imported successfully`);
          process.exit(0);

        } catch (error) {
          console.error('Insert error:', error);
          process.exit(1);
        }
      });

  } catch (error) {
    console.error('Import error:', error);
    process.exit(1);
  }
}

importBookings();