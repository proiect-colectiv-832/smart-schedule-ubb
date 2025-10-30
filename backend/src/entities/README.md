# 📚 Entități Backend - Smart Schedule UBB

## 🎯 Scurtă introducere

Acest folder conține **clasele de entități** care reprezintă structura de date a aplicației Smart Schedule. 
Aceste clase modelează orarul universitar cu toate componentele lui: materii, intervale orare, intrări în orar, și 
orare complete pentru studenți/profesori.

---

## 📋 Structura de fișiere

```
entities/
├── optional_subject.ts      # Clasa Optional_subject (materie/disciplină)
├── time_interval.ts         # Clasa TimeInterval (interval orar)
├── timetable_entries.ts     # Clasa TimetableEntries (o oră în orar)
├── timetable.ts             # Clasa Timetable (orar de bază)
├── student_timetable.ts     # Clasa StudentTimetable (orar student)
├── teacher_timetable.ts     # Clasa TeacherTimetable (orar profesor)
└── README.md                # Acest fișier
```

---

## 🏗️ Arhitectura entităților

### Diagrama relațiilor

```
┌─────────────────────┐
│  Optional_subject   │ (materie/disciplină)
│  - name             │
│  - code             │
│  - timetableEntries │ ←── Conține array de TimetableEntry[] (din types.ts)
└─────────────────────┘
        ↑
        │ 
        │
┌─────────────────────────────────┐
│    TimetableEntries             │ (o oră în orar)
│  - id                           │
│  - day, interval, room          │
│  - subject (string - nume)      │ ←── Doar numele materiei
│  - teacher, type, frequency     │
│  - format                       │
└─────────────────────────────────┘
        │
        │ multe entries formează
        ↓
┌─────────────────────────────────┐
│    Timetable                    │ (orar de bază)
│  - entries: TimetableEntries[]  │
└─────────────────────────────────┘
        ↑
        │ este extins de
        │
        ┌───────┴────────┐
        │                │
┌───────────────────┐ ┌──────────────────┐
│ StudentTimetable  │ │ TeacherTimetable │
│ + academicYear    │ │ + teacherName    │
│ + semester        │ └──────────────────┘
│ + specialization  │
│ + yearOfStudy     │
│ + groupName       │
└───────────────────┘
```

---

## 📖 Descrierea claselor

### 1. **Optional_subject** (Materie/Disciplină opțională)

**Scopul:** Reprezintă o materie academică cu toate orele ei (ex: "Programare Orientată pe Obiecte")

```typescript
class Optional_subject {
    name: string;                        // Numele materiei
    code: string;                        // Codul materiei  
    timetableEntries: TimetableEntry[];  // Array de entries (din types.ts, NU TimetableEntries din entities!)
}
```

**⚠️ IMPORTANT:**
- `timetableEntries` folosește tipul `TimetableEntry` din `types.ts`, NU clasa `TimetableEntries` din `entities/`
- Această clasă grupează toate orele unei materii în ea însăși
- Similar cu structura din Dart/Flutter

**Exemplu:**
```typescript
const subject = new Optional_subject({
    name: "Programare Orientată pe Obiecte",
    code: "POO101",
    timetableEntries: []  // se vor adăuga entries aici
});
```

---

### 2. **TimeInterval** (Interval orar)

**Scopul:** Reprezintă un interval de timp (ex: 08:00 - 10:00)

```typescript
class TimeInterval {
    start: string;       // Ora de început (format "HH:MM")
    end: string;         // Ora de sfârșit (format "HH:MM")
    
    toString(): string;  // Returnează "08:00 - 10:00"
    static fromString(intervalString: string): TimeInterval;
}
```

**Validări:**
- ✅ Verifică formatul HH:MM pentru start și end
- ✅ Verifică că ora de start < ora de sfârșit

**Exemplu:**
```typescript
const interval = new TimeInterval("08:00", "10:00");
console.log(interval.toString()); // "08:00 - 10:00"

// SAU din string
const interval2 = TimeInterval.fromString("14:00 - 16:00");
```

**Diferența față de Dart:**
- **Dart:** folosește `TimeOfDay` (obiect Flutter cu `hour` și `minute`)
- **TypeScript:** folosește string-uri "HH:MM" (mai simplu, fără dependențe externe)

---

