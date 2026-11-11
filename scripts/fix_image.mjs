import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await mongoose.connection.db.collection('products').updateMany(
    {
      $or: [
        { image: { $regex: 'onrender.com/uploads' } },
        { image: { $regex: 'localhost' } },
      ]
    },
    {
      $set: {
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80'],
      }
    }
  );
  console.log('Fixed products with broken render uploads:', result.modifiedCount);
  process.exit(0);
}
fix();
