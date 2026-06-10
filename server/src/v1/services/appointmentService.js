const { Op } = require('sequelize');
const { Appointment, User } = require('../../models');
const { broadcastAppointmentEvent } = require('../utils/socket');

const APPOINTMENT_STATUSES = {
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

const STANDARD_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM'
];

const BOOKED_STATUSES = [
  APPOINTMENT_STATUSES.PENDING,
  APPOINTMENT_STATUSES.SCHEDULED,
  APPOINTMENT_STATUSES.APPROVED
];

const REVIEWABLE_STATUSES = [
  APPOINTMENT_STATUSES.PENDING,
  APPOINTMENT_STATUSES.SCHEDULED
];

const STAFF_INCLUDE = [
  { model: User, as: 'Client', attributes: ['id', 'name', 'email', 'role'] },
  { model: User, as: 'Counselor', attributes: ['id', 'name', 'email', 'role'] }
];

const CLIENT_INCLUDE = [
  { model: User, as: 'Counselor', attributes: ['id', 'name', 'email', 'role'] }
];

const COUNSELOR_INCLUDE = [
  { model: User, as: 'Client', attributes: ['id', 'name', 'email', 'role'] }
];

const buildAppointmentInclude = (role) => {
  if (role === 'Counselor') {
    return COUNSELOR_INCLUDE;
  }

  if (role === 'Admin' || role === 'SuperAdmin') {
    return STAFF_INCLUDE;
  }

  return CLIENT_INCLUDE;
};

const loadAppointmentById = async (appointmentId, role = 'Admin') => {
  return Appointment.findByPk(appointmentId, {
    include: buildAppointmentInclude(role)
  });
};

const emitAppointmentEvent = (eventName, appointment, action, message) => {
  if (!appointment) {
    return null;
  }

  const payload = {
    ...appointment.toJSON(),
    action,
    message
  };

  broadcastAppointmentEvent(eventName, payload);
  return payload;
};

/**
 * Get all appointments for a user based on role
 * @param {number} userId
 * @param {string} role
 * @returns {Array<Appointment>}
 */
exports.findAppointmentsByUser = async (userId, role) => {
  const queryOptions = {
    order: [['appointmentDate', 'ASC'], ['timeSlot', 'ASC']],
    include: buildAppointmentInclude(role)
  };

  if (role === 'Counselor') {
    queryOptions.where = { counselorId: userId };
  } else if (role !== 'Admin' && role !== 'SuperAdmin') {
    queryOptions.where = { clientId: userId };
  }

  return Appointment.findAll(queryOptions);
};

/**
 * Get all active counselors
 * @returns {Array<User>}
 */
exports.getActiveCounselors = async () => {
  return User.findAll({
    where: { role: 'Counselor', status: 'Active' },
    attributes: ['id', 'name', 'email']
  });
};

/**
 * Retrieve slot availabilities for a counselor and date
 * @param {number} counselorId
 * @param {string} date - YYYY-MM-DD
 * @returns {Array<object>} availabilityList
 */
exports.getAvailableSlots = async (counselorId, date) => {
  const bookedAppointments = await Appointment.findAll({
    where: {
      counselorId,
      appointmentDate: date,
      status: {
        [Op.in]: BOOKED_STATUSES
      }
    },
    attributes: ['timeSlot']
  });

  const bookedSlots = bookedAppointments.map((app) => app.timeSlot);

  return STANDARD_SLOTS.map((slot) => ({
    timeSlot: slot,
    available: !bookedSlots.includes(slot)
  }));
};

/**
 * Book a new appointment
 * @param {number} clientId
 * @param {object} bookingData
 * @returns {Appointment}
 */
