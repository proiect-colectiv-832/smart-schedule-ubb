export function normalizeTimetableFrequency(value: string): 'weekly' | 'oddweeks' | 'evenweeks' {
  const frequency = value.toLowerCase().trim();

  if (/\b1\s*[-–]\s*14\b/.test(frequency)) return 'weekly';
  if (frequency === 'oddweeks' || /^s(?:ă|a)pt\.?\s*1$/.test(frequency) || frequency === 's1') {
    return 'oddweeks';
  }
  if (frequency === 'evenweeks' || /^s(?:ă|a)pt\.?\s*2$/.test(frequency) || frequency === 's2') {
    return 'evenweeks';
  }
  return 'weekly';
}
