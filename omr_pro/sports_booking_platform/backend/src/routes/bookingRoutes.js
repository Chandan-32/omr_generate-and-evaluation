const express = require('express');
const router = express.Router();
const { 
  createBooking, 
  getMyBookings, 
  getAllBookings, 
  cancelBooking, 
  approveRejectBooking,
  getBookedSlots
} = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/my', protect, getMyBookings);
router.get('/all', protect, adminOnly, getAllBookings);
router.get('/slots', protect, getBookedSlots);
router.post('/', protect, createBooking);
router.post('/:id/cancel', protect, cancelBooking);
router.put('/:id/review', protect, adminOnly, approveRejectBooking);

module.exports = router;
