class TimeInterval {
    start: string; // format "HH:MM"
    end: string;   // format "HH:MM"

    constructor(start: string, end: string) {
        // Validare format HH:MM
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

        if (!timeRegex.test(start)) {
            throw new Error(`Ora de start "${start}" nu este in formatul corect (HH:MM)`);
        }

        if (!timeRegex.test(end)) {
            throw new Error(`Ora de sfarsit "${end}" nu este in formatul corect (HH:MM)`);
        }

        // Validare ca start < end
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (startMinutes >= endMinutes) {
            throw new Error('Ora de start trebuie sa fie inainte de ora de sfarsit');
        }

        this.start = start;
        this.end = end;
    }

    toString(): string {
        return `${this.start} - ${this.end}`;
    }

    // Helper pentru a crea TimeInterval din string "HH:MM - HH:MM"
    static fromString(intervalString: string): TimeInterval {
        const match = intervalString.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);

        if (!match) {
            throw new Error(`Intervalul "${intervalString}" nu este in formatul corect (HH:MM - HH:MM)`);
        }

        return new TimeInterval(match[1], match[2]);
    }
}

export { TimeInterval };

