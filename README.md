# Smart Schedule UBB

## Prezentare Generală

**Smart Schedule UBB** este o aplicație Progressive Web App (PWA) dezvoltată pentru gestionarea și vizualizarea orarelor universitare la Universitatea Babeș-Bolyai. Aplicația deservește două categorii principale de utilizatori: **studenți** și **cadre didactice**.

### Problema Rezolvată

Înainte de Smart Schedule, utilizatorii se confruntau cu următoarele probleme:
- Accesul dificil la orare actualizate
- Lipsa posibilității de personalizare a orarului
- Imposibilitatea de a vizualiza orarul într-un format prietenos pe mobil
- Necesitatea de a naviga prin multiple surse pentru a găsi informații despre cursuri
- Integrare dificilă cu aplicațiile de calendar (Google Calendar, Apple Calendar)

### Soluția Oferită

Aplicația răspunde nevoii studenților și profesorilor de a accesa rapid și eficient orarul academic, fie de pe dispozitive mobile, fie de pe desktop. Prin natura sa de PWA, aplicația poate fi instalată pe dispozitivele mobile și funcționează similar unei aplicații native, oferind acces offline și notificări.

### Caracteristici Principale

1. **Accesibilitate** - Interfață responsive pentru toate dispozitivele (mobile, tablet, desktop)
2. **Personalizare** - Posibilitatea studenților de a-și personaliza orarul cu cursuri opționale
3. **Persistență** - Salvarea preferințelor utilizatorului local și sincronizare cu backend-ul
4. **Experiență nativă** - Funcționare ca aplicație nativă pe mobile prin instalare PWA
5. **Dual-mode** - Suport pentru vizualizare (web) și editare (PWA mobil instalat)
6. **Calendar Subscription** - Export în format iCalendar (.ics) pentru integrare cu aplicații de calendar
7. **Notificări** - Alertă automată în caz de modificări ale orarului

---

## Arhitectură

Aplicația este compusă din două componente principale:

### Frontend - PWA (Flutter)

Aplicația client este dezvoltată în Flutter și funcționează ca PWA, oferind:
- Interfață utilizator în stil iOS (Cupertino widgets)
- Mod de vizualizare (web browser) - read-only
- Mod de editare (PWA instalat pe mobil) - full features
- Persistență locală folosind SharedPreferences
- Identificare anonimă prin UUID v4

### Backend - REST API (Node.js + TypeScript)

Backend-ul expune un REST API consumat de aplicația Flutter și are următoarele responsabilități:
- Parsare și normalizare date din paginile web UBB (HTML → JSON)
- Furnizare date despre orare (studenți și cadre didactice)
- Cache-uire date pentru performanță
- Generare feed-uri iCalendar (.ics) bazate pe token-uri unice
- Stocare și sincronizare orare personalizate
- Detectare modificări orare și trimitere notificări push
- Rulare job-uri programate (cron)

Backend-ul este deployment pe Railway (PaaS) și deservește:
- **Web browser**: consum read-only (vizualizare / listare)
- **PWA mobil**: consum read-write (personalizare, export, notificări, sincronizare)

---

## Diagrame Arhitecturale

### Arhitectura de Ansamblu

```
┌─────────────────────────────────────────────────────────────────┐
│                        UTILIZATORI                              │
│                                                                 │
│   ┌─────────────────┐              ┌─────────────────┐         │
│   │   Web Browser   │              │  PWA (Mobil)    │         │
│   │   (Read-Only)   │              │ (Full Features) │         │
│   └────────┬────────┘              └────────┬────────┘         │
│            │                                │                   │
└────────────┼────────────────────────────────┼───────────────────┘
             │                                │
             └────────────┬───────────────────┘
                          │ HTTPS/REST API
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Railway)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  REST API (Express + TypeScript)                         │   │
│  │  • /teachers - Lista profesori                           │   │
│  │  • /fields - Lista domenii                               │   │
│  │  • /timetables - Orare                                   │   │
│  │  • /calendar - ICS Generation                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                      │
│         ┌────────────────┼────────────────┐                    │
│         ▼                ▼                ▼                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐            │
│  │  Parsers │    │  Cache   │    │   Database   │            │
│  │  (HTML→  │    │  (JSON)  │    │  (MongoDB)   │            │
│  │   JSON)  │    │          │    │              │            │
│  └──────────┘    └──────────┘    └──────────────┘            │
│         │                                │                     │
│         ▼                                ▼                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Jobs & Notifications                                    │  │
│  │  • Cron jobs (detectare modificări)                      │  │
│  │  • Web Push (notificări)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SURSE EXTERNE                                  │
│  • cs.ubbcluj.ro/orar (HTML pages - Web scraping)              │
│  • www.ubbcluj.ro (Academic calendar)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Arhitectura Backend

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
```

