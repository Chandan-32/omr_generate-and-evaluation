const express = require('express');
const router = express.Router();
const { 
  getFacilities, 
  getFacilityById, 
  createFacility, 
  updateFacility, 
  deleteFacility 
} = require('../controllers/facilityController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getFacilities);
router.get('/:id', getFacilityById);
router.post('/', protect, adminOnly, createFacility);
router.put('/:id', protect, adminOnly, updateFacility);
router.delete('/:id', protect, adminOnly, deleteFacility);

module.exports = router;
