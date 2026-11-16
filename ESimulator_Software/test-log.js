// test-admin-model.js
require('dotenv').config();
const Admin = require('./models/adminModel');

async function test() {
  try {
    console.log('--- TEST 1: getSystemStats ---');
    const stats = await Admin.getSystemStats();
    console.log(stats);

    console.log('\n--- TEST 2: getAllTeachers ---');
    const teachers = await Admin.getAllTeachers();
    teachers.forEach(t => {
      console.log(`  ${t.teacher_id}: ${t.full_name} (${t.role}) — active: ${t.is_active} — lessons: ${t.lesson_count}`);
    });

    console.log('\n--- TEST 3: getAllStudents ---');
    const students = await Admin.getAllStudents();
    students.forEach(s => {
      console.log(`  ${s.student_id}: ${s.full_name} (Grade ${s.grade_level}) — active: ${s.is_active} — passed: ${s.lessons_passed}`);
    });

    console.log('\n--- TEST 4: getPendingLessons ---');
    const pending = await Admin.getPendingLessons();
    console.log('Count:', pending.length);
    pending.forEach(l => console.log(`  ${l.lesson_id}: ${l.title} — by ${l.teacher_name}`));

    console.log('\n✅ Admin model tests passed.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    process.exit(0);
  }
}

test();