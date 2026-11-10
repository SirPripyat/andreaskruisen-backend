export const parseBirthdate = (raw: string): Date => {
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const [datePart, timePart] = raw.split(' ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute] = (timePart ?? '0:00').split(':').map(Number);

  return new Date(Date.UTC(year, month - 1, day, hour, minute));
};
