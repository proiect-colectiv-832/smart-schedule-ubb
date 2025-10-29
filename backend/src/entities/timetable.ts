class Timetable {
    day: string;
    hours: string;
    frequency: string;
    room: string;
    group: string;
    type: string;
    subject: string;
    teacher: string;

    constructor(data: Partial<Timetable> = {}) { // Partial inseamna ca obiectul data poate sa contina oricare dintre proprietatile lui Timetable, dar nu e obligatoriu sa le contina pe toate
        this.day = data.day ?? ''; // daca valoarea din stanga de ?? e nula sau indefinita, se atribuie valoarea din dreapta, aia fiind ' '
        this.hours = data.hours ?? '';
        this.frequency = data.frequency ?? '';
        this.room = data.room ?? '';
        this.group = data.group ?? '';
        this.type = data.type ?? '';
        this.subject = data.subject ?? '';
        this.teacher = data.teacher ?? '';
    }
}
