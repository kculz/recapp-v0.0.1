const CRISIS_KEYWORDS = [
  'suicide',
  'self-harm',
  'relapse',
  'overdose',
  'kill myself',
  'depressed',
  'hurt myself',
  'end my life'
];

/**
 * Scan a text content string for crisis keywords
 * @param {string} text
 * @returns {boolean} isCrisis
 */
exports.scanText = (text) => {
  if (!text) return false;
  const lowercaseText = text.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowercaseText.includes(keyword));
};

module.exports = {
  scanText: exports.scanText,
  CRISIS_KEYWORDS
};
