export function normalizeDateForInput(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return '';

  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return buildValidatedIsoDate(isoMatch[1], isoMatch[2], isoMatch[3]);
  }

  const displayMatch = trimmedValue.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (displayMatch) {
    return buildValidatedIsoDate(displayMatch[3], displayMatch[2], displayMatch[1]);
  }

  return '';
}

export function formatDateForDisplay(value: string | null | undefined): string {
  const normalizedValue = normalizeDateForInput(value);
  if (!normalizedValue) return '';

  const [year, month, day] = normalizedValue.split('-');
  return `${day}-${month}-${year}`;
}

export function formatDateInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, '').slice(0, 8);
  const day = digitsOnly.slice(0, 2);
  const month = digitsOnly.slice(2, 4);
  const year = digitsOnly.slice(4, 8);

  return [day, month, year].filter(Boolean).join('-');
}

function buildValidatedIsoDate(year: string, month: string, day: string): string {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);

  if (!yearNumber || !monthNumber || !dayNumber) {
    return '';
  }

  const parsedDate = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
  const isValidDate =
    parsedDate.getUTCFullYear() === yearNumber &&
    parsedDate.getUTCMonth() === monthNumber - 1 &&
    parsedDate.getUTCDate() === dayNumber;

  if (!isValidDate) {
    return '';
  }

  return `${year}-${month}-${day}`;
}
