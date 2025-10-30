import { TimeInterval } from "./time_interval";

class TimetableEntries {
    day: string;
    interval: TimeInterval;
    frequency: string;
    room: string;
    format: string;
    type: string;
    subject: string;      // numele materiei (pentru afisare)
    teacher: string;

    private static readonly VALID_DAYS = ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata', 'Duminica'];
    private static readonly VALID_TYPES = ['Curs', 'Seminar', 'Laborator'];
    private static readonly VALID_FREQUENCIES = ['sapt. 1', 'sapt. 2'];

    constructor(data: Partial<TimetableEntries> = {}) {
        // Validare day
        if (data.day && !TimetableEntries.VALID_DAYS.includes(data.day)) {
            console.warn(`Ziua "${data.day}" nu este valida. Se accepta: ${TimetableEntries.VALID_DAYS.join(', ')}`);
        }
        this.day = data.day ?? '';

        // Validare interval - acum e TimeInterval object
        if (!data.interval) {
            this.interval = new TimeInterval('00:00', '00:00');
        } else if (data.interval instanceof TimeInterval) {
            this.interval = data.interval;
        } else {
            throw new Error('Intervalul trebuie sa fie o instanta de TimeInterval');
        }

        // Validare frequency
        if (data.frequency && !TimetableEntries.VALID_FREQUENCIES.includes(data.frequency)) {
            console.warn(`Frecventa "${data.frequency}" nu este valida. Se accepta: ${TimetableEntries.VALID_FREQUENCIES.join(', ')}`);
        }
        this.frequency = data.frequency ?? '';

        // Validare room
        this.room = data.room ?? '';

        // Validare format
        this.format = data.format ?? '';

        // Validare type
        if (data.type && !TimetableEntries.VALID_TYPES.includes(data.type)) {
            console.warn(`Tipul "${data.type}" nu este valid. Se accepta: ${TimetableEntries.VALID_TYPES.join(', ')}`);
        }
        this.type = data.type ?? '';

        // Validare subject (numele materiei pentru afisare)
        if (data.subject && data.subject.trim().length === 0) {
            throw new Error('Numele subiectului nu poate fi gol');
        }
        this.subject = data.subject ?? '';

        // Validare teacher
        this.teacher = data.teacher ?? '';
    }
}
export { TimetableEntries };