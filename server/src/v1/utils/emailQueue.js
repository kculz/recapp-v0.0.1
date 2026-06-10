const Queue = require('bull');
require('dotenv').config();

const emailQueue = new Queue('emailQueue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  }
});

emailQueue.addEmailJob = async (jobData) => {
  try {
    await emailQueue.add(jobData, {
      attempts: 3,
      backoff: 5000 // wait 5s before retrying
    });
    console.log(`[Queue] Added job of type: ${jobData.type} for email: ${jobData.email}`);
  } catch (error) {
    console.error('[Queue] Error adding email job to queue:', error);
    throw error;
  }
};

module.exports = emailQueue;
