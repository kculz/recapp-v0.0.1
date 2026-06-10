const authService = require('../services/authService');
const { signToken, verifyToken } = require('../utils/jwt');
const { User } = require('../../models');

/**
 * Invite a user (Admin/SuperAdmin only)
 */
exports.invite = async (req, res, next) => {
  try {
    const { name, email, role, clientType, assignedCounselorId } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered.' });
    }

    const { user, activationToken } = await authService.createInvite({
      name,
      email,
      role,
      clientType,
      assignedCounselorId
    });

    res.status(201).json({
      success: true,
      message: 'Invitation successfully generated.',
      data: {
        id: user.id,
        email: user.email,
        activationToken // Returned in body for verification mock test flows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify activation token validity
 */
exports.verifyActivation = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Activation token is required.' });
    }

    const user = await authService.verifyActivationToken(token);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired activation link.' });
    }

    res.json({
      success: true,
      data: {
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate account (Client sets password)
 */
exports.activate = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }

    await authService.activateAccount(token, password);

    res.json({
      success: true,
      message: 'Account activated successfully. You can now log in.'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Step 1 Login: Validate password and trigger OTP
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    // Find user (include password scope)
    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, error: `Account is ${user.status.toLowerCase()}.` });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    // Trigger OTP
    await authService.generateOTP(email);

    // Sign temporary MFA Token (valid for 5 minutes)
    const mfaToken = signToken({ email, purpose: 'mfa' }, '5m');

    res.json({
      success: true,
      requireMfa: true,
      mfaToken,
      message: 'verification code sent to your registered email.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 2 Login: Confirm OTP and return session token
 */
exports.verifyMfa = async (req, res, next) => {
  try {
    const { code, mfaToken } = req.body;
    if (!code || !mfaToken) {
      return res.status(400).json({ success: false, error: 'OTP code and MFA token are required.' });
    }

    // Decode and verify mfaToken structure
    const decoded = verifyToken(mfaToken);
    if (!decoded || decoded.purpose !== 'mfa' || !decoded.email) {
      return res.status(400).json({ success: false, error: 'Invalid or expired MFA session.' });
    }

    // Verify OTP code
    const isValid = await authService.verifyOTP(decoded.email, code);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
    }

    // Fetch user profile
    const user = await User.findOne({ where: { email: decoded.email } });
    if (!user) {
      return res.status(400).json({ success: false, error: 'User account not found.' });
    }

    // Generate final session token (signed with user ID)
    const sessionToken = signToken({ id: user.id }, '7d');

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientType: user.clientType
      }
    });
  } catch (error) {
    next(error);
  }
};
