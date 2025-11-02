/**
 * Demo script to test the specialization parser with real data from UBB website
 *
 * Usage:
 *   npx ts-node src/demo-specialization-parser.ts
 */

import { parseSpecializations, filterByLevel, getAllYearLinks, groupByLevel } from './specialization-parser';

const UBB_SPECIALIZATIONS_URL = 'https://www.cs.ubbcluj.ro/files/orar/2024-2/tabelar/index.html';

async function main() {
  try {
    console.log('🚀 Fetching specializations from UBB website...');
    console.log(`URL: ${UBB_SPECIALIZATIONS_URL}\n`);

    // Parse specializations from the real website
    const result = await parseSpecializations(UBB_SPECIALIZATIONS_URL);

    console.log('✅ Successfully parsed specializations!');
    console.log(`📊 Total specializations found: ${result.totalCount}\n`);

    // Group by level
    const grouped = groupByLevel(result.specializations);

    console.log('🎓 BACHELOR (Licență) Programs:');
    console.log(`   Total: ${grouped.Licenta.length}`);
    grouped.Licenta.forEach((spec, index) => {
      console.log(`   ${index + 1}. ${spec.name}`);
      console.log(`      Years: ${spec.years.map(y => `Year ${y.year} (${y.href})`).join(', ')}`);
    });

    console.log('\n🎓 MASTER Programs:');
    console.log(`   Total: ${grouped.Master.length}`);
    grouped.Master.forEach((spec, index) => {
      console.log(`   ${index + 1}. ${spec.name}`);
      console.log(`      Years: ${spec.years.map(y => `Year ${y.year} (${y.href})`).join(', ')}`);
    });

    // Get all year links for caching
    const allLinks = getAllYearLinks(result.specializations);
    console.log('\n📦 Links to cache in backend:');
    console.log(`   Total unique links: ${allLinks.length}`);
    console.log(`   Links: ${allLinks.slice(0, 10).join(', ')}...`);

    // Verify Psihologie is filtered
    const hasPsihologie = result.specializations.some(s =>
      s.name.toLowerCase().includes('psihologie')
    );
    console.log('\n🚫 Psihologie filter:');
    console.log(`   Psihologie excluded: ${!hasPsihologie ? '✅ YES' : '❌ NO'}`);

    // Example: Filter by level
    const licenta = filterByLevel(result.specializations, 'Licenta');
    const master = filterByLevel(result.specializations, 'Master');

    console.log('\n📈 Statistics:');
    console.log(`   Bachelor programs: ${licenta.length}`);
    console.log(`   Master programs: ${master.length}`);
    console.log(`   Total year links to cache: ${allLinks.length}`);

    console.log('\n✨ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Error parsing specializations:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the demo
main();

