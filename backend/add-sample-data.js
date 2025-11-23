/**
 * Add sample data to MongoDB for testing
 * This creates persistent test data that won't be deleted
 * 
 * Usage: node add-sample-data.js
 */

const baseUrl = 'https://smart-schedule-ubb-production.up.railway.app';
// Change to 'http://localhost:3000' if testing locally

// Sample entries
const sampleEntries = [
  {
    id: 1,
    day: 0, // Monday
    sh: 8,
    sm: 0,
    eh: 10,
    em: 0,
    subject: 'Advanced Programming',
    teacher: 'Prof. John Doe',
    freq: 0, // Weekly
    type: 0, // Lecture
    room: 'C309',
    format: 'In-person'
  },
  {
    id: 2,
    day: 0, // Monday
    sh: 10,
    sm: 0,
    eh: 12,
    em: 0,
    subject: 'Data Structures',
    teacher: 'Prof. Jane Smith',
    freq: 0,
    type: 2, // Lab
    room: 'Lab 101',
    format: 'In-person'
  },
  {
    id: 3,
    day: 2, // Wednesday
    sh: 8,
    sm: 0,
    eh: 10,
    em: 0,
    subject: 'Algorithms',
    teacher: 'Prof. Alice Brown',
    freq: 1, // Odd weeks
    type: 0, // Lecture
    room: 'C405',
    format: 'In-person'
  },
  {
    id: 4,
    day: 2, // Wednesday
    sh: 12,
    sm: 0,
    eh: 14,
    em: 0,
    subject: 'Web Development',
    teacher: 'Prof. Bob Wilson',
    freq: 0,
    type: 1, // Seminar
    room: 'C201',
    format: 'Hybrid'
  },
  {
    id: 5,
    day: 4, // Friday
    sh: 10,
    sm: 0,
    eh: 12,
    em: 0,
    subject: 'Database Systems',
    teacher: 'Prof. Carol Martinez',
    freq: 2, // Even weeks
    type: 2, // Lab
    room: 'Lab 203',
    format: 'In-person'
  }
];

async function addSampleData() {
  console.log('📝 Adding sample data to MongoDB...\n');

  try {
    // Create multiple sample users
    const users = [
      { userId: 'demo-student-1', name: 'Demo Student 1', entries: sampleEntries.slice(0, 3) },
      { userId: 'demo-student-2', name: 'Demo Student 2', entries: sampleEntries.slice(1, 5) },
      { userId: 'demo-student-3', name: 'Demo Student 3', entries: sampleEntries },
    ];

    for (const user of users) {
      console.log(`📤 Saving timetable for ${user.name} (${user.userId})...`);
      
      const response = await fetch(`${baseUrl}/user-timetable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          entries: user.entries
        })
      });

      const result = await response.json();
      
      if (result.hasErrors) {
        console.error(`❌ Failed for ${user.name}:`, result.message);
      } else {
        console.log(`✅ ${user.name}: ${result.data.entriesCount} entries saved`);
      }
    }

    // Get statistics
    console.log('\n📊 Checking statistics...');
    const statsResponse = await fetch(`${baseUrl}/user-timetable/stats`);
    const statsResult = await statsResponse.json();
    
    if (!statsResult.hasErrors) {
      console.log('Statistics:', JSON.stringify(statsResult.data, null, 2));
    }

    console.log('\n✅ Sample data added successfully!');
    console.log('\n💡 Tip: Check MongoDB Atlas now - you should see data in the user-timetables collection');
    console.log('🗑️  To delete: Use the delete endpoint or remove directly from MongoDB Atlas');

  } catch (error) {
    console.error('❌ Error adding sample data:', error.message);
  }
}

// Run the script
addSampleData().catch(console.error);

