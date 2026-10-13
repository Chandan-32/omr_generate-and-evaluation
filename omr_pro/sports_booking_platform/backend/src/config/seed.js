const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { connectDB } = require('./db');
const { User } = require('../models/User');
const { Facility } = require('../models/Facility');

const seedData = async () => {
  // Set global mockDB context depending on ENV or force fallback
  await connectDB();

  try {
    // 1. Seed default Admin if not exists
    console.log('Seeding users...');
    const adminExists = await User.findOne({ email: 'admin@college.edu' });
    if (!adminExists) {
      await User.create({
        name: 'Campus Event Admin',
        email: 'admin@college.edu',
        phone: '9876543210',
        password: 'adminpassword123', // Will be hashed by model's save method
        role: 'admin'
      });
      console.log('✅ Default Admin created: admin@college.edu / adminpassword123');
    } else {
      console.log('Admin user already exists');
    }

    // Seed test Student
    const studentExists = await User.findOne({ email: 'student@college.edu' });
    if (!studentExists) {
      await User.create({
        name: 'Alex Student',
        email: 'student@college.edu',
        phone: '9999888877',
        password: 'studentpassword',
        role: 'student'
      });
      console.log('✅ Default Student created: student@college.edu / studentpassword');
    }

    // 2. Seed Facilities
    console.log('Seeding facilities...');
    
    // Clear existing facilities in Mock/Mongo
    // Since mockModel doesn't have a direct deleteMany, we can just delete one-by-one or handle it.
    // Actually, let's just check if facilities are already there. If there are 10, skip.
    const existingFacilities = await Facility.find({});
    if (existingFacilities.length >= 10) {
      console.log('Facilities already seeded. Skipping facilities seeding.');
      process.exit(0);
    }

    // Define all 10 facilities
    const facilitiesList = [
      {
        name: 'Football Ground',
        type: 'Sports Ground',
        description: 'Lush green grass football stadium with floodlights and spectator seating.',
        location: 'Sports Complex Area A',
        images: ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800'],
        capacity: '22 Players (Full Field)',
        pricePerDay: 2000,
        pricePerHour: 300,
        availableSlots: ['09:00 AM - 12:00 PM', '03:00 PM - 06:00 PM', '06:00 PM - 09:00 PM'],
        requiresApproval: false,
        status: 'available'
      },
      {
        name: 'Cricket Ground',
        type: 'Sports Ground',
        description: 'International-sized cricket field with standard pitch and practice nets.',
        location: 'Sports Complex Area B',
        images: ['https://images.unsplash.com/photo-1531415080290-bc9b8998063a?auto=format&fit=crop&q=80&w=800'],
        capacity: '30 Players + Coaches',
        pricePerDay: 2500,
        pricePerHour: 400,
        availableSlots: ['08:00 AM - 12:00 PM', '02:00 PM - 06:00 PM'],
        requiresApproval: false,
        status: 'available'
      },
      {
        name: 'Basketball Court',
        type: 'Indoor Court',
        description: 'Hardwood floor indoor basketball court with electronic scoreboard.',
        location: 'Indoor Stadium - Hall 1',
        images: ['https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800'],
        capacity: '12 Players',
        pricePerDay: 1200,
        pricePerHour: 150,
        availableSlots: ['09:00 AM - 11:00 AM', '11:00 AM - 01:00 PM', '03:00 PM - 05:00 PM', '05:00 PM - 07:00 PM'],
        requiresApproval: false,
        status: 'available'
      },
      {
        name: 'Volleyball Court',
        type: 'Outdoor Court',
        description: 'Outdoor sand volleyball court with professional net and seating boundaries.',
        location: 'Adjacent to Hostel Block C',
        images: ['https://images.unsplash.com/photo-1592656094267-764a450201c5?auto=format&fit=crop&q=80&w=800'],
        capacity: '14 Players',
        pricePerDay: 800,
        pricePerHour: 100,
        availableSlots: ['07:00 AM - 09:00 AM', '04:00 PM - 06:00 PM', '06:00 PM - 08:00 PM'],
        requiresApproval: false,
        status: 'available'
      },
      {
        name: 'Badminton Court',
        type: 'Indoor Court',
        description: 'Synthetic rubber mats badminton court with excellent overhead lighting.',
        location: 'Indoor Stadium - Hall 2',
        images: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800'],
        capacity: '4 Players (Doubles)',
        pricePerDay: 600,
        pricePerHour: 80,
        availableSlots: ['08:00 AM - 10:00 AM', '10:00 AM - 12:00 PM', '02:00 PM - 04:00 PM', '04:00 PM - 06:00 PM', '06:00 PM - 08:00 PM'],
        requiresApproval: false,
        status: 'available'
      },
      {
        name: 'Tennis Court',
        type: 'Outdoor Court',
        description: 'Clay court tennis facility with high fencing and windbreaks.',
        location: 'Next to Swimming Pool',
        images: ['https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=800'],
        capacity: '4 Players',
        pricePerDay: 1000,
        pricePerHour: 120,
        availableSlots: ['07:00 AM - 09:00 AM', '09:00 AM - 11:00 AM', '03:00 PM - 05:00 PM', '05:00 PM - 07:00 PM'],
        requiresApproval: false,
        status: 'available'
      },
      {
        name: 'Auditorium',
        type: 'Hall',
        description: 'Grand central auditorium with 500+ theater seating capacity, premium acoustics, and sound setup.',
        location: 'Admin Building Wing B',
        images: ['https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&q=80&w=800'],
        capacity: '500 Seats',
        pricePerDay: 8000,
        pricePerHour: 1000,
        availableSlots: ['09:00 AM - 01:00 PM', '02:00 PM - 06:00 PM', '06:00 PM - 10:00 PM'],
        requiresApproval: true, // Special bookings need approval
        status: 'available'
      },
      {
        name: 'Seminar Hall',
        type: 'Hall',
        description: 'Air-conditioned seminar hall with projector, whiteboards, and stadium seating.',
        location: 'Science Block Ground Floor',
        images: ['https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800'],
        capacity: '120 Seats',
        pricePerDay: 4000,
        pricePerHour: 500,
        availableSlots: ['09:00 AM - 12:00 PM', '01:00 PM - 04:00 PM', '04:00 PM - 07:00 PM'],
        requiresApproval: true,
        status: 'available'
      },
      {
        name: 'Open Ground',
        type: 'Sports Ground',
        description: 'Wide grass field for college festivals, exhibitions, annual gatherings, or large outdoor sports events.',
        location: 'Central Campus Lawn',
        images: ['https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800'],
        capacity: '2000 People',
        pricePerDay: 15000,
        pricePerHour: 2000,
        availableSlots: ['08:00 AM - 08:00 PM'],
        requiresApproval: true,
        status: 'available'
      },
      {
        name: 'Conference Hall',
        type: 'Hall',
        description: 'Smart board equipped conference room for club meetings, executive boards, and faculty debates.',
        location: 'Main Library 2nd Floor',
        images: ['https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=800'],
        capacity: '40 Seats',
        pricePerDay: 2000,
        pricePerHour: 250,
        availableSlots: ['09:00 AM - 11:00 AM', '11:00 AM - 01:00 PM', '02:00 PM - 04:00 PM', '04:00 PM - 06:00 PM'],
        requiresApproval: false,
        status: 'available'
      }
    ];

    for (const fac of facilitiesList) {
      await Facility.create(fac);
      console.log(`✅ Seeded Facility: ${fac.name}`);
    }

    console.log('🎉 Data seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Data seeding failed:', error.message);
    process.exit(1);
  }
};

seedData();
