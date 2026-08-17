const Order = require('./models/Order');
const { runWithDatabase } = require('./utils/dbScript');

const idToFind = process.argv[2] || '6a1ffaf9e426edb040d2fe46';

runWithDatabase(async () => {
  const order = await Order.findById(idToFind);

  if (order) {
    console.log('Found in Orders collection!');
    console.log(JSON.stringify(order, null, 2));
  } else {
    console.log('Not found in Orders collection.');
  }
});
