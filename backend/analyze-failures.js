const axios = require('axios');
const cheerio = require('cheerio');

// Get all URLs from the backend
async function getAllTimetableUrls() {
  try {
    const response = await axios.get('http://localhost:3000/fields');
    const fields = response.data.data.fields;
    
    const urls = [];
    fields.forEach(field => {
      Object.values(field.yearLinks).forEach(url => {
        urls.push(url);
      });
    });
    
    return urls;
  } catch (error) {
    console.error('Failed to get fields from backend:', error.message);
    return [];
  }
}

// Normalize text for header matching
function norm(s) {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Header mapping from the parser
const HEADER_MAP = {
  zi: 'day',
  ziua: 'day',
  'ziua saptamanii': 'day',
  ore: 'hours',
  ora: 'hours',
  orele: 'hours',
  'interval orar': 'hours',
  frecventa: 'frequency',
  'frecventa/se': 'frequency',
  'frecventa saptamanala': 'frequency',
  sala: 'room',
  locatie: 'room',
  'sala/lab': 'room',
  'sala/locatie': 'room',
  grup: 'group',
  grupa: 'group',
  formatie: 'group',
  formatia: 'group',
  'formatia/seria': 'group',
  serie: 'group',
  tip: 'type',
  tipul: 'type',
  forma: 'type',
  disciplina: 'subject',
  materie: 'subject',
  curs: 'subject',
  profesor: 'teacher',
  'cadre didactice': 'teacher',
  'cadrul didactic': 'teacher',
  titular: 'teacher',
  'titular curs': 'teacher',
  'titular/seminar': 'teacher',
};

async function analyzeFailingUrls() {
  console.log('🔍 Finding URLs that would fail parsing...\n');
  
  const urls = await getAllTimetableUrls();
  console.log(`📊 Total URLs to analyze: ${urls.length}\n`);
  
  const failures = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    
    try {
      // Test URL pattern
      const URL_REGEX = /\/files\/orar\/(\d{4})-(\d)\/tabelar\/([A-Za-z]+)(\d+)\.html$/i;
      const match = url.match(URL_REGEX);
      
      if (!match) {
        failures.push({
          url,
          error: 'URL does not match expected pattern',
          type: 'pattern'
        });
        continue;
      }
      
      // Test if URL is accessible and has tables
      const response = await axios.get(url, {
        timeout: 8000,
        validateStatus: (status) => status < 400
      });
      
      const $ = cheerio.load(response.data);
      const tables = $('table');
      
      if (tables.length === 0) {
        failures.push({
          url,
          error: 'No tables found',
          type: 'no_tables'
        });
        continue;
      }
      
      // Check if any table has proper headers
      let foundValidTable = false;
      
      tables.each((_, tbl) => {
        const headerCells = $(tbl).find('tr').first().find('th, td');
        if (!headerCells.length) return;
        
        const headers = headerCells
          .map((__, h) => norm($(h).text()))
          .get()
          .filter(Boolean);
        
        if (headers.length < 3) return;
        
        const score = headers.reduce((acc, h) => (HEADER_MAP[h] ? acc + 1 : acc), 0);
        
        if (score >= 3) {
          foundValidTable = true;
        }
      });
      
      if (!foundValidTable) {
        // Get header details for debugging
        let headerDetails = '';
        tables.each((_, tbl) => {
          const headerCells = $(tbl).find('tr').first().find('th, td');
          const headers = headerCells
            .map((__, h) => $(h).text().trim())
            .get()
            .filter(Boolean);
          headerDetails += `[${headers.join(', ')}] `;
        });
        
        failures.push({
          url,
          error: 'Could not locate timetable table. Headers detected: ' + (headerDetails || 'none'),
          type: 'bad_headers',
          headers: headerDetails
        });
      }
      
    } catch (error) {
      failures.push({
        url,
        error: error.message,
        type: 'network'
      });
    }
    
    if ((i + 1) % 10 === 0) {
      console.log(`   Analyzed: ${i + 1}/${urls.length}`);
    }
  }
  
  console.log(`\n📊 Analysis complete: ${failures.length} failures out of ${urls.length} URLs\n`);
  
  if (failures.length > 0) {
    console.log('❌ Failing URLs:');
    failures.forEach((failure, index) => {
      console.log(`\n${index + 1}. ${failure.url}`);
      console.log(`   Error: ${failure.error}`);
      console.log(`   Type: ${failure.type}`);
    });
  }
  
  return failures;
}

analyzeFailingUrls().catch(console.error);
