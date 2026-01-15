```md
# Smart Schedule – Documentație Backend (Node.js + TypeScript REST API)

---

## 1. Descrierea Proiectului

### 1.1 Scopul Serviciului
Backend-ul **Smart Schedule** expune un **REST API** consumat de aplicația Flutter (Web + PWA). Rolul lui este:
- să furnizeze date normalizate despre orare (studenți și cadre didactice);
- să susțină funcționalități de tip „servicii” (parsing HTML UBB, cache, job-uri, notificări);
- să ofere mecanisme pentru **calendar subscription** (generare feed iCalendar/ICS pe baza unui token);
- să permită stocarea/gestionarea unui orar asociat utilizatorilor (în practică prin token/uuid, în funcție de flux).

### 1.2 Context de Utilizare
Backend-ul este proiectat pentru publicare pe o platformă de tip PaaS (ex. Railway) și deservește:
- **Web browser**: consum read-only (vizualizare / listare).
- **PWA mobil**: consum read-write acolo unde există funcții de personalizare, export calendar, notificări, sincronizare.

### 1.3 Problema Rezolvată
- Uniformizarea datelor din paginile UBB (HTML) într-un format JSON stabil (consumabil din Flutter).
- Acces rapid la liste (specializări/domenii, materii, profesori) și timetables.
- Persistență locală + posibilă persistență în DB pentru utilizatori (timetables și token-uri).
- Generare de evenimente calendar (ICS) pentru integrare cu Apple/Google Calendar.

### 1.4 Obiective Principale
1. API stabil pentru consum din Flutter.
2. Separare clară între:
   - parsare + normalizare (parsers),
   - stocare/cache,
   - generare calendar,
   - job-uri și notificări.
3. Performanță prin cache (fișiere JSON) și/sau DB.
4. Fluxuri robuste: validare input, timeouts, erori coerente.
5. Structură clară a proiectului (TypeScript + tooling: ESLint, Jest).

---

## 2. Cerințe Funcționale și Non-funcționale

### 2.1 Cerințe Funcționale (Backend)

#### Use-Case (Backend)
```

┌────────────────────────────────────────────────────────────────────┐
│                         SMART SCHEDULE API                         │
│                                                                    │
│  ┌──────────────┐                         ┌─────────────────────┐  │
│  │  Flutter App │                         │  Background Jobs    │  │
│  │ (Web + PWA)  │                         │  + Notifications    │  │
│  └──────┬───────┘                         └─────────┬───────────┘  │
│         │                                           │              │
│         │  GET: lists/timetables/parsers output     │              │
│         │  POST: user-timetable + calendar tokens   │              │
│         │  GET: calendar feed (.ics)                ---            │
│         │                                             │            │
│         └─────────────────────────────────────────────┼────────────┘
│                                                       │            |
│                                      Compare / notify / refresh cache
└────────────────────────────────────────────────────────────────────┘

