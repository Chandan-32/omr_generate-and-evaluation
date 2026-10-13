const mongoose = require('mongoose');
const MockModel = require('./mockModel');

const paymentSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  paymentId: { type: String, required: true },
  gateway: { type: String, default: 'Razorpay-Simulated' },
  amount: { type: Number, required: true },
  method: { type: String },
  status: { type: String, enum: ['success', 'failed', 'refunded'], default: 'success' },
  transactionDate: { type: Date, default: Date.now }
}, { timestamps: true });

const MongoPayment = mongoose.model('Payment', paymentSchema);

class MockPayment extends MockModel {
  static _collectionName = 'payments';
}

module.exports = {
  get Payment() {
    return global.useMockDb ? MockPayment : MongoPayment;
  }
};