exports.bookAppointment = async (clientId, bookingData) => {
  const { counselorId, appointmentDate, timeSlot, notes } = bookingData;

  if (!counselorId || !appointmentDate || !timeSlot) {
    throw new Error('Counselor ID, date, and time slot are required fields.');
  }

  if (!STANDARD_SLOTS.includes(timeSlot)) {
    throw new Error('Invalid time slot option.');
  }

  const counselor = await User.findOne({
    where: { id: counselorId, role: 'Counselor', status: 'Active' }
  });

  if (!counselor) {
    throw new Error('The selected counselor is not available.');
  }

  const existingBooking = await Appointment.findOne({
    where: {
      counselorId,
      appointmentDate,
      timeSlot,
      status: {
        [Op.in]: BOOKED_STATUSES
      }
    }
  });

  if (existingBooking) {
    throw new Error('The selected time slot is already booked or waiting for approval.');
  }

  const createdAppointment = await Appointment.create({
    clientId,
    counselorId,
    appointmentDate,
    timeSlot,
    notes,
    status: APPOINTMENT_STATUSES.PENDING
  });

  const fullAppointment = (await loadAppointmentById(createdAppointment.id, 'Admin')) || createdAppointment;
  emitAppointmentEvent(
    'booking:new',
    fullAppointment,
    'created',
    'New booking request submitted.'
  );

  return fullAppointment;
};

/**
 * Approve a booking request.
 * @param {number} id
 * @returns {Appointment}
 */
exports.approveAppointment = async (id) => {
  const appointment = await loadAppointmentById(id, 'Admin');

  if (!appointment) {
    throw new Error('Appointment not found.');
  }

  if (!REVIEWABLE_STATUSES.includes(appointment.status)) {
    throw new Error(`Cannot approve appointment. Current status is ${appointment.status.toLowerCase()}.`);
  }

  appointment.status = APPOINTMENT_STATUSES.APPROVED;
  await appointment.save();

  const updatedAppointment = (await loadAppointmentById(id, 'Admin')) || appointment;
  emitAppointmentEvent(
    'booking:update',
    updatedAppointment,
    'approved',
    'Booking request approved.'
  );

  return updatedAppointment;
};

/**
 * Reject a booking request.
 * @param {number} id
 * @returns {Appointment}
 */
exports.rejectAppointment = async (id) => {
  const appointment = await loadAppointmentById(id, 'Admin');

  if (!appointment) {
    throw new Error('Appointment not found.');
  }

  if (!REVIEWABLE_STATUSES.includes(appointment.status)) {
    throw new Error(`Cannot reject appointment. Current status is ${appointment.status.toLowerCase()}.`);
  }

  appointment.status = APPOINTMENT_STATUSES.REJECTED;
  await appointment.save();

  const updatedAppointment = (await loadAppointmentById(id, 'Admin')) || appointment;
  emitAppointmentEvent(
    'booking:update',
    updatedAppointment,
    'rejected',
    'Booking request rejected.'
  );

  return updatedAppointment;
};

/**
 * Cancel an appointment
 * @param {number} userId
 * @param {number} id
 * @param {string} role
 * @returns {Appointment}
 */
exports.cancelAppointment = async (userId, id, role) => {
  const whereClause = { id };

  if (role === 'Counselor') {
    whereClause.counselorId = userId;
  } else if (role !== 'Admin' && role !== 'SuperAdmin') {
    whereClause.clientId = userId;
  }

  const appointment = await Appointment.findOne({ where: whereClause });
  if (!appointment) {
    throw new Error('Appointment not found or unauthorized.');
  }

  if (!BOOKED_STATUSES.includes(appointment.status)) {
    throw new Error(`Cannot cancel appointment. Current status is ${appointment.status.toLowerCase()}.`);
  }

  appointment.status = APPOINTMENT_STATUSES.CANCELLED;
  await appointment.save();

  const updatedAppointment = (await loadAppointmentById(id, role)) || appointment;
  emitAppointmentEvent(
    'booking:update',
    updatedAppointment,
    'cancelled',
    'Appointment cancelled.'
  );

  return updatedAppointment;
};

exports.APPOINTMENT_STATUSES = APPOINTMENT_STATUSES;
