const { Resource } = require('../../models');
const { Op } = require('sequelize');

const ADMIN_ROLES = ['Admin', 'SuperAdmin', 'Counselor'];

/**
 * List published resources (clients) or all resources (staff).
 */
const getResources = async ({ category, type, page = 1, limit = 20, role }) => {
  const where = {};

  // Clients only see published resources
  if (!ADMIN_ROLES.includes(role)) {
    where.isPublished = true;
  }

  if (category && category !== 'All') {
    where.category = category;
  }

  if (type && type !== 'All') {
    where.type = type;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Resource.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  return { resources: rows, total: count, page, limit };
};

/**
 * Create a new resource (staff only).
 */
const createResource = async (data, publishedBy) => {
  const resource = await Resource.create({ ...data, publishedBy });
  return resource;
};

/**
 * Update an existing resource.
 */
const updateResource = async (id, data) => {
  const resource = await Resource.findByPk(id);
  if (!resource) throw new Error('Resource not found.');
  await resource.update(data);
  return resource;
};

/**
 * Delete a resource (admin/superAdmin only).
 */
const deleteResource = async (id) => {
  const resource = await Resource.findByPk(id);
  if (!resource) throw new Error('Resource not found.');
  await resource.destroy();
};

module.exports = { getResources, createResource, updateResource, deleteResource };
