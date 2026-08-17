const { runWithDatabase } = require('./utils/dbScript');

runWithDatabase(async (mongoose) => {
  const locations = await mongoose.connection.db.collection('locations').find({}).toArray();

  console.log(`Found ${locations.length} locations:`);
  locations.forEach(l => {
    console.log(` - ID: ${l._id || l.id}, Name: ${l.name || l.label || l.address}, address: ${l.address}`);
  });
});
