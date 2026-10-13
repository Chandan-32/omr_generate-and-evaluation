const mongoose = require('mongoose');
const MockModel = require('./mockModel');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  userId: { type: String, required: true }, // Store as string for unified compatibility with mock IDs
  userName: { type: String },
  userEmail: { type: String },
  facilityId: { type: String, required: true },
  facilityName: { type: String },
  bookingType: { type: String, enum: ['daily', 'hourly'], default: 'daily' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  numberOfDays: { type: Number, default: 1 },
  timeSlots: { type: [String], default: [] }, // Used for hourly bookings
  purpose: { type: String },
  totalAmount: { type: Number, required: true },
  bookingStatus: { 
    type: String, 
    enum: ['pending_payment', 'pending_approval', 'confirmed', 'completed', 'cancelled', 'refunded'], 
    default: 'pending_payment' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'refunded'], 
    default: 'pending' 
  }
}, { timestamps: true });

const MongoBooking = mongoose.model('Booking', bookingSchema);

class MockBooking extends MockModel {
  static _collectionName = 'bookings';
}

module.exports = {
  get Booking() {
    return global.useMockDb ? MockBooking : MongoBooking;
  }
};