```

#### Lista Cerințelor Funcționale
| ID | Cerință | Descriere | Consumator |
|----|---------|-----------|------------|
| F1 | Parsare orar student | Parsare pagini UBB pentru orar pe grupă/ani | Backend intern |
| F2 | Parsare orar profesor | Parsare și normalizare pentru cadre didactice | Backend intern |
| F3 | Parsare liste | Liste de specializări/materii/profesori din pagini UBB | Flutter |
| F4 | Cache date | Cache în fișiere JSON pentru liste și date derivate | Flutter/Backend |
| F5 | Calendar subscription | Generare URL/token și feed ICS | Flutter/PWA |
| F6 | Persistență user timetable | Stocare orar/evenimente per user (DB și/sau fișiere) | PWA |
| F7 | Job de comparație | Detectare diferențe între versiuni de orar și trigger notificări | Backend intern |
| F8 | Notificări push | Gestionare notificări (ex. web-push) | PWA |

### 2.2 Scenarii de Utilizare

#### Scenariul 1: Parsare + afișare orar student
1. Clientul consumă o listă/cached dataset (fields/specializations).
2. Alege domeniu/an/grupă.
3. Backend servește datele normalizate (din cache sau compute + cache).

#### Scenariul 2: Parsare + afișare orar profesor
1. Clientul consumă lista de profesori.
2. Selectează un profesor.
3. Backend returnează intrări normalizate (teacher timetable).

#### Scenariul 3: Calendar subscription (ICS)
1. Clientul solicită un token pentru user.
2. Clientul se abonează cu URL-ul `.ics` în aplicația de calendar.
3. Backend generează dinamic feed-ul pentru acel token (eventual din DB/cache).

#### Scenariul 4: Detectare schimbări și notificări
1. Job-ul rulează periodic sau manual.
2. Compară orarele curente vs. cache/ultima versiune.
3. Dacă apar diferențe, trimite notificări către userii interesați.

### 2.3 Cerințe Non-funcționale
| ID | Cerință | Descriere | Metrică |
|----|---------|-----------|---------|
| NF1 | Performanță | Liste/timetables din cache să fie rapide | < 500–800 ms tipic |
| NF2 | Stabilitate API | Răspuns JSON predictibil | compatibilitate în timp |
| NF3 | Robusteză parsare | Timeouts + validateStatus + fallback | fără crash la input invalid |
| NF4 | Securitate | Token-uri pentru calendar; fără PII | acces controlat prin token |
| NF5 | Observabilitate | log + status codes | erori coerente |
| NF6 | Portabilitate | configurare prin env | Railway vars / .env |

---

## 3. Tehnologii Utilizate

### 3.1 Stack Backend
| Tehnologie | Versiune/Observație | Scop |
|-----------|----------------------|------|
| Node.js | `engines: >= 20.0.0` | runtime |
| TypeScript | ^5.3.x | tipare statică + build |
| Express | ^5.1.0 | server HTTP + routing |
| Axios | ^1.6.x | HTTP fetch pentru paginile UBB |
| Cheerio | ^1.0.0-rc.12 | parsare HTML (jQuery-like) |
| MongoDB Driver | ^7.x | persistenta user timetable, token-uri |
| node-cron | ^4.2.1 | job-uri programate |
| socket.io | ^4.8.1 | comunicare realtime (dacă e folosită de server) |
| web-push | ^3.6.7 | notificări push |
| ical-generator | ^10.0.0 | generare iCalendar/ICS |
| Jest + ts-jest | ^29.x | testare TypeScript |
| ESLint + typescript-eslint | ^9.x / ^8.x | lint + standardizare cod |

### 3.2 Hosting & Operare
| Componentă | Scop |
|-----------|------|
| Railway | deploy și runtime |
| REST + JSON | contract client-server |
| Fișiere JSON în `src/cache/` | cache persistent local în proiect |

---

## 4. Arhitectura Serviciului

### 4.1 Diagrama Arhitecturii (pe module reale din proiect)
```

┌──────────────────────────────────────────────────────────────────┐
│                           ENTRY POINT                            │
│  server.ts  (Express app + routes + bootstrap)                   │
└──────────────────────────────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────┐
│                           DOMAIN MODULES                         │
│  src/parsers/                 src/calendar-subscription/         │
│  - timetable-parser           - token manager                    │
│  - teacher-list-parser        - ics generator                    │
│  - subject-list-parser        - timetable->events converter      │
│  - specialization-parser      - academic calendar scraper        │
│                               - user timetable manager           │
└──────────────────────────────────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────┐
│                         SUPPORT MODULES                          │
│  src/cache/                  src/database/                       │
│  - cache-manager             - mongodb connection                │
│  - json cache files          - user-timetable-db                 │
│  src/jobs/                   src/notifications/                  │
│  - timetable-comparison-job  - push notification manager         │
│                              - notification manager/types        │
└──────────────────────────────────────────────────────────────────┘

````

### 4.2 Principii de Design în cod (deduse din fișiere)
- Parsers izolați (axios + cheerio) cu:
  - `timeout`, `maxRedirects`, `validateStatus`,
  - `transformResponse: (d) => d` pentru a păstra textul.
