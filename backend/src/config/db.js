import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDatabase = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    cached.promise = mongoose.connect(mongoUri).then((mongooseInstance) => {
      console.log(`MongoDB Atlas Connected! Host: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`Database Connection Failure: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

export default connectDatabase;
