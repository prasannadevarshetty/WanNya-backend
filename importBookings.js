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
      .pipe(csv())
      .on('data', (row) => {
        // Skip rows with missing required fields
        if (!row.nameEn || !row.descriptionEn || !row.category) {
          return;
        }

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
          durationText: row.duration,

          price: row.price && !isNaN(Number(row.price.trim())) ? Number(row.price.trim()) : 0,

          pricingType:
            row.duration === '1 night'
              ? 'per-night'
              : 'per-day',

          images: [row.image],

          rating: row.rating && !isNaN(Number(row.rating.trim())) ? Number(row.rating.trim()) : 0,

          location: {
            address: row.location,
            city: row.location.includes('Shinjuku')
              ? 'Shinjuku'
              : 'Tokyo',
            country: 'Japan'
          },

          checkIn: row.checkIn,
          checkOut: row.checkOut,

          isActive: true,
          featured: false,

          maxPetSize: 'any',
          maxPets: 1
        });
      })
      .on('end', async () => {
        try {
          await Service.deleteMany({
            category: { $in: ['hotel', 'grooming'] }
          });

          await Service.insertMany(bookings);

          console.log(
            `${bookings.length} hotel bookings imported successfully`
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