### Arhitectura Frontend

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SMART SCHEDULE PWA                             │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                         PRESENTATION LAYER                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │    │
│  │  │    Screens   │  │   Widgets    │  │  TabScaffold │            │    │
│  │  │              │  │              │  │              │            │    │
│  │  │ • RoleSelect │  │ • RoleCard   │  │ • Browse Tab │            │    │
│  │  │ • FieldSelect│  │ • InfoPill   │  │ • MyTimetable│            │    │
│  │  │ • GroupsList │  │ • EntryCard  │  │     Tab      │            │    │
│  │  │ • Student TT │  │ • DaySection │  │              │            │    │
│  │  │ • Teacher TT │  │              │  │              │            │    │
│  │  │ • MyTimetable│  │              │  │              │            │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                      │                                     │
│                                      ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                           STATE MANAGEMENT                         │    │
│  │                                                                    │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │                         AppScope                            │  │    │
│  │  │                  (InheritedNotifier)                        │  │    │
│  │  │                           │                                 │  │    │
│  │  │           ┌───────────────┴───────────────┐                │  │    │
│  │  │           ▼                               ▼                │  │    │
│  │  │  ┌─────────────────┐            ┌─────────────────┐       │  │    │
│  │  │  │ MobileProvider  │            │ WebProvider     │       │  │    │
│  │  │  │ (Full Features) │            │ (Read-Only)     │       │  │    │
│  │  │  │                 │            │                 │       │  │    │
│  │  │  │ • Personalize   │            │ • View Only     │       │  │    │
│  │  │  │ • Persistence   │            │ • No Edit       │       │  │    │
│  │  │  │ • Backend Sync  │            │                 │       │  │    │
│  │  │  └─────────────────┘            └─────────────────┘       │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                      │                                     │
│                                      ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                            DATA LAYER                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │    │
│  │  │  API Handler │  │    Models    │  │      Services            │ │    │
│  │  │              │  │              │  │                          │ │    │
│  │  │ • Teachers   │  │ • TimeTable  │  │ • PlatformService        │ │    │
│  │  │ • Fields     │  │ • Entry      │  │ • PwaIdentityService     │ │    │
│  │  │ • Timetables │  │ • Subject    │  │ • TimetableExporter      │ │    │
│  │  │ • Sync       │  │ • Field      │  │                          │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                      │                                     │
│                                      ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                          EXTERNAL SERVICES                         │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │                    Railway Backend API                       │ │    │
│  │  │        https://smart-schedule-ubb-production.up.railway.app │ │    │
│  │  │                                                              │ │    │
│  │  │  Endpoints:                                                  │ │    │
│  │  │  • GET  /teachers          - Lista profesori                │ │    │
│  │  │  • GET  /teacher/:name/timetable - Orar profesor            │ │    │
│  │  │  • GET  /fields            - Lista domenii                  │ │    │
│  │  │  • GET  /timetables/:field/:year - Orare pe domeniu/an     │ │    │
│  │  │  • POST /user-timetable    - Sincronizare orar personalizat│ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Cerințe Funcționale și Non-funcționale

### Cerințe Funcționale - Backend

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

### Cerințe Funcționale - Frontend

