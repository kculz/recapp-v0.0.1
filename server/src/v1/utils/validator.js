/**
 * Simple email validation helper using standard regex
 * @param {string} email
 * @returns {boolean}
 */
exports.isValidEmail = (email) => {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};
