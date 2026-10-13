const mongoose = require('mongoose');
const MockModel = require('./mockModel');

const facilitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String },
  location: { type: String },
  images: { type: [String], default: [] },
  capacity: { type: String },
  pricePerDay: { type: Number, required: true },
  pricePerHour: { type: Number, required: true },
  availableSlots: { type: [String], default: [] },
  requiresApproval: { type: Boolean, default: false },
  status: { type: String, enum: ['available', 'maintenance', 'blocked'], default: 'available' }
}, { timestamps: true });

const MongoFacility = mongoose.model('Facility', facilitySchema);

class MockFacility extends MockModel {
  static _collectionName = 'facilities';
}

module.exports = {
  get Facility() {
    return global.useMockDb ? MockFacility : MongoFacility;
  }
};