- Cache de tip fișier JSON (rapid, simplu, util pe PaaS).
- Calendar subscription bazat pe token-uri și generare ICS.
- Teste unitare pentru parsers (mock axios, feed HTML sample).

---

## 5. Modulele Principale

### 5.1 `src/parsers/`
Responsabil pentru extragerea datelor din paginile UBB:
- `timetable-parser.ts`  
  - parsează tabele de orar, suportă mai multe tabele/grupe pe pagină;
  - extrage metadata din URL (`academicYear`, `semester`, `specialization`, `yearOfStudy`);
  - normalizează headere românești prin `HEADER_MAP`.
- `teacher-list-parser.ts`  
  - parsează lista de cadre didactice (titlu + nume + link).
- `subject-list-parser.ts`  
  - parsează lista de discipline (cod + nume + link).
- `specialization-parser.ts`  
  - parsează specializări (Licență/Master) și link-uri pentru ani;
  - filtrează specializarea „Psihologie” (skip).
- `subject-timetable-parser.ts`  
  - parsează orarul unei discipline (pagină dedicată unei materii).

### 5.2 `src/cache/`
- `cache-manager.ts`: strat pentru citire/scriere cache.
- fișiere `.json`:
  - `fields.json`, `subjects.json`, `metadata.json`, `calendar-tokens.json`
  - `user-timetables/` pentru salvări pe user (în special pentru testare/demos).

### 5.3 `src/calendar-subscription/`
Modul pentru calendar (export ICS):
- `calendar-token-manager.ts`: generează/gestionează token-uri.
- `user-ics-generator.ts` + `icalendar-generator.ts`: construiesc feed iCalendar.
- `timetable-to-events-converter.ts`: convertește intrări de orar în evenimente recurente.
- `academic-calendar-scraper.ts`: obține calendar academic / date semestru (dacă este folosit).
- `room-location-service.ts` + `room-locations.json`: normalizare locații.

### 5.4 `src/database/`
- `mongodb.ts`: conexiune MongoDB.
- `user-timetable-db.ts`: operații DB pentru orarele userilor.
- `index.ts`: re-export / bootstrap DB.

### 5.5 `src/jobs/`
- `timetable-comparison-job.ts`: job pentru comparație  (detectare schimbări).
- `index.ts`: intrare/registrare job-uri.

### 5.6 `src/notifications/`
- `push-notification-manager.ts`: trimitere notificări (web-push).
- `notification-manager.ts`: orchestrare notificări.
- `notification-types.ts`: tipuri/contracte.
- `index.ts`: exports.

### 5.7 `src/entities/`
Modele/entități de domeniu (structuri interne):
- `field.ts`, `student_timetable.ts`, `teacher_timetable.ts`, `timetable.ts`,
- `timetable_entries.ts`, `time_interval.ts`, `optional_subject.ts`,
- `field_year_timetable.ts`.

---

## 6. API Reference (Contract orientativ)

> Notă: în fișierele trimise nu apare lista completă de rute Express din `server.ts`, dar backend-ul este descris ca REST API pentru Flutter. Mai jos este contractul recomandat/coerent cu modulele existente. Ajustează numele exacte ale rutelor dacă în `server.ts` sunt diferite.

### 6.1 Convenții
- Content-Type: `application/json`
- Erori: recomandat un format standard
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "field/year invalid",
    "details": { "field": "..." }
  }
}
````

### 6.2 Endpoint-uri

#### GET `/teachers`

Returnează lista de profesori (din cache sau parsare).

* 200 OK

```json
{
  "teachers": [
    { "fullName": "Prof. POPESCU Ion", "name": "POPESCU Ion", "title": "Prof.", "href": "..." }
  ],
  "totalCount": 1
}
```

#### GET `/teacher/:name/timetable`

Returnează orarul profesorului (normalizat).

* 200 OK

```json
{
  "teacher": "POPESCU Ion",
  "entries": [
    { "day": "Luni", "hours": "08:00-10:00", "frequency": "sapt. 1-14", "room": "C309", "group": "914/1", "type": "Curs", "subject": "Algoritmi", "teacher": "Prof. POPESCU Ion" }
  ]
}
```

