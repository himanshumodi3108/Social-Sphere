/**
 * Pagination utility functions
 */

export const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const createPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  };
};

export const paginateQuery = async (query, page, limit) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    query.skip(skip).limit(limit),
    query.model.countDocuments(query.getQuery())
  ]);

  return { data, total };
};

