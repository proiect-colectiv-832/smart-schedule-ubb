import { Timetable, TimetableEntry} from "../types";

export class Subject {
    name : string;
    code : string;
    timetableEntries : TimetableEntry[];

    constructor(data: Partial<Subject> = {}) {
        if (data.name && data.name.trim().length === 0) {
            throw new Error('Subject name cannot be empty');
        }

        if (data.code && data.code.trim().length === 0) {
            throw new Error('Subject code cannot be empty');
        }

        this.name = data.name ?? '';
        this.code = data.code ?? '';
        this.timetableEntries = data.timetableEntries ?? [];
    }


    addTimetableEntry(entry: TimetableEntry): void {
        this.timetableEntries.push(entry);
    }

    getTeachers(): string[] {
        const teachers = new Set(this.timetableEntries.map(entry => entry.teacher));
        return Array.from(teachers);
    }

    getGroups(): string[] {
        const groups = new Set(this.timetableEntries.map(entry => entry.group));
        return Array.from(groups);
    }

    getTeachingLoad(): number {
        return this.timetableEntries.length;
    }
}