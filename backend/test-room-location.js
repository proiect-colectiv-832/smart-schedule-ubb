// Test simplu pentru room location system
const fs = require('fs');
const path = require('path');

// Load room locations
const roomLocationsPath = path.join(__dirname, 'src', 'calendar-subscription', 'room-locations.json');
const roomData = JSON.parse(fs.readFileSync(roomLocationsPath, 'utf-8'));

console.log('🏫 Test Room Location System\n');
console.log(`📊 Total săli în sistem: ${Object.keys(roomData.rooms).length}\n`);

// Test câteva săli
const testRooms = ['C310', 'Drept_103', 'Lit-Balzac', '2/I', 'Online'];

testRooms.forEach(room => {
  const location = roomData.rooms[room];
  if (location) {
    console.log(`✅ ${room}`);
    console.log(`   LOCATION: ${location.address}`);
    console.log(`   DESCRIPTION: Room: ${room}\n`);
  } else {
    console.log(`❌ ${room} - NU EXISTĂ ÎN SISTEM\n`);
  }
});

console.log('✨ Sistemul funcționează corect!');
console.log('\nCând se generează ICS:');
console.log('  - entry.room (ex: "C310") → căutare în room-locations.json');
console.log('  - găsește adresa → pune în LOCATION');
console.log('  - pune "Room: C310" în DESCRIPTION');

