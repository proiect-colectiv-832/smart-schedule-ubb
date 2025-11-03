import { Timetable } from "./timetable";

class StudentTimetable extends Timetable {
    academicYear: string;
    semester: string;
    specialization: string;
    yearOfStudy: string;
    groupName: string;

    constructor(data: Partial<StudentTimetable> = {}) {
        super({ entries: data.entries });
        this.academicYear = data.academicYear ?? '';
        
        // Validare semester (trebuie sa fie "1" sau "2")
        if (data.semester && !['1', '2'].includes(data.semester)) {
            throw new Error('Semestrul trebuie sa fie "1" sau "2"');
        }
        this.semester = data.semester ?? '';
        
        // Validare specialization (nu trebuie sa fie gol)
        if (data.specialization && data.specialization.trim().length === 0) {
            throw new Error('Specializarea nu poate fi goala');
        }
        this.specialization = data.specialization ?? '';
        
        // Validare yearOfStudy (trebuie sa fie intre 1 si 4 pentru licenta, sau mai mult pentru master)
        if (data.yearOfStudy) {
            const year = parseInt(data.yearOfStudy, 10);
            if (isNaN(year) || year < 1 || year > 6) {
                throw new Error('Anul de studiu trebuie sa fie intre 1 si 6');
            }
        }
        this.yearOfStudy = data.yearOfStudy ?? '';
        
        // Validare groupName
        if (data.groupName && data.groupName.trim().length === 0) {
            throw new Error('Numele grupei nu poate fi gol');
        }
        this.groupName = data.groupName ?? '';
    }
}

export { StudentTimetable };

