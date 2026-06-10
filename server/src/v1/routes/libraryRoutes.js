const express = require('express');
const router = express.Router();
const { listResources, createResource, updateResource, deleteResource } = require('../controllers/libraryController');

// GET /library — list resources (role-filtered)
router.get('/', listResources);

// POST /library — create resource (Admin, Counselor, SuperAdmin)
router.post('/', createResource);

// PATCH /library/:id — update resource
router.patch('/:id', updateResource);

// DELETE /library/:id — delete resource (Admin, SuperAdmin only)
router.delete('/:id', deleteResource);

module.exports = router;
