const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, forgotPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.get('/profile', protect, getUserProfile);

module.exports = router;
