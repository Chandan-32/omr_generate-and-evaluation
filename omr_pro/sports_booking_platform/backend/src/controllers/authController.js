const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const notifier = require('../utils/notifier');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'college_booking_super_secret_key_123!', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const registerUser = async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Determine role (default to student unless admin explicitly added)
    const userRole = role && ['student', 'faculty', 'external', 'admin'].includes(role) ? role : 'student';

    const user = await User.create({
      name,
      email,
      phone,
      password, // Password hashing is handled by the pre-save hook in model
      role: userRole
    });

    if (user) {
      // Simulate Email Verification
      await notifier.sendEmail(
        email,
        'Welcome to College Booking Platform!',
        `Hi ${name},\n\nYour account has been registered successfully. Your role is ${userRole}.\n\nBest regards,\nCollege Facility Management Team`
      );

      res.status(201).json({
        _id: user.id || user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user.id || user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user.id || user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user.id || user._id)
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      res.json({
        _id: user.id || user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Simulate OTP / Reset Link
    const resetOtp = Math.floor(100000 + Math.random() * 900000);
    
    // In a real app we'd save this resetToken to User model with expiration.
    // For now we log it.
    await notifier.sendEmail(
      email,
      'Password Reset Request OTP',
      `Hi ${user.name},\n\nWe received a password reset request. Use this OTP to reset your password: ${resetOtp}\n\nIf you did not request this, please ignore this email.`
    );

    res.json({ message: 'Password reset OTP sent to email', email });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = { registerUser, loginUser, getUserProfile, forgotPassword };
