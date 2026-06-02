import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Submission from './src/models/Submission.js';

dotenv.config();

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Successfully connected to MongoDB.');
    
    const result = await Submission.deleteMany({});
    console.log(`Cleared ${result.deletedCount} old mock submissions with random names from the database.`);
    
    await mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

clearDatabase();