* 400 Bad Request (nume invalid)
* 404 Not Found (fără date)
* 500 Internal Server Error

#### GET `/fields`

Returnează lista de domenii/specializări (cache).

* 200 OK

```json
{
  "fields": [
    { "name": "Informatica - linia de studiu romana", "level": "Licenta", "years": [{ "year": 1, "href": "I1.html", "displayText": "Anul 1" }] }
  ],
  "totalCount": 1
}
```

#### GET `/subjects`

Returnează lista de discipline (cache).

* 200 OK

```json
{
  "courses": [{ "code": "MME8120", "name": "Adaptive Web Design", "href": "adaptive-web-design.html" }],
  "totalCount": 1
}
```

#### GET `/timetable`

Exemplu: timetables pe grupă/an (poate fi implementat ca `/timetables/:field/:year` sau prin link direct UBB).

* 200 OK

```json
{
  "academicYear": "2024",
  "semester": "1",
  "specialization": "INFO",
  "yearOfStudy": "3",
  "entries": [
    { "day": "Luni", "hours": "08:00-10:00", "frequency": "sapt. 1-14", "room": "309", "group": "211/1", "type": "Curs", "subject": "Algoritmi Paraleli", "teacher": "Prof. Dr. Popescu Ion" }
  ]
}
```

#### POST `/calendar/generate-token`

Generează token calendar pentru user.

* 200 OK

```json
{
  "data": {
    "token": "abc123",
    "subscriptionUrl": "https://.../calendar/abc123.ics"
  }
}
```

#### GET `/calendar/:token.ics`

Returnează feed iCalendar (text/calendar).

* 200 OK
* Content-Type: `text/calendar`

#### POST `/timetable/user`

Salvează orarul unui user (folosit în `test-calendar-api.js`).

* 200 OK

```json
{ "ok": true }
```

#### GET `/timetable/user?userId=...`

Returnează orarul userului.

* 200 OK

#### POST `/timetable/event`

Adaugă eveniment custom pentru user.

* 200 OK

#### GET `/timetable/events/default-dates`

Returnează date semestru default (din `academic-calendar-scraper.ts` sau constant).

* 200 OK

#### GET `/icalendar/generate?userId=...`

Returnează ICS generat (și opțional `format=json` pentru debug).

* 200 OK

---

## 7. Modele de Date (din `src/types.ts` + entități)

### 7.1 TimetableEntry (`src/types.ts`)

```ts
export interface TimetableEntry {
  day: string;
  hours: string;
  frequency: string;
  room: string;
  group: string;
  type: string;
  subject: string;
  teacher: string;
}
```

### 7.2 Timetable (`src/types.ts`)

```ts
export interface Timetable {
  academicYear: string;
  semester: string;
  specialization: string;
  yearOfStudy: string;
  entries: TimetableEntry[];
}
```

### 7.3 Modele calendar (din test-calendar-api.js)

Evenimentele sunt modelate cu:

* `startTime`, `endTime`, `location`, `description`, `isRecurring`
* `recurrenceRule` (weekly/oddweeks/evenweeks)
* `type` (lecture/lab/custom)

Acestea sunt convertite în ICS prin `timetable-to-events-converter.ts` + `icalendar-generator.ts`.

---

## 8. Testare și Calitate

### 8.1 Jest + ts-jest

* Testele sunt în `backend/tests/*.test.ts`.
* `axios` este mock-uit pentru parsers.
* `tests/jest.setup.ts` conține polyfill pentru `globalThis.File` (necesar deoarece unele dependențe (ex. undici/cheerio) pot aștepta `File` disponibil în runtime).

Conținut minim necesar în `tests/jest.setup.ts`:

```ts
if (typeof (globalThis as any).File === "undefined") {
  (globalThis as any).File = class File {};
}
```

### 8.2 Config Jest (recomandat în proiectul tău)

