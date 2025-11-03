const axios = require('axios');
const cheerio = require('cheerio');

// Get all URLs from the backend and analyze each one thoroughly
async function comprehensiveAnalysis() {
  console.log('🔍 COMPREHENSIVE URL ANALYSIS');
  console.log('='.repeat(50));
  
  try {
    // Get all fields and their URLs
    const response = await axios.get('http://localhost:3000/fields');
    const fields = response.data.data.fields;
    
    const allUrls = [];
    fields.forEach(field => {
      Object.entries(field.yearLinks).forEach(([year, url]) => {
        allUrls.push({ 
          fieldName: field.name, 
          year: parseInt(year), 
          url 
        });
      });
    });
    
    console.log(`📊 Total URLs to analyze: ${allUrls.length}\n`);
    
    const results = {
      successful: [],
      failures: [],
      warnings: []
    };
    
    for (let i = 0; i < allUrls.length; i++) {
      const urlInfo = allUrls[i];
      const url = urlInfo.url;
      
      try {
        console.log(`[${i + 1}/${allUrls.length}] Testing: ${urlInfo.fieldName} Year ${urlInfo.year}`);
        console.log(`   URL: ${url}`);
        
        // Test 1: URL Pattern Matching
        const URL_REGEX = /\/files\/orar\/(\d{4})-(\d)\/tabelar\/([A-Za-z0-9]+)\.html$/i;
        const match = url.match(URL_REGEX);
        
        if (!match) {
          results.failures.push({
            ...urlInfo,
            error: 'URL pattern does not match expected format',
            type: 'pattern_error',
            details: 'URL should match: /files/orar/{YEAR}-{SEMESTER}/tabelar/{SPECIALIZATION}.html'
          });
          console.log('   ❌ URL pattern failed\n');
          continue;
        }
        
        const [, academicYear, semester, filename] = match;
        console.log(`   ✅ Pattern match: ${academicYear}-${semester}, file: ${filename}`);
        
        // Test 2: HTTP Accessibility
        const httpResponse = await axios.get(url, {
          timeout: 10000,
          validateStatus: (status) => status < 500 // Allow 404, but not 500+
        });
        
        if (httpResponse.status >= 400) {
          results.failures.push({
            ...urlInfo,
            error: `HTTP error: ${httpResponse.status}`,
            type: 'http_error',
            details: `Server returned status ${httpResponse.status}`
          });
          console.log(`   ❌ HTTP error: ${httpResponse.status}\n`);
          continue;
        }
        
        console.log(`   ✅ HTTP accessible (${httpResponse.status}), size: ${httpResponse.data.length} bytes`);
        
        // Test 3: HTML Content Analysis
        const $ = cheerio.load(httpResponse.data);
        const tables = $('table');
        
        if (tables.length === 0) {
          results.failures.push({
            ...urlInfo,
            error: 'No HTML tables found',
            type: 'no_tables',
            details: 'Page exists but contains no timetable data'
          });
          console.log('   ❌ No tables found\n');
          continue;
        }
        
        console.log(`   ✅ Found ${tables.length} table(s)`);
        
        // Test 4: Table Header Analysis
        const HEADER_MAP = {
          'zi': 'day', 'ziua': 'day', 'ziua saptamanii': 'day',
          'ore': 'hours', 'ora': 'hours', 'orele': 'hours', 'interval orar': 'hours',
          'frecventa': 'frequency', 'frecventa/se': 'frequency',
          'sala': 'room', 'locatie': 'room', 'sala/lab': 'room',
          'grup': 'group', 'grupa': 'group', 'formatie': 'group', 'formatia': 'group',
          'tip': 'type', 'tipul': 'type', 'forma': 'type',
          'disciplina': 'subject', 'materie': 'subject', 'curs': 'subject',
          'profesor': 'teacher', 'cadre didactice': 'teacher', 'titular': 'teacher'
        };
        
        function norm(s) {
          return s.toLowerCase().trim().replace(/\s+/g, ' ');
        }
        
        let foundValidTable = false;
        let bestScore = 0;
        let tableDetails = [];
        
        tables.each((tableIndex, table) => {
          const headerCells = $(table).find('tr').first().find('th, td');
          const headers = headerCells
            .map((_, h) => $(h).text().trim())
            .get()
            .filter(Boolean);
          
          const normalizedHeaders = headers.map(norm);
          const score = normalizedHeaders.reduce((acc, h) => (HEADER_MAP[h] ? acc + 1 : acc), 0);
          
          tableDetails.push({
            index: tableIndex + 1,
            headers: headers,
            normalizedHeaders: normalizedHeaders,
            score: score,
            recognizedHeaders: normalizedHeaders.filter(h => HEADER_MAP[h])
          });
          
          if (score >= 3) {
            foundValidTable = true;
          }
          
          if (score > bestScore) {
            bestScore = score;
          }
        });
        
        if (!foundValidTable) {
          results.failures.push({
            ...urlInfo,
            error: `Invalid table headers (best score: ${bestScore}/8)`,
            type: 'invalid_headers',
            details: 'Tables exist but headers don\'t match expected timetable format',
            tableDetails: tableDetails
          });
          console.log(`   ❌ Invalid headers (score: ${bestScore})`);
          tableDetails.forEach(table => {
            console.log(`      Table ${table.index}: [${table.headers.join(', ')}]`);
            console.log(`      Recognized: [${table.recognizedHeaders.join(', ')}] (${table.score}/8)`);
          });
          console.log('');
          continue;
        }
        
        // Test 5: Actual Data Rows
        let totalDataRows = 0;
        tables.each((_, table) => {
          const dataRows = $(table).find('tr').slice(1); // Skip header row
          dataRows.each((_, row) => {
            const cells = $(row).find('td');
            if (cells.length > 0) {
              const hasData = cells.toArray().some(cell => $(cell).text().trim().length > 0);
              if (hasData) totalDataRows++;
            }
          });
        });
        
        if (totalDataRows === 0) {
          results.warnings.push({
            ...urlInfo,
            warning: 'Valid table structure but no data rows',
            type: 'empty_schedule',
            details: 'Timetable exists but appears to be empty (no classes scheduled)'
          });
          console.log(`   ⚠️  Empty schedule (valid structure, no data)\n`);
        } else {
          results.successful.push({
            ...urlInfo,
            tablesCount: tables.length,
            dataRowsCount: totalDataRows,
            bestScore: bestScore
          });
          console.log(`   ✅ SUCCESS: ${tables.length} tables, ${totalDataRows} data rows, score: ${bestScore}\n`);
        }
        
      } catch (error) {
        results.failures.push({
          ...urlInfo,
          error: error.message,
          type: 'network_error',
          details: error.response ? `HTTP ${error.response.status}` : 'Network/parsing error'
        });
        console.log(`   ❌ Network error: ${error.message}\n`);
      }
    }
    
    // Summary Report
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL ANALYSIS REPORT');
    console.log('='.repeat(60));
    
    console.log(`✅ Successful: ${results.successful.length}/${allUrls.length} (${(results.successful.length/allUrls.length*100).toFixed(1)}%)`);
    console.log(`⚠️  Warnings: ${results.warnings.length}/${allUrls.length} (${(results.warnings.length/allUrls.length*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${results.failures.length}/${allUrls.length} (${(results.failures.length/allUrls.length*100).toFixed(1)}%)`);
    
    if (results.failures.length > 0) {
      console.log('\n❌ DETAILED FAILURE ANALYSIS:');
      console.log('-'.repeat(40));
      
      const failuresByType = {};
      results.failures.forEach(failure => {
        if (!failuresByType[failure.type]) {
          failuresByType[failure.type] = [];
        }
        failuresByType[failure.type].push(failure);
      });
      
      Object.entries(failuresByType).forEach(([type, failures]) => {
        console.log(`\n${type.toUpperCase().replace('_', ' ')} (${failures.length} failures):`);
        failures.forEach((failure, index) => {
          console.log(`  ${index + 1}. ${failure.fieldName} Year ${failure.year}`);
          console.log(`     URL: ${failure.url}`);
          console.log(`     Error: ${failure.error}`);
          if (failure.tableDetails) {
            console.log(`     Table Headers Found:`);
            failure.tableDetails.forEach(table => {
              console.log(`       Table ${table.index}: [${table.headers.join(', ')}]`);
            });
          }
        });
      });
    }
    
    if (results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (Valid but Empty):');
      console.log('-'.repeat(30));
      results.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning.fieldName} Year ${warning.year}`);
        console.log(`     ${warning.warning}`);
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('Failed to get data from backend:', error.message);
    return null;
  }
}

// Run the analysis
comprehensiveAnalysis().then(results => {
  if (results) {
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('-'.repeat(20));
    
    if (results.failures.length === 0) {
      console.log('✨ Perfect! All URLs are working correctly.');
    } else {
      console.log('1. Fix URL pattern issues (if any)');
      console.log('2. Handle empty pages gracefully');
      console.log('3. Improve header recognition for edge cases');
      console.log('4. Add fallback parsing for non-standard table formats');
    }
  }
}).catch(console.error);
