import API from './apiClient';

export const search = (query, filters = {}) => {
  const params = new URLSearchParams();
  params.append('query', query);
  
  if (filters.type) params.append('type', filters.type);
  if (filters.hashtag) params.append('hashtag', filters.hashtag);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  
  return API.get(`/search?${params.toString()}`);
};
