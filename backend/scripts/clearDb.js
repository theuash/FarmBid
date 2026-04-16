const mongoose = require('mongoose');
require('dotenv').config();

const clearDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/farmbid';
    console.log(`Connecting to ${mongoUri}...`);
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const collections = await mongoose.connection.db.collections();

    for (let collection of collections) {
      console.log(`Clearing collection: ${collection.collectionName}`);
      await collection.deleteMany({});
    }

    console.log('All collections cleared successfully.');
    
    // Explicitly seed a master admin/test user if desired
    // Here we just keep it 100% blank as requested
    
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();