### 3. **TimetableEntries** (O intrare în orar)

**Scopul:** Reprezintă o singură oră/activitate din orar (ex: Curs POO Luni 08:00-10:00)

```typescript
class TimetableEntries {
    day: string;             // Ziua săptămânii (Luni, Marti, etc.)
    interval: TimeInterval;  // Intervalul orar (obiect TimeInterval)
    frequency: string;       // Frecvența (sapt. 1, sapt. 2)
    room: string;            // Sala (ex: "C309", "online")
    format: string;          // Formatul grupei (ex: "832", "MIE")
    type: string;            // Tipul (Curs, Seminar, Laborator)
    subject: string;         // Numele materiei (pentru afișare)
    teacher: string;         // Numele profesorului
}
```

**Validări în constructor:**
- ✅ `day` - trebuie să fie în lista zilelor valide (Luni-Duminica)
- ✅ `interval` - trebuie să fie obiect TimeInterval valid
- ✅ `frequency` - trebuie să fie "sapt. 1" sau "sapt. 2"
- ✅ `type` - trebuie să fie Curs, Seminar sau Laborator
- ✅ `subject` - nu poate fi string gol

**Exemplu:**
```typescript
const interval = new TimeInterval("08:00", "10:00");
const entry = new TimetableEntries({
    day: "Luni",
    interval: interval,
    frequency: "sapt. 1",
    room: "C309",
    format: "832",
    type: "Curs",
    subject: "Programare Orientată pe Obiecte",
    teacher: "Prof. Popescu Ion"
});
```

---

### 4. **Timetable** (Orar de bază)

**Scopul:** Container simplu pentru multiple intrări în orar

```typescript
class Timetable {
    entries: TimetableEntries[];
}
```

**Validări în constructor:**
- ✅ Verifică că `entries` este un array
- ✅ Avertizează dacă elementele din array nu sunt instanțe de `TimetableEntries`

**Exemplu:**
```typescript
const timetable = new Timetable({
    entries: [entry1, entry2, entry3]
});

// Acces direct la entries
console.log(timetable.entries.length);
timetable.entries.push(newEntry);
const filtered = timetable.entries.filter(e => e.subject === "POO");
```

**⚠️ Notă:** Clasa este simplă și permite manipulare directă a array-ului `entries`. Pentru operații mai complexe, extinde această clasă (vezi `StudentTimetable`, `TeacherTimetable`).

---

### 5. **StudentTimetable** (Orarul unui student)

**Scopul:** Extinde `Timetable` cu informații specifice studenților

```typescript
class StudentTimetable extends Timetable {
    academicYear: string;     // Anul academic (ex: "2024-2025")
    semester: string;         // Semestrul ("1" sau "2")
    specialization: string;   // Specializarea (ex: "Informatică")
    yearOfStudy: string;      // Anul de studiu (1-6)
    groupName: string;        // Numele grupei (ex: "832")
}
```

**Validări speciale:**
- ✅ `academicYear` - format "YYYY-YYYY" (ex: "2024-2025")
- ✅ `semester` - doar "1" sau "2"
- ✅ `yearOfStudy` - între 1 și 6

**Exemplu:**
```typescript
const studentTimetable = new StudentTimetable({
    academicYear: "2024-2025",
    semester: "1",
    specialization: "Informatică",
    yearOfStudy: "3",
    groupName: "832",
    entries: [entry1, entry2]
});

// Moștenește toate metodele din Timetable
studentTimetable.addEntry(newEntry);
```

---

### 6. **TeacherTimetable** (Orarul unui profesor)

**Scopul:** Extinde `Timetable` cu informații specifice profesorilor

```typescript
class TeacherTimetable extends Timetable {
    teacherName: string;  // Numele profesorului
}
```

**Validări:**
- ✅ `teacherName` - nu poate fi string gol
- ✅ Warning dacă nu conține prenume și nume

**Exemplu:**
```typescript
const teacherTimetable = new TeacherTimetable({
    teacherName: "Prof. Popescu Ion",
    entries: [entry1, entry2, entry3]
});
```

---


## 🔄 Comparație Backend (TypeScript) vs Frontend (Dart)

