const { Booking } = require('../models/Booking');
const { Facility } = require('../models/Facility');
const { User } = require('../models/User');
const notifier = require('../utils/notifier');

// Overlap checking function to prevent double bookings
const checkBookingOverlap = async (facilityId, startDateStr, endDateStr, bookingType, timeSlots) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const bookings = await Booking.find({
    facilityId,
    bookingStatus: { $in: ['confirmed', 'pending_approval', 'pending_payment'] }
  });

  for (const b of bookings) {
    const bStart = new Date(b.startDate);
    const bEnd = new Date(b.endDate);

    // 1. Both daily bookings
    if (bookingType === 'daily' && b.bookingType === 'daily') {
      if (bStart < end && bEnd > start) return true;
    }
    // 2. Both hourly bookings
    else if (bookingType === 'hourly' && b.bookingType === 'hourly') {
      const sameDay = bStart.toDateString() === start.toDateString();
      if (sameDay) {
        const hasOverlap = timeSlots.some(slot => b.timeSlots.includes(slot));
        if (hasOverlap) return true;
      }
    }
    // 3. New booking is Daily, Existing is Hourly
    else if (bookingType === 'daily' && b.bookingType === 'hourly') {
      if (bStart >= start && bStart < end) return true;
    }
    // 4. New booking is Hourly, Existing is Daily
    else if (bookingType === 'hourly' && b.bookingType === 'daily') {
      if (start >= bStart && start < bEnd) return true;
    }
  }
  return false;
};

const createBooking = async (req, res) => {
  const { facilityId, bookingType, startDate, endDate, timeSlots, purpose } = req.body;

  try {
    const facility = await Facility.findById(facilityId);
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    if (facility.status !== 'available') {
      return res.status(400).json({ message: 'Facility is currently unavailable or under maintenance' });
    }

    // Parse Dates
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);

    // Ensure valid range
    if (start.toString() === 'Invalid Date' || end.toString() === 'Invalid Date') {
      return res.status(400).json({ message: 'Invalid start or end date' });
    }

    if (start < new Date(new Date().setHours(0,0,0,0))) {
      return res.status(400).json({ message: 'Cannot book in the past' });
    }

    // Check Availability Overlaps
    const overlapExists = await checkBookingOverlap(
      facilityId,
      startDate,
      endDate || startDate,
      bookingType,
      timeSlots || []
    );

    if (overlapExists) {
      return res.status(400).json({ 
        message: 'Collision detected: The facility is already booked for the selected date/time slot.' 
      });
    }

    // Price Calculations
    let basePrice = 0;
    let durationMultiplier = 1;

    if (bookingType === 'daily') {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      durationMultiplier = diffDays;
      basePrice = facility.pricePerDay;
    } else { // hourly
      durationMultiplier = (timeSlots || []).length;
      basePrice = facility.pricePerHour;
      if (durationMultiplier === 0) {
        return res.status(400).json({ message: 'Hourly bookings require at least one time slot.' });
      }
    }

    let subTotal = basePrice * durationMultiplier;
    
    // Apply role-based discount (Student: 20%, Faculty: 10%)
    let discountPercent = 0;
    if (req.user.role === 'student') {
      discountPercent = 20;
    } else if (req.user.role === 'faculty') {
      discountPercent = 10;
    }
    
    const discountApplied = Math.round(subTotal * (discountPercent / 100));
    const totalAmount = subTotal - discountApplied;

    // Generate unique Booking ID
    const datePrefix = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingIdString = `CLG-${datePrefix}-${randSuffix}`;

    // Status: If facility requires manual approval, set pending approval, else pending payment
    const initialStatus = 'pending_payment';

    const booking = await Booking.create({
      bookingId: bookingIdString,
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      facilityId,
      facilityName: facility.name,
      bookingType,
      startDate: start,
      endDate: end,
      numberOfDays: bookingType === 'daily' ? durationMultiplier : 1,
      timeSlots: bookingType === 'hourly' ? timeSlots : [],
      purpose,
      totalAmount,
      bookingStatus: initialStatus,
      paymentStatus: 'pending'
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create Booking Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id });
    // Sort bookings by date descending
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({});
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check ownership or admin
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'refunded') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    // Refund policy check: if payment status was paid, mark as refunded, else cancelled
    const oldPaymentStatus = booking.paymentStatus;
    
    booking.bookingStatus = oldPaymentStatus === 'paid' ? 'refunded' : 'cancelled';
    booking.paymentStatus = oldPaymentStatus === 'paid' ? 'refunded' : 'pending';
    
    await booking.save();

    // Trigger notification
    await notifier.sendEmail(
      booking.userEmail,
      `Booking Cancelled - ${booking.bookingId}`,
      `Hi ${booking.userName},\n\nYour booking for ${booking.facilityName} (ID: ${booking.bookingId}) has been cancelled.\n${oldPaymentStatus === 'paid' ? 'A refund for ₹' + booking.totalAmount + ' has been processed to your payment method.' : ''}\n\nBest regards,\nFacility Team`
    );

    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('Cancel Booking Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const approveRejectBooking = async (req, res) => {
  const { status } = req.body; // 'confirmed' or 'cancelled'
  
  if (!['confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Choose confirmed or cancelled.' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.bookingStatus = status;
    if (status === 'cancelled') {
      booking.paymentStatus = booking.paymentStatus === 'paid' ? 'refunded' : 'pending';
    }
    
    await booking.save();

    await notifier.sendEmail(
      booking.userEmail,
      `Booking Request Review: ${status.toUpperCase()}`,
      `Hi ${booking.userName},\n\nYour request for booking ${booking.facilityName} (ID: ${booking.bookingId}) has been ${status.toUpperCase()} by the administrator.\n\nBest regards,\nAdmin Team`
    );

    res.json({ message: `Booking ${status} successfully`, booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const getBookedSlots = async (req, res) => {
  const { facilityId, date } = req.query;
  if (!facilityId || !date) {
    return res.status(400).json({ message: 'Facility ID and date are required' });
  }

  try {
    const targetDate = new Date(date);
    const bookings = await Booking.find({
      facilityId,
      bookingType: 'hourly',
      bookingStatus: { $in: ['confirmed', 'pending_approval', 'pending_payment'] }
    });

    const slots = [];
    bookings.forEach(b => {
      const bDate = new Date(b.startDate);
      if (bDate.toDateString() === targetDate.toDateString()) {
        slots.push(...b.timeSlots);
      }
    });

    // Also see if there is any daily booking blocking this entire date
    const dailyBookings = await Booking.find({
      facilityId,
      bookingType: 'daily',
      bookingStatus: { $in: ['confirmed', 'pending_approval', 'pending_payment'] },
      startDate: { $lte: targetDate },
      endDate: { $gt: targetDate }
    });

    res.json({
      date,
      bookedSlots: slots,
      isFullyBookedDaily: dailyBookings.length > 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  cancelBooking,
  approveRejectBooking,
  getBookedSlots
};
