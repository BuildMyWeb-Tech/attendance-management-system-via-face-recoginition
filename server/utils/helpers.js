/**
 * Returns today's date as YYYY-MM-DD in local time (server-side)
 */
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Formats current time as HH:MM:SS AM/PM
 */
const currentTimeString = () => {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

/**
 * Determines status based on hour of day
 * Before 9:00 AM → present, 9:00–10:00 → present (grace), after 10:00 → late
 */
const getAttendanceStatus = () => {
  const hour = new Date().getHours();
  const mins = new Date().getMinutes();
  if (hour < 9) return 'present';
  if (hour === 9 && mins <= 30) return 'present';
  if (hour < 10) return 'present';
  return 'late';
};

module.exports = { todayString, currentTimeString, getAttendanceStatus };
