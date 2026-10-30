import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host} 🟢`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Error: ${error.message} 🔴`);
    process.exit(1);
  }
};

export default connectDB;
