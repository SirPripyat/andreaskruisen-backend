// Usa getUTC*/setUTC* (não getFullYear/setFullYear) de propósito: esses
// últimos operam no fuso local do processo, e o deslocamento de DST em
// datas históricas pode diferir do de hoje, deslocando o resultado em 1h.
const subtractYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() - years);
  return result;
};

// age >= ageMin  <=>  birthdate <= hoje - ageMin anos (gte vira birthdateMax/lte)
// age <= ageMax  <=>  birthdate >  hoje - (ageMax + 1) anos (lte vira birthdateMin/gt,
// exclusivo: quem nasceu exatamente nessa data já fez ageMax + 1 anos hoje)
export const ageRangeToBirthdateRange = (
  ageMin: number | undefined,
  ageMax: number | undefined,
  now: Date = new Date(),
): { birthdateMin?: Date; birthdateMax?: Date } => ({
  birthdateMax: ageMin !== undefined ? subtractYears(now, ageMin) : undefined,
  birthdateMin:
    ageMax !== undefined ? subtractYears(now, ageMax + 1) : undefined,
});
