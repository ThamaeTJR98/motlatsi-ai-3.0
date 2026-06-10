
export const seedDemoData = () => {
  console.log('Seeding demo data...');
  
  // Clear curriculum to force update to nieuw Grades 1-12 scope
  const v = localStorage.getItem('motlatsi_demo_v');
  if (v !== '1.4') {
      localStorage.removeItem('motlatsi_curriculum');
      localStorage.removeItem('motlatsi_admin_users');
      localStorage.setItem('motlatsi_demo_v', '1.4');
  }

  if (!localStorage.getItem('motlatsi_admin_users')) {
    const demoAccounts = [
      { id: 'admin-1', name: 'Principal Lerato', role: 'admin', email: 'admin@school.ls', status: 'Active', school: 'Maseru Primary School', currentGrade: '1', completedTopics: [] },
      { id: 'teacher-1', name: 'Ntate Thabo', role: 'teacher', email: 'thabo@school.ls', status: 'Active', school: 'Maseru Primary School', currentGrade: '12', subject: 'Science', completedTopics: [] },
      { id: 'student-1', name: 'Khotso Ramosa', role: 'student', email: 'khotso@student.ls', status: 'Active', school: 'Maseru Primary School', learningNeeds: [], currentGrade: '6', completedTopics: [] },
      { id: 'parent-1', name: 'Mme Mpho', role: 'parent', email: 'parent@school.ls', status: 'Active', school: 'Maseru Primary School', linkedStudentIds: ['student-1'], completedTopics: [], currentGrade: '1' },
      { id: '1', name: 'Mme Lerato', role: 'teacher', email: 'lerato@school.ls', status: 'Active', school: 'Maseru Primary School', currentGrade: '10', subject: 'Mathematics' },
      { id: '7', name: 'Palesa Masoabi', role: 'student', email: 'palesa@student.ls', status: 'Active', school: 'Maseru Primary School', learningNeeds: ['visual_impairment'], currentGrade: '7', completedTopics: [] }
    ];
    localStorage.setItem('motlatsi_admin_users', JSON.stringify(demoAccounts));
  }

  if (!localStorage.getItem('motlatsi_activity_log')) {
    const demoLogs = [
      { id: 'a1', studentId: 'student-1', itemTitle: 'Fractions Intro', score: 8, total: 10, type: 'quiz', date: new Date().toISOString() },
      { id: 'a2', studentId: 'student-1', itemTitle: 'Numerical Patterns', score: 9, total: 10, type: 'quiz', date: new Date(Date.now() - 86400000).toISOString() },
      { id: 'a3', studentId: '102', itemTitle: 'Life Cycles', score: 7, total: 10, type: 'quiz', date: new Date().toISOString() }
    ];
    localStorage.setItem('motlatsi_activity_log', JSON.stringify(demoLogs));
  }
};
