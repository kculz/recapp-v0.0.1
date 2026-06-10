const crypto = require('crypto');
const { User } = require('../../models');
const { Op } = require('sequelize');
const redis = require('../../config/redis');
const { addEmailJob } = require('../utils/emailQueue');

const normalizeEmail = (email) => String(email ?? '').trim();
const normalizeOtpCode = (code) => String(code ?? '').trim();

/**
 * Create an invitation for a new client (Admin-only flow)
 * @param {object} inviteData
 * @returns {object}
 */
exports.createInvite = async (inviteData) => {
  const { name, email, role, clientType, assignedCounselorId } = inviteData;

  // Generate activation token
  const activationToken = crypto.randomBytes(32).toString('hex');
  const activationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 Hours

  const user = await User.create({
    name,
    email,
    role: role || 'Client',
    clientType: role === 'Client' ? clientType : null,
    assignedCounselorId: role === 'Client' ? assignedCounselorId : null,
    status: 'Pending',
    activationToken,
    activationExpires
  });

  // Enqueue invitation email job via Bull queue
  await addEmailJob({
    type: 'invite',
    email,
    name,
    token: activationToken
  });

  return { user, activationToken };
};

/**
 * Verify if an activation token is valid
 * @param {string} token
 * @returns {User|null}
 */
exports.verifyActivationToken = async (token) => {
  if (!token) return null;
  const user = await User.findOne({
    where: {
      activationToken: token,
      activationExpires: { [Op.gt]: new Date() },
      status: 'Pending'
    }
  });
  return user;
};

/**
 * Set password and activate the user profile
 * @param {string} token
 * @param {string} password
 * @returns {User}
 */
exports.activateAccount = async (token, password) => {
  const user = await User.scope('withPassword').findOne({
    where: {
      activationToken: token,
      activationExpires: { [Op.gt]: new Date() },
      status: 'Pending'
    }
  });

  if (!user) {
    throw new Error('Invalid or expired activation link.');
  }

  user.password = password;
  user.status = 'Active';
  user.activationToken = null;
  user.activationExpires = null;
  await user.save();

  return user;
};

/**
 * Generate a 6-digit OTP code and store in Redis with 5 min TTL
 * @param {string} email
 * @returns {string} code
 */
exports.generateOTP = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const key = `otp:${normalizedEmail}`;
  const existingCode = await redis.get(key);

  if (existingCode) {
    console.log(`[OTP] Reusing active code for ${normalizedEmail}: ${existingCode}`);
    await redis.expire(key, 300);

    await addEmailJob({
      type: 'otp',
      email: normalizedEmail,
      code: existingCode
    });

    return existingCode;
  }

  // Generate random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(`[OTP] ${normalizedEmail}: ${code}`);

  // Store in Redis with a 5-minute TTL (300 seconds)
  await redis.set(key, code, 'EX', 300);

  // Enqueue OTP email job via Bull queue
  await addEmailJob({
    type: 'otp',
    email: normalizedEmail,
    code
  });

  return code;
};

/**
 * Verify the OTP code against Redis
 * @param {string} email
 * @param {string} code
 * @returns {boolean}
 */
exports.verifyOTP = async (email, code) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = normalizeOtpCode(code);
  const storedCode = await redis.get(`otp:${normalizedEmail}`);
  
  if (!storedCode || normalizeOtpCode(storedCode) !== normalizedCode) {
    return false;
  }

  // OTP validated, delete it immediately from Redis (one-time use)
  await redis.del(`otp:${normalizedEmail}`);

  return true;
};
