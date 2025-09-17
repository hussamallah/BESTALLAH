#!/usr/bin/env node

/**
 * Bank Diff Tooling
 * 
 * Compares two bank versions to verify changes are intentional
 * and won't silently alter evidence dynamics.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BankDiffTool {
  constructor() {
    this.fromBank = null;
    this.toBank = null;
    this.diffData = {
      schema: 'bank_diff.v1',
      from_bank: '',
      to_bank: '',
      hash_from: '',
      hash_to: '',
      changed_families: [],
      added_questions: [],
      removed_questions: [],
      modified_questions: [],
      face_opportunity_deltas: [],
      risk_flags: []
    };
  }

  async loadBanks(fromPath, toPath) {
    try {
      // Load from bank
      const fromBankData = fs.readFileSync(fromPath, 'utf8');
      this.fromBank = JSON.parse(fromBankData);
      this.diffData.from_bank = this.fromBank.meta.bank_id;
      this.diffData.hash_from = this.fromBank.meta.bank_hash_sha256;

      // Load to bank
      const toBankData = fs.readFileSync(toPath, 'utf8');
      this.toBank = JSON.parse(toBankData);
      this.diffData.to_bank = this.toBank.meta.bank_id;
      this.diffData.hash_to = this.toBank.meta.bank_hash_sha256;

      return true;
    } catch (error) {
      console.error('Failed to load banks:', error.message);
      return false;
    }
  }

  generateDiff() {
    if (!this.fromBank || !this.toBank) {
      throw new Error('Both banks must be loaded');
    }

    this.analyzeQuestionChanges();
    this.analyzeFaceOpportunityDeltas();
    this.generateRiskFlags();

    return this.diffData;
  }

  analyzeQuestionChanges() {
    const fromQuestions = this.flattenQuestions(this.fromBank.questions);
    const toQuestions = this.flattenQuestions(this.toBank.questions);

    const fromQids = new Set(Object.keys(fromQuestions));
    const toQids = new Set(Object.keys(toQuestions));

    // Find added questions
    for (const qid of toQids) {
      if (!fromQids.has(qid)) {
        this.diffData.added_questions.push(qid);
      }
    }

    // Find removed questions
    for (const qid of fromQids) {
      if (!toQids.has(qid)) {
        this.diffData.removed_questions.push(qid);
      }
    }

    // Find modified questions
    for (const qid of fromQids) {
      if (toQids.has(qid)) {
        const fromQuestion = fromQuestions[qid];
        const toQuestion = toQuestions[qid];
        
        if (this.hasQuestionChanged(fromQuestion, toQuestion)) {
          this.diffData.modified_questions.push({
            qid: qid,
            options_changed: this.getOptionChanges(fromQuestion, toQuestion)
          });
        }
      }
    }

    // Track changed families
    const changedFamilies = new Set();
    for (const change of this.diffData.modified_questions) {
      const family = this.getFamilyFromQid(change.qid);
      if (family) {
        changedFamilies.add(family);
      }
    }
    this.diffData.changed_families = Array.from(changedFamilies);
  }

  flattenQuestions(questionsByFamily) {
    const flattened = {};
    for (const [family, questions] of Object.entries(questionsByFamily)) {
      for (const question of questions) {
        flattened[question.qid] = {
          ...question,
          family: family
        };
      }
    }
    return flattened;
  }

  hasQuestionChanged(fromQuestion, toQuestion) {
    // Check if question structure changed
    if (fromQuestion.options.length !== toQuestion.options.length) {
      return true;
    }

    // Check each option
    for (let i = 0; i < fromQuestion.options.length; i++) {
      const fromOption = fromQuestion.options[i];
      const toOption = toQuestion.options[i];
      
      if (this.hasOptionChanged(fromOption, toOption)) {
        return true;
      }
    }

    return false;
  }

  hasOptionChanged(fromOption, toOption) {
    // Check lineCOF
    if (fromOption.lineCOF !== toOption.lineCOF) {
      return true;
    }

    // Check tells
    const fromTells = fromOption.tells || [];
    const toTells = toOption.tells || [];
    
    if (fromTells.length !== toTells.length) {
      return true;
    }

    // Check tell content
    const fromTellIds = fromTells.map(tell => tell.tell_id).sort();
    const toTellIds = toTells.map(tell => tell.tell_id).sort();
    
    if (JSON.stringify(fromTellIds) !== JSON.stringify(toTellIds)) {
      return true;
    }

    return false;
  }

  getOptionChanges(fromQuestion, toQuestion) {
    const changes = [];
    
    for (let i = 0; i < fromQuestion.options.length; i++) {
      const fromOption = fromQuestion.options[i];
      const toOption = toQuestion.options[i];
      
      if (this.hasOptionChanged(fromOption, toOption)) {
        const change = {
          key: fromOption.key,
          lineCOF_from: fromOption.lineCOF,
          lineCOF_to: toOption.lineCOF,
          tells_added: [],
          tells_removed: []
        };

        // Find tell changes
        const fromTellIds = (fromOption.tells || []).map(tell => tell.tell_id);
        const toTellIds = (toOption.tells || []).map(tell => tell.tell_id);
        
        for (const tellId of toTellIds) {
          if (!fromTellIds.includes(tellId)) {
            change.tells_added.push(tellId);
          }
        }
        
        for (const tellId of fromTellIds) {
          if (!toTellIds.includes(tellId)) {
            change.tells_removed.push(tellId);
          }
        }

        changes.push(change);
      }
    }

    return changes;
  }

  getFamilyFromQid(qid) {
    // Extract family from qid (e.g., "CTRL_Q1" -> "Control")
    const familyMap = {
      'CTRL': 'Control',
      'PACE': 'Pace', 
      'BOUND': 'Boundary',
      'TRUTH': 'Truth',
      'RECOG': 'Recognition',
      'BOND': 'Bonding',
      'STR': 'Stress'
    };

    const prefix = qid.split('_')[0];
    return familyMap[prefix] || null;
  }

  analyzeFaceOpportunityDeltas() {
    const fromFaceAnalysis = this.analyzeFaceOpportunities(this.fromBank);
    const toFaceAnalysis = this.analyzeFaceOpportunities(this.toBank);

    for (const faceId of Object.keys(fromFaceAnalysis)) {
      const fromData = fromFaceAnalysis[faceId];
      const toData = toFaceAnalysis[faceId] || {
        opportunities: 0,
        families_covered: 0,
        signature: 0
      };

      if (fromData.opportunities !== toData.opportunities ||
          fromData.families_covered !== toData.families_covered ||
          fromData.signature !== toData.signature) {
        
        this.diffData.face_opportunity_deltas.push({
          face_id: faceId,
          opportunities_from: fromData.opportunities,
          opportunities_to: toData.opportunities,
          families_covered_from: fromData.families_covered,
          families_covered_to: toData.families_covered,
          signature_from: fromData.signature,
          signature_to: toData.signature
        });
      }
    }
  }

  analyzeFaceOpportunities(bank) {
    const faceAnalysis = {};
    const faces = bank.registries.faces;
    const questions = bank.questions;

    // Initialize face analysis
    for (const face of faces) {
      faceAnalysis[face.id] = {
        opportunities: 0,
        families_covered: new Set(),
        signature: 0
      };
    }

    // Analyze opportunities
    for (const [familyKey, familyQuestions] of Object.entries(questions)) {
      for (const question of familyQuestions) {
        for (const option of question.options) {
          if (!option.tells) continue;

          for (const tell of option.tells) {
            const faceId = tell.face_id;
            if (faceAnalysis[faceId]) {
              faceAnalysis[faceId].opportunities++;
              faceAnalysis[faceId].families_covered.add(familyKey);

              // Check if signature opportunity
              const face = faces.find(f => f.id === faceId);
              if (face && face.family.toLowerCase() === familyKey.toLowerCase()) {
                faceAnalysis[faceId].signature++;
              }
            }
          }
        }
      }
    }

    // Convert sets to counts
    for (const faceId of Object.keys(faceAnalysis)) {
      faceAnalysis[faceId].families_covered = faceAnalysis[faceId].families_covered.size;
    }

    return faceAnalysis;
  }

  generateRiskFlags() {
    // Face coverage drop risk
    for (const delta of this.diffData.face_opportunity_deltas) {
      if (delta.families_covered_to < delta.families_covered_from) {
        this.diffData.risk_flags.push({
          code: 'R_FACE_COVERAGE_DROP',
          face_id: delta.face_id,
          detail: `${delta.families_covered_from - delta.families_covered_to} family coverage drop`
        });
      }
    }

    // Line flow change risk
    for (const change of this.diffData.modified_questions) {
      for (const optionChange of change.options_changed) {
        if (optionChange.lineCOF_from !== optionChange.lineCOF_to) {
          const family = this.getFamilyFromQid(change.qid);
          this.diffData.risk_flags.push({
            code: 'R_LINE_FLOW_CHANGE',
            family: family,
            detail: `${optionChange.lineCOF_from}→${optionChange.lineCOF_to} swap on ${change.qid}${optionChange.key}`
          });
        }
      }
    }

    // Question removal risk
    if (this.diffData.removed_questions.length > 0) {
      this.diffData.risk_flags.push({
        code: 'R_QUESTIONS_REMOVED',
        detail: `${this.diffData.removed_questions.length} questions removed`
      });
    }
  }

  saveDiff(outputPath) {
    const diffJson = JSON.stringify(this.diffData, null, 2);
    fs.writeFileSync(outputPath, diffJson);
    console.log(`Bank diff saved to: ${outputPath}`);
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node bank-diff.js <from-bank-path> <to-bank-path> [output-path]');
    console.log('Example: node bank-diff.js bank/packaged/bank_v1.2.json bank/packaged/bank_v1.3.json diff.json');
    process.exit(1);
  }

  const fromPath = args[0];
  const toPath = args[1];
  const outputPath = args[2] || 'bank-diff.json';

  const diffTool = new BankDiffTool();
  
  if (await diffTool.loadBanks(fromPath, toPath)) {
    const diff = diffTool.generateDiff();
    diffTool.saveDiff(outputPath);
    
    // Print summary
    console.log('\n🔍 Bank Diff Summary:');
    console.log(`From: ${diff.from_bank} (${diff.hash_from.substring(0, 8)}...)`);
    console.log(`To: ${diff.to_bank} (${diff.hash_to.substring(0, 8)}...)`);
    console.log(`Changed Families: ${diff.changed_families.length}`);
    console.log(`Added Questions: ${diff.added_questions.length}`);
    console.log(`Removed Questions: ${diff.removed_questions.length}`);
    console.log(`Modified Questions: ${diff.modified_questions.length}`);
    console.log(`Face Opportunity Deltas: ${diff.face_opportunity_deltas.length}`);
    console.log(`Risk Flags: ${diff.risk_flags.length}`);
    
    if (diff.risk_flags.length > 0) {
      console.log('\n⚠️  Risk Flags:');
      diff.risk_flags.forEach(flag => {
        console.log(`  ${flag.code}: ${flag.detail}`);
      });
    }
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BankDiffTool;