| ID | Cerință | Descriere | Actor |
|----|---------|-----------|-------|
| F1 | Selectare rol | Utilizatorul poate alege între rolul de student sau profesor | Toți |
| F2 | Vizualizare orare profesori | Căutare și vizualizare orar pentru orice profesor | Toți |
| F3 | Selectare domeniu studii | Studenții selectează domeniul și anul de studiu | Student |
| F4 | Selectare grupă | Studenții selectează grupa pentru vizualizarea orarului specific | Student |
| F5 | Vizualizare orar student | Afișare orar pe zile, ore, materii | Student |
| F6 | Personalizare orar | Adăugare/ștergere cursuri din orarul personal (doar PWA mobil) | Student PWA |
| F7 | Adăugare materii opționale | Adăugare de cursuri opționale în orar | Student PWA |
| F8 | Import orar profesor | Import complet al orarului unui profesor | Student PWA |
| F9 | Export orar | Export în format Markdown sau imagine | Toți |
| F10 | Persistență locală | Salvare automată a orarului personalizat | Student PWA |
| F11 | Sincronizare backend | Sincronizare cu serverul pentru backup | Student PWA |

### Cerințe Non-funcționale - Backend

| ID | Cerință | Descriere | Metrică |
|----|---------|-----------|---------|
| NF1 | Performanță | Liste/timetables din cache să fie rapide | < 500–800 ms tipic |
| NF2 | Stabilitate API | Răspuns JSON predictibil | compatibilitate în timp |
| NF3 | Robusteză parsare | Timeouts + validateStatus + fallback | fără crash la input invalid |
| NF4 | Securitate | Token-uri pentru calendar; fără PII | acces controlat prin token |
| NF5 | Observabilitate | log + status codes | erori coerente |
| NF6 | Portabilitate | configurare prin env | Railway vars / .env |

### Cerințe Non-funcționale - Frontend

| ID | Cerință | Descriere | Metrică |
|----|---------|-----------|---------|
| NF1 | Performanță | Încărcare rapidă a aplicației | < 3 secunde |
| NF2 | Responsive Design | Funcționare pe toate dimensiunile ecran | Mobile, Tablet, Desktop |
| NF3 | Offline Support | Funcționare fără conexiune (pentru orarul salvat) | PWA cache |
| NF4 | Instalabilitate | Posibilitate de instalare pe mobil | PWA manifest |
| NF5 | Cross-platform | Compatibilitate iOS și Android | Safari, Chrome |
| NF6 | Securitate | Identificare anonimă prin UUID | UUID v4 |
| NF7 | Scalabilitate | Suport pentru multiple domenii și ani | Nelimitat |
| NF8 | Usability | Interfață intuitivă în stil iOS (Cupertino) | UX consistent |

---


## Tehnologii Utilizate

### Stack Backend

| Tehnologie | Versiune/Observație | Scop |
|-----------|----------------------|------|
| Node.js | engines: >= 20.0.0 | runtime |
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

### Stack Frontend

| Tehnologie | Versiune | Scop |
|------------|----------|------|
| Flutter | 3.x | Framework principal pentru dezvoltare cross-platform |
| Dart | 3.x | Limbaj de programare |
| Cupertino Widgets | - | Design iOS-native pentru UI |
| shared_preferences | - | Persistență locală (LocalStorage) |
| http | - | Comunicare HTTP cu backend-ul |
| overlay_support | - | Toast notifications |
| uuid | - | Generare identificatori unici |
| url_launcher | - | Lansare URL-uri externe |

### Hosting & Operare

| Componentă | Scop |
|-----------|------|
| Railway | deploy și runtime |
| REST + JSON | contract client-server |
| Fișiere JSON în `src/cache/` | cache persistent local în proiect |

---

## Actualizare Link-uri pentru Semestru/An Nou

### IMPORTANT - Actualizare Obligatorie

La fiecare început de semestru sau an universitar, este **obligatorie actualizarea link-urilor** de parsare pentru a reflecta semestrul curent.

### Link-uri care trebuie modificate:

#### 1. Cache Manager - `backend/src/cache/cache-manager.ts`

**Locație: Liniile 11-13**

```typescript
const UBB_BASE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar';
const UBB_INDEX_URL = `${UBB_BASE_URL}/index.html`;
const UBB_SUBJECTS_LIST_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/disc/index.html';
```

**Locație: Linia 152**

```typescript
const UBB_DISC_BASE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/disc';
```

**Ce trebuie schimbat:**
- `2025-1` → `{AN}-{SEMESTRU}`
  - `1` = semestrul I (toamnă/iarnă)
  - `2` = semestrul II (primăvară/vară)

