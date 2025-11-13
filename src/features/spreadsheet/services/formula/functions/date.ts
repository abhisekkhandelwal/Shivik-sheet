
// Date & Time functions - Excel-compatible

// Note: Excel stores dates as serial numbers.
// For simplicity, these functions will work with JavaScript Date objects and ISO strings.

const TODAY = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toLocaleDateString(); // Return a string representation
};

const NOW = () => {
  return new Date().toLocaleString(); // Return a string representation
};

const DATE = (year: number, month: number, day: number) => {
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString();
};

const YEAR = (serial_number: Date | string | number) => {
  try {
    const date = new Date(serial_number);
    return isNaN(date.getTime()) ? '#VALUE!' : date.getFullYear();
  } catch {
    return '#VALUE!';
  }
};

const MONTH = (serial_number: Date | string | number) => {
  try {
    const date = new Date(serial_number);
    return isNaN(date.getTime()) ? '#VALUE!' : date.getMonth() + 1;
  } catch {
    return '#VALUE!';
  }
};

const DAY = (serial_number: Date | string | number) => {
  try {
    const date = new Date(serial_number);
    return isNaN(date.getTime()) ? '#VALUE!' : date.getDate();
  } catch {
    return '#VALUE!';
  }
};

export const dateFunctions = {
    TODAY,
    NOW,
    DATE,
    YEAR,
    MONTH,
    DAY
};
