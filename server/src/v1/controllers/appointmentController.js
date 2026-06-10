const appointmentService = require('../services/appointmentService');

/**
 * Get all appointments for the logged-in user (Client, Counselor, or Admin)
 */
exports.getAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const appointments = await appointmentService.findAppointmentsByUser(userId, role);
    
    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch a list of active counselors
 */
exports.getCounselors = async (req, res, next) => {
  try {
    const counselors = await appointmentService.getActiveCounselors();
    res.json({
      success: true,
      count: counselors.length,
      data: counselors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available slots for a counselor and date
 */
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { counselorId, date } = req.query;
    if (!counselorId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Both counselorId and date (YYYY-MM-DD) query parameters are required.'
      });
    }

    const slots = await appointmentService.getAvailableSlots(
      parseInt(counselorId, 10),
      date
    );

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Book a new session
 */
exports.createAppointment = async (req, res, next) => {
  try {
    const clientId = req.user.id;
    const appointment = await appointmentService.bookAppointment(clientId, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Counseling session request submitted successfully.',
      data: appointment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Approve a booking request
 */
exports.approveAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await appointmentService.approveAppointment(parseInt(id, 10));

    res.json({
      success: true,
      message: 'Booking request approved successfully.',
      data: appointment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reject a booking request
 */
exports.rejectAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await appointmentService.rejectAppointment(parseInt(id, 10));

    res.json({
      success: true,
      message: 'Booking request rejected successfully.',
      data: appointment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel a session
 */
exports.cancelAppointment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { id } = req.params;

    const appointment = await appointmentService.cancelAppointment(
      userId,
      parseInt(id, 10),
      role
    );

    res.json({
      success: true,
      message: 'Session has been cancelled successfully.',
      data: appointment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