| Concept | Backend (TypeScript) | Frontend (Dart) | Compatibilitate |
|---------|---------------------|-----------------|-----------------|
| **Subject** | `Optional_subject` (name, code, entries) | `Optional_subject` (name, id, entries) | ✅ Foarte similar |
| **Time Interval** | `TimeInterval` (start/end: string) | `TimeInterval` (start/end: TimeOfDay) | ⚠️ Tipuri diferite |
| **Entry** | `TimetableEntries` | `TimeTableEntry` | ✅ Foarte similar |
| **Timetable** | `Timetable` | `TimeTable` | ✅ Identic |
| **Student Timetable** | `StudentTimetable` | `StudentTimeTable` | ⚠️ Dart are `Field` object |
| **Teacher Timetable** | `TeacherTimetable` | `TeacherTimeTable` | ⚠️ Dart are `TeacherName` object |

### Diferențe majore:

**1. Enums:**
- **Dart:** `Day`, `Frequency`, `Type` sunt enum-uri
- **TypeScript:** Sunt string-uri (dar validate în constructor)

**2. Nested Objects:**
- **Dart:** `teacher: TeacherName` (obiect cu proprietate `name`)
- **TypeScript:** `teacher: string` (mai simplu, direct string)

**3. Time Interval:**
- **Dart:** `TimeInterval` cu `TimeOfDay` (obiect Flutter cu `hour` și `minute`)
- **TypeScript:** `TimeInterval` cu string-uri "HH:MM"

**4. Subject ID:**
- **Dart:** `Optional_subject` are `id: int`
- **TypeScript:** `Optional_subject` NU are `id` - identificarea se face prin `name` și `code`

**5. Student Timetable:**
- **Dart:** Are `Field field` (obiect complex cu specialization, academicYear, semester)
- **TypeScript:** Are proprietăți separate (`academicYear`, `semester`, `specialization`, `yearOfStudy`, `groupName`)

---

## 🎯 De ce această structură?

### ✅ **1. Simplitate și claritate**
```typescript
// Fiecare entry are doar informațiile de care are nevoie
const entry = new TimetableEntries({
    id: 1,
    day: "Luni",
    interval: new TimeInterval("08:00", "10:00"),
    subject: "POO",  // direct numele materiei
    teacher: "Prof. Popescu",
    // ...
});
```

### ✅ **2. Flexibilitate în manipularea datelor**
```typescript
const timetable = new Timetable({ entries: [entry1, entry2, entry3] });

// Filtrare simplă
const pooEntries = timetable.entries.filter(e => e.subject === "POO");

// Sortare după zi
const sorted = timetable.entries.sort((a, b) => a.day.localeCompare(b.day));

// Map/Transform
const subjects = timetable.entries.map(e => e.subject);
```

### ✅ **3. Grupare pe materii cu Optional_subject**
```typescript
// Creează un Optional_subject care conține toate orele sale
const pooSubject = new Optional_subject({
    name: "POO",
    code: "POO101",
    timetableEntries: timetable.entries.filter(e => e.subject === "POO")
});
```

### ✅ **4. Validări robuste**
- Toate clasele au validări în constructor
- Erori clare pentru date invalide (aruncă Error)
- Warning-uri pentru date suspecte (console.warn)

---

## 📝 Exemple de utilizare completă

### Scenario 1: Crearea unui orar de student

```typescript
// 1. Creează intervale orare
const interval1 = new TimeInterval("08:00", "10:00");
const interval2 = new TimeInterval("10:00", "12:00");

// 2. Creează entries
const entry1 = new TimetableEntries({
    id: 1,
    day: "Luni",
    interval: interval1,
    frequency: "sapt. 1",
    room: "C309",
    format: "832",
    type: "Curs",
    subject: "POO",
    teacher: "Prof. Popescu Ion"
});

const entry2 = new TimetableEntries({
    id: 2,
    day: "Luni",
    interval: interval2,
    frequency: "sapt. 2",
    room: "C310",
    format: "832",
    type: "Seminar",
    subject: "Baze de Date",
    teacher: "Prof. Ionescu Maria"
});

// 3. Creează orarul studentului
const studentTimetable = new StudentTimetable({
    academicYear: "2024-2025",
    semester: "1",
    specialization: "Informatică",
    yearOfStudy: "3",
    groupName: "832",
    entries: [entry1, entry2]
});

// 4. Operații pe entries (direct pe array)
studentTimetable.entries.push(entry3);  // Adaugă
const pooEntries = studentTimetable.entries.filter(e => e.subject === "POO");  // Filtrează
studentTimetable.entries = studentTimetable.entries.filter(e => e.id !== 2);  // Șterge

// 5. (Opțional) Creează un Optional_subject pentru gruparea orelor
const pooSubject = new Optional_subject({
    name: "POO",
    code: "POO101",
    timetableEntries: pooEntries  // folosește entries filtrate de mai sus
});
```

