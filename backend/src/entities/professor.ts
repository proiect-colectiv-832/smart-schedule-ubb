import { Timetable, TimetableEntry } from '../types';


export class Professor {
    name: string;
    timetableEntries: TimetableEntry[];  

    constructor(data: Partial<Professor> = {}) {
        if (data.name && data.name.trim().length === 0) {
            throw new Error('Professor name cannot be empty');
        }

        this.name = data.name ?? '';
        this.timetableEntries = data.timetableEntries ?? [];
    }

    addTimetableEntry(entry: TimetableEntry): void {
        this.timetableEntries.push(entry);
    }

    getSubjects(): string[] {
        const subjects = new Set(this.timetableEntries.map(entry => entry.subject));
        return Array.from(subjects);
    }

    getGroups(): string[] {
        const groups = new Set(this.timetableEntries.map(entry => entry.group));
        return Array.from(groups);
    }

    getTeachingLoad(): number {
        return this.timetableEntries.length;
    }
}