import { TimetableEntries } from "./timetable_entries";

class Timetable {
    entries: TimetableEntries[];

    constructor(data: Partial<Timetable> = {}) {
        // Validare entries - trebuie sa fie un array
        if (data.entries && !Array.isArray(data.entries)) {
            throw new Error('Entries trebuie sa fie un array');
        }

        // Validare ca toate elementele din array sunt TimetableEntries
        if (data.entries) {
            data.entries.forEach((entry, index) => {
                if (!(entry instanceof TimetableEntries)) {
                    console.warn(`Elementul ${index} din entries nu este de tip TimetableEntries`);
                }
            });
        }

        this.entries = data.entries ?? [];
    }

}

export { Timetable };

