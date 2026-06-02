// IST = UTC + 5:30
const getISTDate = () => {
  const now = new Date();
  // offset in ms: 5hr 30min = 19800 seconds
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
};

/**
 * Returns today's date as YYYY-MM-DD in IST
 */
const todayString = () => {
  const d = getISTDate();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

/**
 * Formats current IST time as HH:MM:SS AM/PM
 */
const currentTimeString = () => {
  const d = getISTDate();
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Attendance status based on IST hour
 * Before 9:30 AM IST → present, 9:30–10:30 → present (grace), after 10:30 → late
 */
const getAttendanceStatus = () => {
  const d = getISTDate();
  const hour = d.getUTCHours();
  const mins = d.getUTCMinutes();
  const totalMins = hour * 60 + mins;
  if (totalMins < 9 * 60 + 30) return 'present';       // before 9:30 AM IST
  if (totalMins <= 10 * 60 + 30) return 'present';     // grace period till 10:30 AM
  return 'late';
};

module.exports = { todayString, currentTimeString, getAttendanceStatus };