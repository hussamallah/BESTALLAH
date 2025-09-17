#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix tell opportunities to ensure each face gets 6 total and 2 signature opportunities
 */

const BANK_DIR = path.join(__dirname, '..', 'bank');

// Load registries
const faces = JSON.parse(fs.readFileSync(path.join(BANK_DIR, 'registries', 'faces.json'), 'utf8'));
const tells = JSON.parse(fs.readFileSync(path.join(BANK_DIR, 'registries', 'tells.json'), 'utf8'));

// Create face to tells mapping
const faceTells = new Map();
tells.tells.forEach(tell => {
  if (!faceTells.has(tell.face_id)) {
    faceTells.set(tell.face_id, []);
  }
  faceTells.get(tell.face_id).push(tell.id);
});

// Load all question files
const questionFiles = fs.readdirSync(path.join(BANK_DIR, 'questions'))
  .filter(file => file.endsWith('.json'));

const questions = {};
for (const file of questionFiles) {
  const family = path.basename(file, '.json');
  questions[family] = JSON.parse(fs.readFileSync(path.join(BANK_DIR, 'questions', file), 'utf8'));
}

// Track tell usage
const tellUsage = new Map();
faces.faces.forEach(face => {
  tellUsage.set(face.id, {
    total: 0,
    signature: 0,
    used: new Set()
  });
});

// Count current usage
Object.entries(questions).forEach(([familyName, familyQuestions]) => {
  familyQuestions.questions.forEach(question => {
    question.options.forEach(option => {
      if (option.tells) {
        option.tells.forEach(tellId => {
          const tell = tells.tells.find(t => t.id === tellId);
          if (tell) {
            const faceId = tell.face_id;
            const usage = tellUsage.get(faceId);
            usage.total++;
            usage.used.add(tellId);
            
            // Check if this is a signature opportunity (tell on home family)
            const face = faces.faces.find(f => f.id === faceId);
            if (face && face.family.toLowerCase() === familyName) {
              usage.signature++;
            }
          }
        });
      }
    });
  });
});

console.log('Current tell usage:');
faces.faces.forEach(face => {
  const usage = tellUsage.get(face.id);
  console.log(`${face.id}: ${usage.total} total, ${usage.signature} signature`);
});

// Add tells to reach 6 total and 2 signature per face
Object.entries(questions).forEach(([familyName, familyQuestions]) => {
  familyQuestions.questions.forEach(question => {
    question.options.forEach(option => {
      if (!option.tells) option.tells = [];
      
      // Add tells to reach targets
      faces.faces.forEach(face => {
        const usage = tellUsage.get(face.id);
        
        // Add signature tells if needed (on home family)
        if (face.family.toLowerCase() === familyName && usage.signature < 2) {
          const availableTells = faceTells.get(face.id).filter(tellId => !usage.used.has(tellId));
          if (availableTells.length > 0 && option.tells.length < 3) {
            const tellToAdd = availableTells[0];
            option.tells.push(tellToAdd);
            usage.total++;
            usage.signature++;
            usage.used.add(tellToAdd);
          }
        }
        
        // Add general tells if needed (any family)
        if (usage.total < 6) {
          const availableTells = faceTells.get(face.id).filter(tellId => !usage.used.has(tellId));
          if (availableTells.length > 0 && option.tells.length < 3) {
            const tellToAdd = availableTells[0];
            option.tells.push(tellToAdd);
            usage.total++;
            usage.used.add(tellToAdd);
          }
        }
      });
    });
  });
});

console.log('\nAfter adding tells:');
faces.faces.forEach(face => {
  const usage = tellUsage.get(face.id);
  console.log(`${face.id}: ${usage.total} total, ${usage.signature} signature`);
});

// Write updated question files
Object.entries(questions).forEach(([familyName, familyQuestions]) => {
  const filePath = path.join(BANK_DIR, 'questions', `${familyName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(familyQuestions, null, 2));
  console.log(`Updated ${filePath}`);
});

console.log('\n✅ Tell opportunities fixed!');
