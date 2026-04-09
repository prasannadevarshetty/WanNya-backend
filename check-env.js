require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
if (process.env.MONGODB_URI) {
  console.log('URI length:', process.env.MONGODB_URI.length);
  console.log('URI starts with mongodb+:', process.env.MONGODB_URI.startsWith('mongodb'));
}
