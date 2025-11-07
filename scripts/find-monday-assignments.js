const admin = require('firebase-admin');
const serviceAccount = require('../volunteer-resource-firebase-adminsdk-fbsvc-4eacef6097.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findMondayAssignments() {
  try {
    console.log('=== Finding Monday Morning Assignments ===\n');

    // First, get the target tasks
    const tasksSnapshot = await db.collection('tasks').get();
    const targetTaskNames = ['Carpet Installation', 'Decor', 'General Setup'];
    const targetTasks = [];
    
    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      if (targetTaskNames.some(name => data.name && data.name.toLowerCase().includes(name.toLowerCase()))) {
        targetTasks.push({ id: doc.id, ...data });
      }
    });

    console.log('Target Tasks Found:');
    targetTasks.forEach(t => console.log(`  - ${t.name} (ID: ${t.id})`));
    console.log();

    if (targetTasks.length === 0) {
      console.log('No target tasks found!');
      return;
    }

    const targetTaskIds = targetTasks.map(t => t.id);

    // Get ALL assignments
    const assignmentsSnapshot = await db.collection('assignments').get();
    const allAssignments = [];
    
    assignmentsSnapshot.forEach(doc => {
      allAssignments.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Total assignments in database: ${allAssignments.length}\n`);

    // Filter for target tasks
    const targetTaskAssignments = allAssignments.filter(a => targetTaskIds.includes(a.taskId));
    console.log(`Assignments for target tasks: ${targetTaskAssignments.length}\n`);

    // Filter for Monday
    const mondayAssignments = targetTaskAssignments.filter(a => a.day === 'Monday');
    console.log(`Monday assignments for target tasks: ${mondayAssignments.length}\n`);

    // Show breakdown by shift
    console.log('=== Monday Assignments by Shift ===');
    const shifts = {};
    mondayAssignments.forEach(a => {
      const shift = a.shift || '(no shift)';
      if (!shifts[shift]) shifts[shift] = [];
      shifts[shift].push(a);
    });
    
    Object.keys(shifts).forEach(shift => {
      console.log(`${shift}: ${shifts[shift].length} assignments`);
      
      // Show times for this shift
      const timesBreakdown = {};
      shifts[shift].forEach(a => {
        const timeKey = `${a.startTime || '(no start)'} - ${a.endTime || '(no end)'}`;
        if (!timesBreakdown[timeKey]) timesBreakdown[timeKey] = 0;
        timesBreakdown[timeKey]++;
      });
      
      Object.keys(timesBreakdown).forEach(timeKey => {
        console.log(`  ${timeKey}: ${timesBreakdown[timeKey]} assignments`);
      });
      console.log();
    });

    // Show breakdown by task
    console.log('=== Monday Assignments by Task ===');
    targetTasks.forEach(task => {
      const taskAssignments = mondayAssignments.filter(a => a.taskId === task.id);
      console.log(`${task.name}: ${taskAssignments.length} assignments`);
      
      // Show shift breakdown for each task
      const taskShifts = {};
      taskAssignments.forEach(a => {
        const shift = a.shift || '(no shift)';
        if (!taskShifts[shift]) taskShifts[shift] = 0;
        taskShifts[shift]++;
      });
      
      Object.keys(taskShifts).forEach(shift => {
        console.log(`  ${shift}: ${taskShifts[shift]}`);
      });
      console.log();
    });

    console.log('\n=== Done ===');
    console.log('\n💡 Tell me which shift/time combination you want to update!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findMondayAssignments();
