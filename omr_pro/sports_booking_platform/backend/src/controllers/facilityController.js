const { Facility } = require('../models/Facility');

const getFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find({});
    res.json(facilities);
  } catch (error) {
    console.error('Get Facilities Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const getFacilityById = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }
    res.json(facility);
  } catch (error) {
    console.error('Get Facility By ID Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const createFacility = async (req, res) => {
  const { 
    name, 
    type, 
    description, 
    location, 
    images, 
    capacity, 
    pricePerDay, 
    pricePerHour, 
    availableSlots, 
    requiresApproval, 
    status 
  } = req.body;

  try {
    const facility = await Facility.create({
      name,
      type,
      description,
      location,
      images: images || [],
      capacity,
      pricePerDay: Number(pricePerDay),
      pricePerHour: Number(pricePerHour),
      availableSlots: availableSlots || [],
      requiresApproval: requiresApproval || false,
      status: status || 'available'
    });

    res.status(201).json(facility);
  } catch (error) {
    console.error('Create Facility Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const updateFacility = async (req, res) => {
  try {
    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    res.json(facility);
  } catch (error) {
    console.error('Update Facility Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const deleteFacility = async (req, res) => {
  try {
    const facility = await Facility.findByIdAndDelete(req.params.id);
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }
    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error('Delete Facility Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility
};
