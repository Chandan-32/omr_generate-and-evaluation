const express = require('express');
const router = express.Router();
const { processPayment, getPaymentDetails, getAllPayments } = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/process', protect, processPayment);
router.get('/all', protect, adminOnly, getAllPayments);
router.get('/:bookingId', protect, getPaymentDetails);

module.exports = router;
