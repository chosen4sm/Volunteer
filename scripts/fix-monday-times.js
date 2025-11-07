const admin = require('firebase-admin');
const serviceAccount = require('../volunteer-resource-firebase-adminsdk-fbsvc-4eacef6097.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixMondayTimes() {
  try {
    console.log('=== Fixing Monday 6am → 12am Times ===\n');

    // Get the target tasks
    const tasksSnapshot = await db.collection('tasks').get();
    const targetTaskNames = ['Carpet Installation', 'Decor', 'General Setup'];
    const targetTasks = [];
    
    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      if (targetTaskNames.some(name => data.name && data.name.toLowerCase().includes(name.toLowerCase()))) {
        targetTasks.push({ id: doc.id, ...data });
      }
    });

    console.log('Target Tasks:');
    targetTasks.forEach(t => console.log(`  - ${t.name}`));
    console.log();

    const targetTaskIds = targetTasks.map(t => t.id);

    // Get ALL assignments
    const assignmentsSnapshot = await db.collection('assignments').get();
    const allAssignments = [];
    
    assignmentsSnapshot.forEach(doc => {
      allAssignments.push({ id: doc.id, ...doc.data() });
    });

    // Filter for the specific assignments that need fixing
    const assignmentsToFix = allAssignments.filter(a => 
      a.day === 'Monday' &&
      a.shift === '12am-6am' &&
      targetTaskIds.includes(a.taskId) &&
      a.startTime === '06:00' &&
      a.endTime === '08:00'
    );

    console.log(`Found ${assignmentsToFix.length} assignments to fix\n`);

    if (assignmentsToFix.length === 0) {
      console.log('No assignments found matching criteria!');
      process.exit(0);
    }

    // Show breakdown
    console.log('Breakdown by task:');
    targetTasks.forEach(task => {
      const count = assignmentsToFix.filter(a => a.taskId === task.id).length;
      console.log(`  ${task.name}: ${count}`);
    });
    console.log();

    // Show first 3 examples
    console.log('Sample assignments to update:');
    assignmentsToFix.slice(0, 3).forEach((a, i) => {
      const task = targetTasks.find(t => t.id === a.taskId);
      console.log(`${i + 1}. ${task?.name || 'Unknown'} - Volunteer: ${a.volunteerId}`);
      console.log(`   Current: ${a.startTime} - ${a.endTime}`);
      console.log(`   New:     00:00 - ${a.endTime}`);
    });
    console.log();

    console.log('⚠️  READY TO UPDATE ⚠️');
    console.log(`This will change startTime from "06:00" to "00:00" for ${assignmentsToFix.length} assignments.`);
    
    console.log('\n🚀 Starting update...\n');
    
    let updated = 0;
    const batch = db.batch();
    
    for (const assignment of assignmentsToFix) {
      const ref = db.collection('assignments').doc(assignment.id);
      batch.update(ref, { startTime: '00:00' });
      updated++;
      
      if (updated % 50 === 0) {
        console.log(`Batched ${updated} updates...`);
      }
    }
    
    await batch.commit();
    console.log(`\n✅ Successfully updated ${updated} assignments!`);
    console.log('Times changed from 06:00 → 00:00 (6am → 12am)');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMondayTimes();

