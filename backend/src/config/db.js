import mongoose from 'mongoose';

const connectDatabase = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Atlas Connected! Host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Failure: ${error.message}`);
    process.exit(1);
  }
};

export default connectDatabase;