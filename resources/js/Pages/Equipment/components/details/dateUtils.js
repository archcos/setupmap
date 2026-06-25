export const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export const getEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

export const formatDateRangeLabel = (start, end, isSingleDay) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (isSingleDay) {
    return startDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
  
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${daysDiff} days)`;
};