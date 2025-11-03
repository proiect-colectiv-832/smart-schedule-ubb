import { Timetable } from "./timetable";

class TeacherTimetable extends Timetable {
    teacherName: string;

    constructor(data: Partial<TeacherTimetable> = {}) {
        super({ entries: data.entries });

        // Validare teacherName (nu trebuie sa fie gol)
        if (data.teacherName && data.teacherName.trim().length === 0) {
            throw new Error('Numele profesorului nu poate fi gol');
        }

        this.teacherName = data.teacherName ?? '';
    }
}

export { TeacherTimetable };

