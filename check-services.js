const Service = require('./models/Service');
const { runWithDatabase } = require('./utils/dbScript');

runWithDatabase(async () => {
  const services = await Service.find({});
  console.log('Total services:', services.length);
  services.forEach(s => {
    console.log(`ID: ${s._id}, Name: ${s.name}, Category: ${s.category}, Price: ${s.price}, Duration: ${s.duration}`);
  });
});
