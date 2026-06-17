export const formatDateRangeLabel = (start, end, isSingleDay) => {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  if (isSingleDay) return start.toLocaleDateString('en-US', options);
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
};

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