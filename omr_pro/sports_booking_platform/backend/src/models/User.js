const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const MockModel = require('./mockModel');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty', 'external', 'admin'], default: 'student' }
}, { timestamps: true });

// Password hashing middleware for MongoDB
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const MongoUser = mongoose.model('User', userSchema);

class MockUser extends MockModel {
  static _collectionName = 'users';

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Pre-save hashing simulation for Mock
  async save() {
    // If password is not already hashed (usually starts with $2a$ or $2b$), hash it
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
    return super.save();
  }
}

// Export a getter to dynamically choose between MongoDB and Mock models
module.exports = {
  get User() {
    return global.useMockDb ? MockUser : MongoUser;
  }
};
