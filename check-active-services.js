const Service = require('./models/Service');
const { runWithDatabase } = require('./utils/dbScript');

runWithDatabase(async () => {
  const total = await Service.countDocuments({});
  const active = await Service.countDocuments({ isActive: true });
  const inactive = await Service.countDocuments({ isActive: false });
  const missing = await Service.countDocuments({ isActive: { $exists: false } });
  console.log({ total, active, inactive, missing });

  const services = await Service.find({}).limit(5);
  console.log('Sample services:', JSON.stringify(services, null, 2));
});