Folosește varianta care ți-a mers (cu setupFiles și tsconfig.test.json):

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/jest.setup.ts'],
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  verbose: true,
};
```

### 8.3 TypeScript configs

* `tsconfig.json` exclude testele: `exclude: ["**/*.test.ts", "tests", ...]`
* `tsconfig.test.json` include testele și relaxează `noImplicitAny` pentru test code.

---

## 9. CI (GitHub Actions)

Backend-ul folosește pipeline pe Node în matrice de versiuni (18/20/22) și rulează:

* `npm ci --ignore-scripts`
* `npm run typecheck`
* `npm run lint`
* `npm test || true`
* `npm run build`

Observație practică:

* dacă `postinstall` rulează `npm run build`, atunci `--ignore-scripts` previne build-ul automat la install; build-ul se face explicit la final.

---

## 10. Structura Proiectului (reală)

```
backend
├── eslint.config.mjs
├── jest.config.js
├── package.json
├── package-lock.json
├── server.ts
├── src
│   ├── cache
│   │   ├── cache-manager.ts
│   │   ├── fields.json
│   │   ├── subjects.json
│   │   ├── metadata.json
│   │   ├── calendar-tokens.json
│   │   └── user-timetables/...
│   ├── calendar-subscription
│   │   ├── academic-calendar-scraper.ts
│   │   ├── calendar-token-manager.ts
│   │   ├── icalendar-generator.ts
│   │   ├── room-location-service.ts
│   │   ├── room-locations.json
│   │   ├── timetable-to-events-converter.ts
│   │   ├── user-ics-generator.ts
│   │   └── user-timetable-manager.ts
│   ├── database
│   │   ├── mongodb.ts
│   │   ├── user-timetable-db.ts
│   │   └── index.ts
│   ├── entities
│   │   ├── field.ts
│   │   ├── field_year_timetable.ts
│   │   ├── optional_subject.ts
│   │   ├── student_timetable.ts
│   │   ├── teacher_timetable.ts
│   │   ├── time_interval.ts
│   │   ├── timetable.ts
│   │   └── timetable_entries.ts
│   ├── jobs
│   │   ├── timetable-comparison-job.ts
│   │   └── index.ts
│   ├── notifications
│   │   ├── notification-manager.ts
│   │   ├── notification-types.ts
│   │   ├── push-notification-manager.ts
│   │   └── index.ts
│   ├── parsers
│   │   ├── timetable-parser.ts
│   │   ├── teacher-list-parser.ts
│   │   ├── subject-list-parser.ts
│   │   ├── specialization-parser.ts
│   │   ├── subject-timetable-parser.ts
│   │   └── index.ts
│   ├── index.ts
│   └── types.ts
├── scripts
│   └── test-frequency-transform.ts
├── tests
│   ├── jest.setup.ts
│   ├── timetable-parser.test.ts
│   ├── teacher-list-parser.test.ts
│   ├── subject-list-parser.test.ts
│   └── specialization-parser.test.ts
├── test-calendar-api.js
└── tsconfig.test.json
```

---

## 11. Comenzi Terminal (rulare eficientă)

### 11.1 Precondiții

Node conform `package.json`:

* Node `>= 20.0.0` (recomandat 20/22)

Verificare:

```bash
node -v
npm -v
```

Dacă folosești nvm:

```bash
nvm install 22
nvm use 22
```

### 11.2 Instalare dependințe (recomandat cu lockfile)

```bash
cd backend
npm ci
```

### 11.3 Build

```bash
npm run build
```

### 11.4 Rulare în development

```bash
npm run dev
```

### 11.5 Rulare în production (local)

```bash
npm run build
npm start
```

### 11.6 Typecheck / Lint / Tests

```bash
npm run typecheck
npm run lint
npm test
```

Coverage:

```bash
npm run test:coverage
```

Watch:

```bash
npm run test:watch
```

### 11.7 Script util pentru frecvență (din proiect)

```bash
npm run freq:test
```

### 11.8 Testare manuală API (calendar flow)

Pornește serverul, apoi rulează:

```bash
node test-calendar-api.js
```

### 11.9 Reset complet (când apar probleme de install)

```bash
rm -rf node_modules package-lock.json
npm install
```