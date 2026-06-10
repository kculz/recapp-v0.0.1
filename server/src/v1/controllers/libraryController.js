const libraryService = require('../services/libraryService');

const STAFF_ROLES = ['Admin', 'SuperAdmin', 'Counselor'];

const listResources = async (req, res) => {
  try {
    const { category, type, page, limit } = req.query;
    const role = req.user.role;
    const result = await libraryService.getResources({
      category,
      type,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      role
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Library] listResources error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch resources.' });
  }
};

const createResource = async (req, res) => {
  if (!STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Not authorized.' });
  }
  try {
    const resource = await libraryService.createResource(req.body, req.user.id);
    return res.status(201).json({ success: true, data: resource });
  } catch (err) {
    console.error('[Library] createResource error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to create resource.' });
  }
};

const updateResource = async (req, res) => {
  if (!STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Not authorized.' });
  }
  try {
    const resource = await libraryService.updateResource(req.params.id, req.body);
    return res.json({ success: true, data: resource });
  } catch (err) {
    console.error('[Library] updateResource error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update resource.' });
  }
};

const deleteResource = async (req, res) => {
  if (!['Admin', 'SuperAdmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Not authorized.' });
  }
  try {
    await libraryService.deleteResource(req.params.id);
    return res.json({ success: true, message: 'Resource deleted.' });
  } catch (err) {
    console.error('[Library] deleteResource error:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to delete resource.' });
  }
};

module.exports = { listResources, createResource, updateResource, deleteResource };
