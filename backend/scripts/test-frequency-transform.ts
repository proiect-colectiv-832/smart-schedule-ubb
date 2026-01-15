// Quick test to verify frequency transformation
import { TimetableEntry } from '../src/types';

// Simulate the transformation function from server.ts
function transformTimetableEntry(entry: TimetableEntry, id: number) {
  const parseTime = (hourStr: string) => {
    const match = hourStr.match(/(\d+):?(\d*)/);
    if (match) {
      return {
        hour: parseInt(match[1]),
        minute: match[2] ? parseInt(match[2]) : 0
      };
    }
    return { hour: 8, minute: 0 };
  };

  const hours = entry.hours.split('-');
  const startTime = parseTime(hours[0] || '8');
  const endTime = parseTime(hours[1] || '10');

  const dayMap: Record<string, string> = {
    'luni': 'monday',
    'marti': 'tuesday',
    'marți': 'tuesday',
    'miercuri': 'wednesday',
    'joi': 'thursday',
    'vineri': 'friday',
    'sambata': 'saturday',
    'sâmbătă': 'saturday',
    'duminica': 'sunday',
    'duminică': 'sunday',
  };

  // Normalize frequency - check for specific patterns first
  let frequency = 'weekly'; // default
  const freqLower = (entry.frequency || '').toLowerCase().trim();

  if (freqLower.includes('sapt. 1') || freqLower.includes('săpt. 1') || freqLower === 's1') {
    frequency = 'oddweeks'; // săptămână impară
  } else if (freqLower.includes('sapt. 2') || freqLower.includes('săpt. 2') || freqLower === 's2') {
    frequency = 'evenweeks'; // săptămână pară
  } else if (freqLower.includes('1-14') || freqLower.includes('săpt') || freqLower.includes('sapt')) {
    frequency = 'weekly'; // toate săptămânile
  }

  const typeMap: Record<string, string> = {
    'curs': 'lecture',
    'seminar': 'seminar',
    'laborator': 'lab',
    'lab': 'lab',
  };

  const day = dayMap[entry.day?.toLowerCase()] || 'monday';
  const type = typeMap[entry.type?.toLowerCase()] || 'lecture';

  return {
    id,
    day,
    interval: {
      start: startTime,
      end: endTime
    },
    subjectName: entry.subject || 'Unknown',
    teacher: entry.teacher || 'Unknown',
    frequency,
    type,
    room: entry.room || '',
    format: entry.group || ''  // MIE3, 832, 831/1, etc. - valoarea din coloana Formatia
  };
}

// Test data
const testEntries: TimetableEntry[] = [
  {
    day: 'Joi',
    hours: '8-10',
    frequency: 'sapt. 1',
    room: 'L001',
    group: 'MIE3',
    type: 'Laborator',
    subject: 'Instrumente CASE',
    teacher: 'Conf. CHIOREAN Dan'
  },
  {
    day: 'Joi',
    hours: '8-10',
    frequency: 'sapt. 2',
    room: 'L001',
    group: 'MIE3',
    type: 'Laborator',
    subject: 'Baze de Date',
    teacher: 'Lect. Popescu Ion'
  },
  {
    day: 'Vineri',
    hours: '10-12',
    frequency: 'sapt. 1-14',
    room: 'C309',
    group: 'MIE3',
    type: 'Curs',
    subject: 'Algoritmi',
    teacher: 'Prof. Ionescu Maria'
  }
];

console.log('🧪 Testing Frequency Transformation:\n');

testEntries.forEach((entry, index) => {
  const transformed = transformTimetableEntry(entry, index + 1);
  console.log(`Entry ${index + 1}:`);
  console.log(`  Input frequency:  "${entry.frequency}"`);
  console.log(`  Output frequency: "${transformed.frequency}"`);
  console.log(`  Subject: ${transformed.subjectName}`);
  console.log(`  Type: ${transformed.type}`);
  console.log(`  Day: ${transformed.day}`);
  console.log(`  Format (Formatia): ${transformed.format}`);
  console.log();
});

console.log('✅ Expected results:');
console.log('  Entry 1: "sapt. 1" → "oddweeks", format: "MIE3"');
console.log('  Entry 2: "sapt. 2" → "evenweeks", format: "MIE3"');
console.log('  Entry 3: "sapt. 1-14" → "weekly", format: "MIE3"');

