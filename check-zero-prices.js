const Service = require('./models/Service');
const { runWithDatabase } = require('./utils/dbScript');

runWithDatabase(async () => {
  const zeroPriceCount = await Service.countDocuments({ price: 0 });
  const nullPriceCount = await Service.countDocuments({ price: null });
  const undefinedPriceCount = await Service.countDocuments({ price: { $exists: false } });
  console.log({ zeroPriceCount, nullPriceCount, undefinedPriceCount });

  if (zeroPriceCount > 0) {
    const zeroServices = await Service.find({ price: 0 });
    console.log('Services with 0 price:');
    zeroServices.forEach(s => {
      console.log(`ID: ${s._id}, Name: ${s.name}, Category: ${s.category}`);
    });
  }
});
