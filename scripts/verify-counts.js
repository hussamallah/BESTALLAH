const fs = require('fs');
const path = require('path');

// Load all question files
const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
const questions = {};

families.forEach(family => {
  const filePath = path.join(__dirname, '..', 'bank', 'questions', `${family.toLowerCase()}.json`);
  questions[family] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

console.log('🔢 Verifying V1 Question Bank Counts...\n');

// Count tells per option/question/family
let totalTells = 0;
let cTells = 0, oTells = 0, fTells = 0;
const faceCounts = {};

families.forEach(family => {
  const familyQuestions = questions[family].questions;
  let familyTells = 0;
  
  familyQuestions.forEach((question, qIndex) => {
    const order = question.order_in_family;
    let questionTells = 0;
    
    question.options.forEach(option => {
      const optionTells = option.tells ? option.tells.length : 0;
      questionTells += optionTells;
      totalTells += optionTells;
      
      // Count by lineCOF
      if (option.lineCOF === 'C') cTells += optionTells;
      else if (option.lineCOF === 'O') oTells += optionTells;
      else if (option.lineCOF === 'F') fTells += optionTells;
      
      // Count face appearances
      if (option.tells) {
        option.tells.forEach(tellId => {
          const faceId = tellId.split('/').slice(0, 3).join('/'); // Extract FACE/... part
          faceCounts[faceId] = (faceCounts[faceId] || 0) + 1;
        });
      }
    });
    
    console.log(`  ${family} Q${qIndex + 1} (${order}): ${questionTells} tells`);
  });
  
  console.log(`  ${family} Total: ${familyTells} tells\n`);
});

console.log('📊 BANK-WIDE COUNTS:');
console.log(`  Total tells: ${totalTells}`);
console.log(`  C tells: ${cTells}`);
console.log(`  O tells: ${oTells}`);
console.log(`  F tells: ${fTells}`);
console.log(`  Total: ${cTells + oTells + fTells}`);

console.log('\n🎭 FACE APPEARANCES:');
Object.keys(faceCounts).sort().forEach(faceId => {
  const shortId = faceId.split('/').pop();
  const family = faceId.split('/')[1];
  const isSignature = faceCounts[faceId] >= 2 && faceCounts[faceId] <= 6;
  const signatureCount = faceCounts[faceId] >= 2 ? 2 : 0;
  const adjacentCount = faceCounts[faceId] - signatureCount;
  
  console.log(`  ${shortId} (${family}): ${faceCounts[faceId]} total (${signatureCount} signature, ${adjacentCount} adjacent)`);
});

console.log('\n✅ VERIFICATION COMPLETE');