### Scenario 2: Parsing din API și crearea entităților

```typescript
// Date primite de la API (de obicei JSON)
const apiData = {
    academicYear: "2024-2025",
    semester: "1",
    entries: [
        {
            id: 1,
            day: "Luni",
            interval: "08:00 - 10:00",  // string din API
            subject: "POO",
            teacher: "Prof. Popescu Ion",
            frequency: "sapt. 1",
            room: "C309",
            format: "832",
            type: "Curs"
        }
    ]
};

// Transformă în entități
const entries = apiData.entries.map(e => new TimetableEntries({
    ...e,
    interval: TimeInterval.fromString(e.interval)  // convert string -> TimeInterval
}));

const timetable = new StudentTimetable({
    ...apiData,
    entries: entries
});
```

---

## 🚀 Best Practices

### ✅ DO:
- Validează datele în constructor (toate clasele au validări built-in)
- Folosește metode helper precum `fromString()` pentru parsing
- Manipulează direct array-ul `entries` pentru operații simple (push, filter, map)
- Folosește `Optional_subject` pentru a grupa entries pe materii
- Păstrează `subject` ca string simplu pentru afișare rapidă

### ❌ DON'T:
- Nu duplica obiectele complexe în fiecare entry
- Nu ignora validările din constructor (vor arunca erori)
- Nu confunda `TimetableEntry` (din types.ts) cu `TimetableEntries` (din entities/)
- Nu complica structura - țin-o simplă și directă

---

## 🔮 Viitor și extensibilitate

Această structură permite ușor:
- ✅ Adăugarea de noi tipuri de timetable (ex: `RoomTimetable`, `AdminTimetable`)
- ✅ Adăugarea de noi validări în constructori
- ✅ Integrarea cu baze de date (entries poate fi salvat direct)
- ✅ Serializare/Deserializare JSON (structură plată, simplă)
- ✅ Mapare către/de la structuri Dart (compatibilitate înaltă)
- ✅ Adăugarea de metode helper în clasele de bază

---

## 📞 Întrebări frecvente

**Q: De ce `subject` este doar string, nu un obiect complet?**
A: Pentru simplitate și performance. Numele materiei este suficient pentru afișare, iar dacă ai nevoie de mai multe detalii (cod, alte entries), le poți grupa într-un `Optional_subject`.

**Q: Pot modifica direct `timetable.entries`?**
A: Da! Clasa `Timetable` este simplă și permite manipulare directă a array-ului: `timetable.entries.push()`, `.filter()`, `.map()`, etc.

**Q: Care e diferența între `TimetableEntry` (din types.ts) și `TimetableEntries` (din entities/)?**
A: `TimetableEntry` din `types.ts` este un **interface** TypeScript, iar `TimetableEntries` din `entities/` este o **clasă** cu validări și logică. `Optional_subject.timetableEntries` folosește interface-ul, nu clasa.

**Q: De ce nu folosim enum-uri în TypeScript ca în Dart?**
A: Pentru simplitate și flexibilitate. Validările din constructor verifică valorile și aruncă warning-uri dacă sunt invalide, fără rigiditatea enum-urilor.

**Q: Cum grupez toate orele unei materii?**
A: Filtrează entries după `subject` și creează un `Optional_subject`:
```typescript
const pooEntries = timetable.entries.filter(e => e.subject === "POO");
const pooSubject = new Optional_subject({
    name: "POO",
    code: "POO101", 
    timetableEntries: pooEntries
});
```

**Q: De ce `Optional_subject` nu are `id`?**
A: În backend, identificarea se face prin `name` și `code`. În Dart există `id` pentru compatibilitate cu baza de date, dar în TypeScript nu e necesar.

---

**Ultima actualizare:** 30 ianuarie 2025  
**Versiune:** 2.0  
**Autor:** sudo win -f
