const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const LEAVE_TYPES = ["annual", "sick", "unpaid"];
const LEAVE_STATUSES = ["pending", "approved", "rejected"];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value) {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

function isValidDate(value) {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function compareDates(start, end) {
  return new Date(`${start}T00:00:00.000Z`) <= new Date(`${end}T00:00:00.000Z`);
}

module.exports = {
  LEAVE_STATUSES,
  LEAVE_TYPES,
  compareDates,
  isValidDate,
  isValidEmail,
  normalizeEmail,
  normalizeText,
};
