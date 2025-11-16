/**
 * Demo REAL - Generare calendar .ics pentru grupa MIE3
 * Folosește orarul REAL de pe site și îl transformă în calendar cu vacanțe integrate
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseTimetable } from '../parsers/timetable-parser';
import { convertTimetableEntriesToEvents } from './timetable-to-events-converter';
import { generateICalendar, invalidateAcademicCache } from './icalendar-generator';
import { UserTimetable } from './user-timetable-manager';

async function main() {
  console.log('='.repeat(80));
  console.log('📚 DEMO REAL - Calendar grupa MIE3 (anul 3) cu structura academică UBB');
  console.log('='.repeat(80));
  console.log('');

  // Invalidăm cache-ul pentru scraping fresh
  invalidateAcademicCache();

  try {
    // 1. Parsăm orarul REAL de pe site pentru MIE3
    console.log('📥 Descărcăm orarul pentru MIE3...');
    // Folosim un URL care funcționează - ești pe semestrul 1 2024-2025
    const timetableUrl = 'https://www.cs.ubbcluj.ro/files/orar/2024-1/tabelar/MIE3.html';

    const timetable = await parseTimetable(timetableUrl);
    console.log(`✅ Orar descărcat: ${timetable.entries.length} intrări găsite`);
    console.log(`   URL: ${timetableUrl}`);
    console.log('');

    // Afișăm câteva exemple de cursuri
    console.log('📋 Exemple de cursuri din orar:');
    timetable.entries.slice(0, 5).forEach((entry: any, idx: number) => {
      console.log(`   ${idx + 1}. ${entry.subject} - ${entry.type}`);
      console.log(`      ${entry.day} ${entry.hours}, sala ${entry.room}, ${entry.frequency}`);
      console.log(`      Prof: ${entry.teacher}`);
    });
    if (timetable.entries.length > 5) {
      console.log(`   ... și încă ${timetable.entries.length - 5} cursuri`);
    }
    console.log('');

    // 2. Convertim intrările în evenimente pentru calendar
    console.log('🔄 Convertim orarul în evenimente de calendar...');

    // Folosim datele reale din structura academică
    const semesterStart = new Date('2024-09-30'); // Start semestru I 2024-2025
    const semesterEnd = new Date('2025-01-19');   // End semestru I

    const events = convertTimetableEntriesToEvents(
      timetable.entries,
      semesterStart,
      semesterEnd
    );

    console.log(`✅ ${events.length} evenimente create`);
    console.log('');

    // 3. Creăm timetable-ul pentru user
    const userTimetable: UserTimetable = {
      userId: 'mie3-demo',
      events: events,
      semesterStart: semesterStart,
      semesterEnd: semesterEnd,
      lastModified: new Date().toISOString()
    };

    console.log('📊 Statistici orar:');
    const typeCount: Record<string, number> = {};
    events.forEach(e => {
      typeCount[e.type] = (typeCount[e.type] || 0) + 1;
    });
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} cursuri`);
    });
    console.log('');

    // 4. Generăm calendare .ics cu diferite configurații
    console.log('='.repeat(80));
    console.log('📅 Generăm fișiere .ics...');
    console.log('='.repeat(80));
    console.log('');

    const outputDir = path.join(__dirname, '..', '..', 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Calendar 1: Complet cu vacanțe și examene (ani neterminali)
    console.log('1️⃣  Calendar complet (cu vacanțe și examene) - ani neterminali...');
    const icalFull = await generateICalendar(userTimetable, 'mie3-demo', {
      language: 'ro-en',
      isTerminalYear: false,
      includeVacations: true,
      includeExamPeriods: true
    });

    const fullPath = path.join(outputDir, 'mie3-complet.ics');
    fs.writeFileSync(fullPath, icalFull, 'utf8');

    const fullEvents = (icalFull.match(/BEGIN:VEVENT/g) || []).length;
    const fullVacations = (icalFull.match(/🏖️/g) || []).length;
    const fullExams = (icalFull.match(/📝/g) || []).length;

    console.log(`   ✅ Salvat: ${fullPath}`);
    console.log(`   📊 ${fullEvents} evenimente totale`);
    console.log(`      - ${events.length} cursuri`);
    console.log(`      - ${fullVacations} vacanțe`);
    console.log(`      - ${fullExams} sesiuni examene`);
    console.log(`   📏 ${(icalFull.length / 1024).toFixed(2)} KB`);
    console.log('');

    // Calendar 2: Doar cursuri (fără vacanțe)
    console.log('2️⃣  Calendar doar cu cursuri (fără vacanțe)...');
    const icalClean = await generateICalendar(userTimetable, 'mie3-demo', {
      language: 'ro-en',
      isTerminalYear: false,
      includeVacations: false,
      includeExamPeriods: false
    });

    const cleanPath = path.join(outputDir, 'mie3-doar-cursuri.ics');
    fs.writeFileSync(cleanPath, icalClean, 'utf8');

    console.log(`   ✅ Salvat: ${cleanPath}`);
    console.log(`   📊 ${events.length} evenimente (doar cursuri)`);
    console.log(`   📏 ${(icalClean.length / 1024).toFixed(2)} KB`);
    console.log('');

    // Calendar 3: Cu vacanțe dar fără examene
    console.log('3️⃣  Calendar cu vacanțe (fără examene)...');
    const icalVacation = await generateICalendar(userTimetable, 'mie3-demo', {
      language: 'ro-en',
      isTerminalYear: false,
      includeVacations: true,
      includeExamPeriods: false
    });

    const vacationPath = path.join(outputDir, 'mie3-cu-vacante.ics');
    fs.writeFileSync(vacationPath, icalVacation, 'utf8');

    const vacationEvents = (icalVacation.match(/BEGIN:VEVENT/g) || []).length;

    console.log(`   ✅ Salvat: ${vacationPath}`);
    console.log(`   📊 ${vacationEvents} evenimente (cursuri + vacanțe)`);
    console.log(`   📏 ${(icalVacation.length / 1024).toFixed(2)} KB`);
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ SUCCESS! Toate calendarele generate');
    console.log('='.repeat(80));
    console.log('');

    console.log('📁 Fișiere generate în: backend/test-output/');
    console.log('   1. mie3-complet.ics       - Calendar complet cu vacanțe și examene');
    console.log('   2. mie3-doar-cursuri.ics  - Doar orarul, fără vacanțe');
    console.log('   3. mie3-cu-vacante.ics    - Orar + vacanțe (fără examene)');
    console.log('');

    console.log('📖 Cum să folosești:');
    console.log('   1. Deschide oricare fișier .ics cu Google Calendar, Apple Calendar sau Outlook');
    console.log('   2. Cursurile vor apărea automat în calendar');
    console.log('   3. Vacanțele sunt marcate ca evenimente all-day cu 🏖️');
    console.log('   4. Sesiunile de examene sunt marcate cu 📝');
    console.log('');

    console.log('🔍 Ce să verifici:');
    console.log('   ✅ Cursurile apar în zilele corecte (Luni, Marți, etc.)');
    console.log('   ✅ Orele sunt corecte');
    console.log('   ✅ Cursurile săptămână 1/2 apar corect (odd/even weeks)');
    console.log('   ✅ NU apar cursuri în perioadele de vacanță');
    console.log('   ✅ Vacanțele sunt marcate clar:');
    console.log('      - 🏖️ Vacanță de Crăciun (22 dec - 4 ian)');
    console.log('      - 🏖️ Vacanță (9-15 feb)');
    console.log('      - 📝 Sesiune examene (19 ian - 8 feb)');
    console.log('      - 🔄 Sesiune restanțe (16-22 feb)');
    console.log('');

    console.log('🎯 Structura academică integrată:');
    console.log('   - Cursurile se repetă săptămânal până la sfârșitul semestrului');
    console.log('   - Vacanțele sunt excluse automat (cursurile nu apar în vacanță)');
    console.log('   - Datele sunt luate LIVE de pe site-ul UBB');
    console.log('   - Calendar valid pentru anul academic 2024-2025, Semestrul I');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ EROARE:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('🎉 Demo finalizat cu succes!');
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