**Exemplu pentru semestrul II al anului 2025-2026:**
```typescript
const UBB_BASE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-2/tabelar';
const UBB_INDEX_URL = `${UBB_BASE_URL}/index.html`;
const UBB_SUBJECTS_LIST_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-2/disc/index.html';
const UBB_DISC_BASE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-2/disc';
```

**Exemplu pentru semestrul I al anului 2026-2027:**
```typescript
const UBB_BASE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2026-1/tabelar';
const UBB_INDEX_URL = `${UBB_BASE_URL}/index.html`;
const UBB_SUBJECTS_LIST_URL = 'https://www.cs.ubbcluj.ro/files/orar/2026-1/disc/index.html';
const UBB_DISC_BASE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2026-1/disc';
```

#### 2. Academic Calendar Scraper - `backend/src/calendar-subscription/academic-calendar-scraper.ts`

**Locație: Linia 245** (parametru default al funcției `scrapeAcademicCalendar`)

```typescript
export async function scrapeAcademicCalendar(url: string = 'https://www.cs.ubbcluj.ro/invatamant/structura-anului-universitar/'): Promise<AcademicYearStructure[]> {
```

**Ce trebuie verificat:**
- Link-ul structurii anului se poate schimba dacă UBB modifică pagina
- De obicei, link-ul rămâne același, dar se actualizează conținutul HTML
- Verifică că pagina returnează datele pentru anul academic curent

#### 3. Server Endpoints - `backend/server.ts` (OPȚIONAL pentru consistență)

**Locație: Liniile 669, 783-785** - URL-uri de exemplu pentru documentație API

```typescript
// Linia 669 - exemplu în mesaj de eroare
example: '/parse?url=https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html',

// Liniile 783-785 - endpoint /example-urls
examples: {
  'MIE Year 3, Semester 1, 2025': 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html',
  'CTI Year 1, Semester 1, 2025': 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/CTI1.html',
  'INFO Year 4, Semester 2, 2024': 'https://www.cs.ubbcluj.ro/files/orar/2024-2/tabelar/INFO4.html',
}
```

**NOTĂ:** Acestea sunt doar exemple pentru documentație și testare. Nu afectează funcționalitatea aplicației, dar e recomandat să le actualizezi pentru consistență.

#### 4. Fișiere Generate Automat (NU modifica manual)

**NOTĂ IMPORTANTĂ:** Următoarele fișiere conțin URL-uri dar sunt generate automat. NU le modifica manual!

**a) Folderul `backend/dist/` - Cod compilat JavaScript:**
- `backend/dist/src/cache/cache-manager.js` (se regenerează din cache-manager.ts prin `npm run build`)
- `backend/dist/src/calendar-subscription/academic-calendar-scraper.js` (se regenerează din academic-calendar-scraper.ts prin `npm run build`)

**b) Folderul `backend/src/cache/` - Cache JSON generat dinamic:**
- `backend/src/cache/fields.json` - conține URL-uri către orare generate prin parsare (se șterge și regenerează automat)
- `backend/src/cache/subjects.json` - listă materii (se regenerează automat)
- `backend/src/cache/metadata.json` - metadata cache (se regenerează automat)

Aceste fișiere se vor actualiza automat după ce modifici constantele din `cache-manager.ts` și repornești serverul.

### Procedura de Actualizare:

1. **Verifică disponibilitatea link-urilor noi:**
   - Accesează `https://www.cs.ubbcluj.ro/files/orar/{AN}-{SEMESTRU}/tabelar/index.html` în browser
   - Verifică că pagina există și are date
   - Verifică că `https://www.cs.ubbcluj.ro/invatamant/structura-anului-universitar/` are datele pentru noul an academic

2. **Actualizează constantele în `cache-manager.ts`:**
   - Deschide fișierul `backend/src/cache/cache-manager.ts`
   - Modifică `2025-1` cu semestrul curent la **liniile 11-13 și 152**

3. **Șterge cache-ul vechi și rebuild-ul compilat:**
   
   Pe Linux/Mac:
   ```bash
   cd backend
   rm -rf src/cache/*.json
   rm -rf dist/
   npm run build
   ```
   
   Pe Windows PowerShell:
   ```powershell
   cd backend
   Remove-Item src/cache/*.json
   Remove-Item -Recurse -Force dist/
   npm run build
   ```

4. **Repornește serverul pentru a genera cache-ul nou:**
   ```bash
   npm start
   ```

