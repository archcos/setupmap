// utils/downloadUtils.js

/**
 * Get filter descriptions for display
 */
export const getFilterDescriptions = (filters, dateRangeLabel) => {
  const descriptions = [];
  
  if (filters.location && filters.location !== 'all') {
    descriptions.push(`Location: ${filters.location}`);
  }
  
  if (filters.status && filters.status !== 'all') {
    descriptions.push(`Status: ${filters.status === 'active' ? 'Active' : 'Inactive'}`);
  }
  
  if (dateRangeLabel) {
    descriptions.push(`Period: ${dateRangeLabel}`);
  }
  
  return descriptions;
};

/**
 * Apply filters to data (kept for backward compatibility)
 */
export const filterDataForExport = (data, filters) => {
  let filtered = [...data];
  
  if (filters.status === 'active') {
    filtered = filtered.filter(e => e.is_active);
  } else if (filters.status === 'inactive') {
    filtered = filtered.filter(e => !e.is_active);
  }
  
  if (filters.location && filters.location !== 'all') {
    filtered = filtered.filter(e => e.expected_location === filters.location);
  }
  
  return filtered;
};

/**
 * Get export summary (kept for backward compatibility)
 */
export const getExportSummary = (data, filters, dateRangeLabel) => {
  const filterDescriptions = getFilterDescriptions(filters, dateRangeLabel);
  
  return {
    count: data.length,
    filterDescriptions: filterDescriptions,
    activeCount: data.filter(e => e.is_active).length,
    inactiveCount: data.filter(e => !e.is_active).length,
  };
};