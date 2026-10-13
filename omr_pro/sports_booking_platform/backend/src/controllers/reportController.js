const { Booking } = require('../models/Booking');
const { Payment } = require('../models/Payment');
const { Facility } = require('../models/Facility');
const { User } = require('../models/User');

const getReports = async (req, res) => {
  try {
    const bookings = await Booking.find({});
    const payments = await Payment.find({ status: 'success' });
    const facilities = await Facility.find({});
    const users = await User.find({});

    // 1. Revenue Calculations
    const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);

    // 2. Count metrics
    const todayStr = new Date().toDateString();
    let todayBookingsCount = 0;
    let pendingPaymentsCount = 0;
    let pendingApprovalsCount = 0;
    let totalConfirmedCount = 0;

    bookings.forEach(b => {
      const bDate = new Date(b.startDate).toDateString();
      if (bDate === todayStr) {
        todayBookingsCount++;
      }
      if (b.bookingStatus === 'pending_payment') {
        pendingPaymentsCount++;
      }
      if (b.bookingStatus === 'pending_approval') {
        pendingApprovalsCount++;
      }
      if (b.bookingStatus === 'confirmed') {
        totalConfirmedCount++;
      }
    });

    // 3. Facility Utilization (booking count per facility)
    const facilityCounts = {};
    facilities.forEach(f => {
      facilityCounts[f.name] = 0;
    });

    bookings.forEach(b => {
      if (b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed') {
        facilityCounts[b.facilityName] = (facilityCounts[b.facilityName] || 0) + 1;
      }
    });

    const utilization = Object.keys(facilityCounts).map(name => ({
      facility: name,
      bookingsCount: facilityCounts[name]
    }));

    // 4. Monthly/Daily Revenue Trend
    const revenueTrendMap = {};
    payments.forEach(p => {
      const dateStr = new Date(p.transactionDate).toISOString().slice(0, 10); // YYYY-MM-DD
      revenueTrendMap[dateStr] = (revenueTrendMap[dateStr] || 0) + p.amount;
    });

    // Fill in last 7 days with zero revenue if no payments happened to make the chart look nice
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (!revenueTrendMap[dateStr]) {
        revenueTrendMap[dateStr] = 0;
      }
    }

    const revenueTrend = Object.keys(revenueTrendMap)
      .map(date => ({ date, revenue: revenueTrendMap[date] }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      summary: {
        totalRevenue,
        todayBookings: todayBookingsCount,
        pendingPayments: pendingPaymentsCount,
        pendingApprovals: pendingApprovalsCount,
        totalConfirmed: totalConfirmedCount,
        totalFacilities: facilities.length,
        totalUsers: users.length
      },
      utilization,
      revenueTrend
    });
  } catch (error) {
    console.error('Reports Calculation Error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    // Remove passwords before returning
    const sanitized = users.map(u => ({
      _id: u.id || u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  getReports,
  getUsers,
  deleteUser
};