5. **Verifică că datele sunt actualizate:**
   - Accesează `http://localhost:3000/fields`
   - Verifică că datele reflectă semestrul curent
   - Testează un endpoint de timetable pentru a confirma că parsarea funcționează

### Notă:
După actualizare, cache-ul va fi regenerat automat la prima cerere către backend, iar job-urile programate vor detecta și notifica modificările în orare. Rebuild-ul în `dist/` va conține noile URL-uri compilate.

---

## Instalare și Rulare

### Precondiții

Node conform `package.json`:
- Node `>= 20.0.0` (recomandat versiunea 20 sau 22 LTS)

#### Verificare versiune instalată:
```bash
node -v
npm -v
```

#### Instalare Node.js (dacă nu este instalat):

**Opțiunea 1 - Descărcare directă (recomandat pentru Windows):**
- Descarcă de la [nodejs.org](https://nodejs.org/) versiunea LTS (Long Term Support)
- Rulează installer-ul și urmează pașii

**Opțiunea 2 - Chocolatey (Windows package manager):**
```powershell
choco install nodejs-lts
```

**Opțiunea 3 - NVM (pentru Linux/Mac):**
```bash
nvm install 20
nvm use 20
```

### Backend - Instalare și Rulare

#### Instalare și Pornire (Development)

```bash
cd backend
npm install
npm start
```

Serverul va porni pe portul configurat (default: 3000).

#### Rulare în Development Mode (cu auto-reload)

```bash
npm run dev
```

#### Build pentru Production

```bash
npm run build
```

Acest lucru compilează TypeScript în JavaScript în folderul `dist/`.

#### Verificare Cod

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Teste
npm test

# Teste cu coverage
npm run test:coverage

# Teste în watch mode
npm run test:watch
```

#### Script util pentru frecvență

```bash
npm run freq:test
```

#### Testare manuală API (calendar flow)

Pornește serverul, apoi rulează:
```bash
node test-calendar-api.js
```

#### Reset complet (când apar probleme de install)

```bash
rm -rf node_modules package-lock.json
npm install
```

### Frontend - Instalare și Rulare

#### Instalare Dependențe

```bash
cd frontend/smart_schedule
flutter pub get
```

#### Rulare Frontend Web (Development)

```bash
flutter run -d chrome
```

#### Build Frontend Web (Production)

```bash
flutter build web --release
```


#### Comenzi Utile

```bash
# Analiză cod
flutter analyze

# Format cod
flutter format lib/

# Curățare cache build
flutter clean && flutter pub get
```

---

## API Reference

### Convenții
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
```

### Endpoint-uri

#### GET `/teachers`
Returnează lista de profesori (din cache sau parsare).

**200 OK**
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

**200 OK**
```json
{
  "teacher": "POPESCU Ion",
  "entries": [
    { "day": "Luni", "hours": "08:00-10:00", "frequency": "sapt. 1-14", "room": "C309", "group": "914/1", "type": "Curs", "subject": "Algoritmi", "teacher": "Prof. POPESCU Ion" }
  ]
}
```

**400 Bad Request** (nume invalid)  
**404 Not Found** (fără date)  
**500 Internal Server Error**

#### GET `/fields`
Returnează lista de domenii/specializări (cache).

**200 OK**
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

**200 OK**
```json
{
  "courses": [{ "code": "MME8120", "name": "Adaptive Web Design", "href": "adaptive-web-design.html" }],
  "totalCount": 1
}
```

#### GET `/timetable`
Exemplu: timetables pe grupă/an (poate fi implementat ca `/timetables/:field/:year` sau prin link direct UBB).

**200 OK**
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

**200 OK**
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

**200 OK**  
Content-Type: `text/calendar`

#### POST `/timetable/user`
Salvează orarul unui user (folosit în `test-calendar-api.js`).

**200 OK**
```json
{ "ok": true }
```

#### GET `/timetable/user?userId=...`
Returnează orarul userului.

**200 OK**

#### POST `/timetable/event`
Adaugă eveniment custom pentru user.

**200 OK**

#### GET `/timetable/events/default-dates`
Returnează date semestru default (din `academic-calendar-scraper.ts` sau constant).

**200 OK**

#### GET `/icalendar/generate?userId=...`
Returnează ICS generat (și opțional `format=json` pentru debug).

**200 OK**

---

## Modele de Date

### TimetableEntry (Backend - `src/types.ts`)

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

### Timetable (Backend - `src/types.ts`)

```ts
export interface Timetable {
  academicYear: string;
  semester: string;
  specialization: string;
  yearOfStudy: string;
  entries: TimetableEntry[];
}
```

### Modele Frontend

- `TimeTable` - Clasă de bază pentru orare
- `StudentTimeTable` - Extinde TimeTable, conține Field și Year
- `TeacherTimeTable` - Extinde TimeTable, conține TeacherName
- `TimeTableEntry` - Intrare individuală în orar
- `Subject` - Materie cu lista de intrări asociate
- `Field` - Domeniu de studiu

---

## Structura Proiectului

```
smart-schedule-ubb/
├── backend/                          # Node.js + TypeScript REST API
│   ├── src/
│   │   ├── parsers/                  # Web scraping & parsare HTML
│   │   │   ├── timetable-parser.ts
│   │   │   ├── teacher-list-parser.ts
│   │   │   ├── subject-list-parser.ts
│   │   │   └── specialization-parser.ts
│   │   │
│   │   ├── calendar-subscription/    # Generare ICS + token management
│   │   │   ├── calendar-token-manager.ts
│   │   │   ├── icalendar-generator.ts
│   │   │   ├── timetable-to-events-converter.ts
│   │   │   └── user-timetable-manager.ts
│   │   │
│   │   ├── cache/                    # Cache JSON + manager
│   │   │   ├── cache-manager.ts
│   │   │   ├── fields.json
│   │   │   ├── subjects.json
│   │   │   └── calendar-tokens.json
│   │   │
│   │   ├── database/                 # MongoDB integration
│   │   │   ├── mongodb.ts
│   │   │   └── user-timetable-db.ts
│   │   │
│   │   ├── jobs/                     # Cron jobs
│   │   │   └── timetable-comparison-job.ts
│   │   │
│   │   ├── notifications/            # Push notifications
│   │   │   ├── push-notification-manager.ts
│   │   │   └── notification-types.ts
│   │   │
│   │   ├── entities/                 # Domain models
│   │   ├── index.ts
│   │   └── types.ts
│   │
│   ├── tests/                        # Jest tests
│   │   ├── jest.setup.ts
│   │   ├── timetable-parser.test.ts
│   │   └── teacher-list-parser.test.ts
│   │
│   ├── server.ts                     # Express app entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── eslint.config.mjs
│
├── frontend/                         # Flutter PWA
│   └── smart_schedule/
│       ├── lib/
│       │   ├── main.dart             # Entry point
│       │   │
│       │   ├── data/                 # Data Layer
│       │   │   ├── api_handler.dart
│       │   │   ├── base_provider.dart
│       │   │   └── data_provider.dart
│       │   │
│       │   ├── models/               # Domain Models
│       │   │   ├── field.dart
│       │   │   ├── timetable.dart
│       │   │   └── timetables.dart
│       │   │
│       │   ├── presentation/         # UI Layer
│       │   │   ├── app_scope.dart
│       │   │   ├── custom_tab_scaffold.dart
│       │   │   ├── role_selection.dart
│       │   │   │
│       │   │   ├── student/
│       │   │   │   ├── field_select_screen.dart
│       │   │   │   ├── groups_list_screen.dart
│       │   │   │   └── student_timetable_screen.dart
│       │   │   │
│       │   │   ├── teacher/
│       │   │   │   ├── teacher_select_screen.dart
│       │   │   │   └── teacher_timetable_screen.dart
│       │   │   │
│       │   │   └── my/
│       │   │       ├── my_timetable_screen.dart
│       │   │       ├── subjects_screen.dart
│       │   │       └── download_timetable_button.dart
│       │   │
│       │   └── utils/                # Services & Utilities
│       │       ├── platform_service.dart
│       │       ├── pwa_identity_service.dart
│       │       └── timetable_exporter.dart
│       │
│       ├── web/                      # PWA assets
│       │   ├── manifest.json
│       │   ├── index.html
│       │   └── icons/
│       │
│       └── pubspec.yaml
│
└── README.md                         # Acest fișier
```

---

