const { Booking } = require('../models/Booking');
const { Payment } = require('../models/Payment');
const { Facility } = require('../models/Facility');
const notifier = require('../utils/notifier');

const processPayment = async (req, res) => {
  const { bookingId, method, paymentId } = req.body;

  try {
    const booking = await Booking.findOne({ bookingId: bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking is already paid' });
    }

    // Retrieve facility to check if manual approval is required
    const facility = await Facility.findById(booking.facilityId);
    if (!facility) {
      return res.status(404).json({ message: 'Facility linked to booking not found' });
    }

    // Generate unique payment transaction ID
    const payId = paymentId || `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // Create payment entry
    const payment = await Payment.create({
      bookingId: bookingId,
      paymentId: payId,
      gateway: 'Razorpay-Simulated',
      amount: booking.totalAmount,
      method: method || 'UPI',
      status: 'success',
      transactionDate: new Date()
    });

    // Update booking status
    booking.paymentStatus = 'paid';
    
    // If facility requires admin approval, set status to pending approval, else confirm it!
    const requiresApproval = facility.requiresApproval;
    booking.bookingStatus = requiresApproval ? 'pending_approval' : 'confirmed';

    await booking.save();

    // Trigger Notifications
    const statusText = requiresApproval ? 'Pending Administrator Approval' : 'Confirmed Successfully';
    
    await notifier.sendEmail(
      booking.userEmail,
      `Booking Payment Success - ID ${booking.bookingId}`,
      `Hi ${booking.userName},\n\nPayment of ₹${booking.totalAmount} was successful for booking ID: ${booking.bookingId}.\nFacility: ${booking.facilityName}\nStatus: ${statusText}\n\nThank you!\nCollege Facility Management Team`
    );

    await notifier.sendSMS(
      booking.phone || 'User',
      `Your booking for ${booking.facilityName} is paid. Booking ID: ${booking.bookingId}. Status: ${statusText}.`
    );

    res.json({
      message: 'Payment processed successfully',
      booking,
      payment
    });
  } catch (error) {
    console.error('Process Payment Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({});
    payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  processPayment,
  getPaymentDetails,
  getAllPayments
};
