const journalService = require('../services/journalService');

/**
 * Fetch all journals for the logged-in user
 */
exports.getJournals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const journals = await journalService.findEntriesByUser(userId);
    res.json({
      success: true,
      count: journals.length,
      data: journals
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync offline entries batch
 */
exports.syncJournals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { entries } = req.body;

    if (!Array.isArray(entries)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain an entries array.'
      });
    }

    const syncedList = await journalService.syncJournals(userId, entries);

    res.json({
      success: true,
      data: {
        synced: syncedList
      }
    });
  } catch (error) {
    next(error);
  }
};
