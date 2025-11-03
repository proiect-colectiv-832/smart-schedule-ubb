import { Timetable, TimetableEntry} from "../types";

export class Optional_subject {
    name : string;
    code : string;
    timetableEntries : TimetableEntry[];

    constructor(data: Partial<Optional_subject> = {}) {
        if (data.name && data.name.trim().length === 0) {
            throw new Error('Optional_subject name cannot be empty');
        }

        if (data.code && data.code.trim().length === 0) {
            throw new Error('Optional_subject code cannot be empty');
        }

        this.name = data.name ?? '';
        this.code = data.code ?? '';
        this.timetableEntries = data.timetableEntries ?? [];
    }
}