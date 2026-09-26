import { AcademicYearStructure, isFreeDay, SemesterStructure } from './academic-calendar-scraper';
import { UserEvent } from './user-timetable-manager';

export interface TeachingTerm {
  semester: SemesterStructure;
  start: Date;
  end: Date;
}

function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function mondayOf(date: Date): Date {
  const monday = dateOnly(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export function getTeachingTerm(
  structure: AcademicYearStructure,
  referenceDate: Date,
  isTerminalYear: boolean
): TeachingTerm | null {
  const month = referenceDate.getMonth();
  const semesterNumber = month >= 8 || month === 0 ? 'I' : 'II';
  const startYear = semesterNumber === 'I'
    ? referenceDate.getFullYear() - (month === 0 ? 1 : 0)
    : referenceDate.getFullYear() - 1;

  if (structure.academicYear !== `${startYear}-${startYear + 1}`) {
    return null;
  }

  const semester = structure.semesters.find(candidate =>
    candidate.semester === semesterNumber &&
    (semesterNumber === 'I' || !candidate.yearType ||
      candidate.yearType === (isTerminalYear ? 'terminal' : 'non-terminal'))
  );
  const teachingPeriods = semester?.periods.filter(period => period.type === 'teaching') || [];

  if (!semester || teachingPeriods.length === 0) {
    throw new Error(`Teaching periods for semester ${semesterNumber} are unavailable`);
  }

  return {
    semester,
    start: teachingPeriods[0].startDate,
    end: teachingPeriods[teachingPeriods.length - 1].endDate,
  };
}

/** Week numbers advance only when the faculty schedules teaching in that week. */
export function getTeachingOccurrences(
  event: UserEvent,
  structure: AcademicYearStructure,
  term: TeachingTerm
): Array<{ start: Date; end: Date }> {
  if (!event.isRecurring || !event.recurrenceRule) {
    return [{ start: event.startTime, end: event.endTime }];
  }

  const rule = event.recurrenceRule;
  const teachingPeriods = term.semester.periods.filter(period => period.type === 'teaching');
  const occurrences: Array<{ start: Date; end: Date }> = [];
  const firstAllowedDate = dateOnly(event.startTime);
  const lastAllowedDate = dateOnly(rule.until && rule.until < term.end ? rule.until : term.end);
  const daysOfWeek = rule.daysOfWeek?.length ? rule.daysOfWeek : [event.startTime.getDay()];
  let teachingWeekNumber = 0;
  let biweeklyWeekNumber = 0;

  for (let monday = mondayOf(term.start); monday <= term.end; monday.setDate(monday.getDate() + 7)) {
    const teachingDates = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + offset);
      return date;
    });
    const isTeachingDate = (date: Date): boolean => teachingPeriods.some(period =>
      date >= dateOnly(period.startDate) && date <= dateOnly(period.endDate)
    );

    if (!teachingDates.some(isTeachingDate)) continue;
    teachingWeekNumber++;

    if (teachingDates[6] < firstAllowedDate) continue;
    biweeklyWeekNumber++;

    const frequencyMatches = rule.frequency === 'weekly' ||
      (rule.frequency === 'oddweeks' && teachingWeekNumber % 2 === 1) ||
      (rule.frequency === 'evenweeks' && teachingWeekNumber % 2 === 0) ||
      (rule.frequency === 'biweekly' && biweeklyWeekNumber % 2 === 1);
    if (!frequencyMatches) continue;

    for (const dayOfWeek of daysOfWeek) {
      const date = teachingDates[(dayOfWeek + 6) % 7];
      if (date < firstAllowedDate || date > lastAllowedDate ||
          !isTeachingDate(date) || isFreeDay(date, structure)) continue;

      const start = new Date(date);
      start.setHours(event.startTime.getHours(), event.startTime.getMinutes(), 0, 0);
      const end = new Date(date);
      end.setHours(event.endTime.getHours(), event.endTime.getMinutes(), 0, 0);
      occurrences.push({ start, end });

      if (rule.count && occurrences.length >= rule.count) return occurrences;
    }
  }

  return occurrences;
}

export function occurrenceId(userId: string, eventId: string, date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${userId}-${eventId}-${y}${m}${d}`;
}
