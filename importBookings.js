require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Service = require('./models/Service');

const bookings = [];

async function importBookings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB connected');

    fs.createReadStream('./data/bookings.csv')
      .pipe(csv({ separator: '\t' }))
      .on('data', (row) => {
        bookings.push({
          name: row.nameEn,
          nameEn: row.nameEn,
          nameJa: row.nameJa,

          description: row.descriptionEn,
          descriptionEn: row.descriptionEn,
          descriptionJa: row.descriptionJa,

          category: row.category,
          petType: 'dog',

          duration: 1440,
          durationText: row.duration || '',

          price: row.price
            ? Number(row.price.replace(/[^\d]/g, ''))
            : 0,

          pricingType:
            row.duration === '1 night'
              ? 'per-night'
              : (row.category === 'grooming' ? 'per-session' : 'per-day'),

          images: row.image ? [row.image] : [],

          rating: row.rating ? Number(row.rating) : 0,

          location: {
            address: row.location || '',
            city: (row.location && row.location.includes('Shinjuku'))
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
          // Clear existing hotel and grooming services to prevent duplicates
          await Service.deleteMany({
            category: { $in: ['hotel', 'grooming'] }
          });

          await Service.insertMany(bookings);

          console.log(
            `✅ ${bookings.length} bookings (hotel & grooming) imported successfully`
          );

          process.exit(0);
        } catch (error) {
          console.error(
            'Insert error:',
            error
          );
          process.exit(1);
        }
      });

  } catch (error) {
    console.error(
      'Import error:',
      error
    );
    process.exit(1);
  }
}

importBookings();