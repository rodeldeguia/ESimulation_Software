// test-activitylog-model.js
require('dotenv').config();
const Log = require('./models/activityLogModel');

async function test() {
  try {
    console.log('--- TEST 1: log (student login) ---');
    await Log.log({
      actor_type: 'student',
      actor_id: 1,
      action: 'login',
      entity_type: 'student',
      entity_id: 1,
      details: { method: 'password' },
      ip_address: '127.0.0.1',
      user_agent: 'test-script'
    });
    console.log('  Logged ✅');

    console.log('\n--- TEST 2: log (teacher creates lesson) ---');
    await Log.log({
      actor_type: 'teacher',
      actor_id: 1,
      action: 'lesson.create',
      entity_type: 'lesson',
      entity_id: 99,
      details: { title: 'Test lesson' }
    });
    console.log('  Logged ✅');

    console.log('\n--- TEST 3: log with missing fields (should skip, not crash) ---');
    await Log.log({ action: 'incomplete' });
    console.log('  Skipped safely ✅');

    console.log('\n--- TEST 4: getRecent ---');
    const recent = await Log.getRecent({ limit: 5 });
    recent.forEach(l => {
      console.log(`  ${l.created_at} — ${l.actor_type}#${l.actor_id} — ${l.action} — ${l.entity_type}#${l.entity_id}`);
    });

    console.log('\n--- TEST 5: countByAction ---');
    const counts = await Log.countByAction();
    counts.forEach(c => console.log(`  ${c.action}: ${c.count}`));

    console.log('\n✅ All activity log model tests passed.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    process.exit(0);
  }
}

test();