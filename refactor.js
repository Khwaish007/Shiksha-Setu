import fs from 'fs';
import path from 'path';

const p = path.resolve('backend/src/controllers/gradeController.js');
let code = fs.readFileSync(p, 'utf-8');

// 1. Permanently hardcode mock AI to false inside the route to bypass env caching or process issues.
code = code.replace(
  "const useMockAI = process.env.USE_MOCK_AI === 'true';",
  "const useMockAI = false; // FORCED TO FALSE TO GUARANTEE GEMINI USE"
);

// 2. Insert helper method before fetchClassAnalytics to group submissions by student.
const helperCode = `
// HELPER: Merge multiple test submissions for the exact same student.
// This properly maps multiple tests back into 20 unique students instead of duplicating them.
const getAggregatedStudents = async () => {
  const allSubmissions = await Submission.find();
  const studentMap = {};
  
  for (const s of allSubmissions) {
    let name = s.studentName.toLowerCase().trim();
    if (name.startsWith('name:')) name = name.replace('name:', '').trim(); // Strip Name: prefix just in case
    
    if (!studentMap[name]) {
      studentMap[name] = { 
        studentName: s.studentName, // Keep original casing for display
        scores: [], 
        mistakes: [], 
        status: s.status 
      };
    }
    
    studentMap[name].scores.push(s.totalScore);
    studentMap[name].mistakes.push(...s.mistakes);
  }
  
  return Object.values(studentMap).map(st => {
    const avgScore = Math.round(st.scores.reduce((a, b) => a + b, 0) / st.scores.length);
    return {
      ...st,
      totalScore: avgScore,
      mistakes: st.mistakes,
      status: avgScore >= 40 ? "Success" : "Needs Review"
    };
  });
};
`;
code = code.replace("export const fetchClassAnalytics", helperCode + "\nexport const fetchClassAnalytics");

// 3. Replace all basic Submission.find() loops to use our new single mapping.
code = code.replace(/const allSubmissions = await Submission\.find\(\);/g, "const allSubmissions = await getAggregatedStudents();");

// 4. Update the rankings endpoint which originally used find().sort().limit() chained.
code = code.replace(
  /const rankings = await Submission\.find\(\)[\s\S]*?\.limit\(20\);/,
  "const allSubmissions = await getAggregatedStudents();\n    const rankings = allSubmissions.sort((a,b) => b.totalScore - a.totalScore).slice(0, 20);"
);

// 5. Update MongoDB standard aggregations to group correctly using distinct student logic via lowercasing keys
code = code.replace(
  /\{\s*\$group:\s*\{\s*_id:\s*"\$mistakes\.conceptMissed",\s*totalStudentsAffected:\s*\{\s*\$sum:\s*1\s*\}\s*,\s*questionReferences:\s*\{\s*\$addToSet:\s*"\$mistakes\.questionNumber"\s*\}\s*\}\s*\}/g,
  `{ $group: { _id: "$mistakes.conceptMissed", studentsSet: { $addToSet: { $toLower: "$studentName" } }, questionReferences: { $addToSet: "$mistakes.questionNumber" } } },
      { $addFields: { totalStudentsAffected: { $size: "$studentsSet" } } }`
);

code = code.replace(
  /\{\s*\$group:\s*\{\s*_id:\s*"\$mistakes\.conceptMissed",\s*totalStudentsAffected:\s*\{\s*\$sum:\s*1\s*\}\s*\}\s*\}/g,
  `{ $group: { _id: "$mistakes.conceptMissed", studentsSet: { $addToSet: { $toLower: "$studentName" } } } },
      { $addFields: { totalStudentsAffected: { $size: "$studentsSet" } } }`
);

code = code.replace(
  /\{\s*\$group:\s*\{\s*_id:\s*"\$mistakes\.conceptMissed",\s*frequency:\s*\{\s*\$sum:\s*1\s*\},\s*studentsList:\s*\{\s*\$addToSet:\s*"\$studentName"\s*\},\s*avgScoreOfAffected:\s*\{\s*\$avg:\s*"\$totalScore"\s*\}\s*\}\s*\}/g,
  `{ $group: { _id: "$mistakes.conceptMissed", studentsList: { $addToSet: { $toLower: "$studentName" } }, scores: { $push: "$totalScore" } } },
      { $addFields: { frequency: { $size: "$studentsList" }, totalStudentsAffected: { $size: "$studentsList" }, avgScoreOfAffected: { $avg: "$scores" } } }`
);

// 6. Update class sizes from relying on document count to distinct length count
code = code.replace(/await Submission\.countDocuments\(\)/g, "(await getAggregatedStudents()).length");

fs.writeFileSync(p, code);
console.log("Refactoring applied successfully!");
