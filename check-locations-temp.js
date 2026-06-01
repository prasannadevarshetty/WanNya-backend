const mongoose = require('mongoose');
const { MongoClient } = mongoose.mongo;
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const locations = await db.collection('locations').find({}).toArray();
    console.log(`Found ${locations.length} locations:`);
    locations.forEach(l => {
      console.log(` - ID: ${l._id || l.id}, Name: ${l.name || l.label || l.address}, address: ${l.address}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

run();
