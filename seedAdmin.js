import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/adminModel.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://omhpandya54_db_user:qsdew%400M@cluster0.n0p4etb.mongodb.net/date_app_db?retryWrites=true&w=majority';

async function seedAdminUser() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas.');

    // Drop legacy username_1 index if exists
    try {
      await mongoose.connection.collection('admins').dropIndex('username_1');
      console.log('Successfully dropped legacy username_1 unique index.');
    } catch (e) {
      console.log('Note on username_1 index:', e.message);
    }

    const email = 'test@gmail.com';
    const password = 'Test@123';

    let existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log(`Found existing admin for ${email}. Updating password...`);
      existingAdmin.password = password; // pre('save') hook will hash it!
      existingAdmin.name = 'Iconic Admin';
      existingAdmin.username = 'test@gmail.com';
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log(`Admin ${email} password successfully updated to ${password}!`);
    } else {
      console.log(`Creating new admin account for ${email}...`);
      const newAdmin = await Admin.create({
        name: 'Iconic Admin',
        username: 'test@gmail.com',
        email,
        password,
        role: 'admin',
        isActive: true,
      });
      console.log(`Admin ${newAdmin.email} created successfully! ID: ${newAdmin._id}`);
    }

    // Verify matchPassword
    const verifyAdmin = await Admin.findOne({ email }).select('+password');
    const isMatch = await verifyAdmin.matchPassword(password);
    console.log(`Verification: matchPassword("${password}") => ${isMatch}`);

    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin user:', err);
    process.exit(1);
  }
}

seedAdminUser();
