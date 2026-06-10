const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const emailQueue = require('../utils/emailQueue');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

const compileTemplate = (templateName, context) => {
  try {
    const filePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.hbs`);
    const source = fs.readFileSync(filePath, 'utf-8');
    const template = handlebars.compile(source);
    return template(context);
  } catch (error) {
    console.error(`[EmailWorker] Error compiling Handlebars template ${templateName}:`, error);
    throw error;
  }
};

emailQueue.process(async (job) => {
  const { type, email, name, token, code, clientName } = job.data;
  console.log(`[EmailWorker] Processing job ${job.id} of type ${type} for ${email}`);
  
  let subject = '';
  let html = '';
  
  try {
    if (type === 'invite') {
      subject = 'RecApp - Invitation to Join Portal';
      const activationLink = `http://localhost:5001/api/v1/auth/verify-activation?token=${token}`;
      html = compileTemplate('invite', { name: name || 'User', activationLink, token });
    } else if (type === 'otp') {
      subject = 'RecApp - Your Two-Factor Verification Code';
      html = compileTemplate('otp', { code });
    } else if (type === 'support-invite') {
      subject = `${clientName} invited you to support their recovery journey 💙`;
      const acceptUrl = `http://localhost:5001/api/v1/family/accept-invite?token=${token}`;
      html = compileTemplate('support-invite', { name: name || 'Friend', clientName, token, acceptUrl });
    } else {
      throw new Error(`Unknown job type: ${type}`);
    }

    await transporter.sendMail({
      from: `"RecApp Portal" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      html
    });

    console.log(`[EmailWorker] Successfully sent email to ${email} for job: ${type}`);
  } catch (error) {
    console.error(`[EmailWorker] Failed to send email to ${email} for job: ${type}. Error:`, error);
    throw error; // throw error so Bull registers it as failed and can retry
  }
});

console.log('[EmailWorker] Worker initialized, listening for email jobs...');

module.exports = emailQueue;
