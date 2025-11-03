const axios = require('axios');

// Test specific URLs that might be failing
const testUrls = [
  'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIDS1.html',
  'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/M1.html',
  'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/I1.html',
  'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MI1.html',
];

async function debugUrl(url) {
  try {
    console.log(`\n🔍 Testing: ${url}`);
    
    // First test if URL matches pattern
    const URL_REGEX = /\/files\/orar\/(\d{4})-(\d)\/tabelar\/([A-Za-z]+)(\d+)\.html$/i;
    const match = url.match(URL_REGEX);
    
    if (!match) {
      console.log('❌ URL pattern does not match');
      return;
    }
    
    console.log('✅ URL pattern matches');
    
    // Test if URL is accessible
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: (status) => status < 400
    });
    
    console.log(`✅ URL accessible (status: ${response.status})`);
    console.log(`📄 Content length: ${response.data.length}`);
    
    // Check for tables
    const cheerio = require('cheerio');
    const $ = cheerio.load(response.data);
    const tables = $('table');
    
    console.log(`📊 Found ${tables.length} tables`);
    
    if (tables.length > 0) {
      tables.each((i, table) => {
        const headers = $(table).find('tr').first().find('th, td');
        const headerTexts = headers.map((_, h) => $(h).text().trim()).get();
        console.log(`   Table ${i + 1}: ${headerTexts.length} headers: [${headerTexts.join(', ')}]`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
  }
}

async function main() {
  console.log('🚀 Debugging failing timetable URLs...\n');
  
  for (const url of testUrls) {
    await debugUrl(url);
  }
  
  console.log('\n✨ Debug complete!');
}

main().catch(console.error);
