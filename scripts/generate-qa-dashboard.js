#!/usr/bin/env node

/**
 * Authoring QA Dashboard Generator
 * 
 * Generates a comprehensive QA dashboard for bank validation before deployment.
 * Provides factual readout of coverage, spread, and defects.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class QADashboardGenerator {
  constructor() {
    this.bankPackage = null;
    this.qaData = {
      schema: 'authoring_qa.v1',
      bank_id: '',
      summaries: {
        by_family: [],
        by_face: []
      },
      warnings: [],
      errors: [],
      metrics: {}
    };
  }

  async loadBankPackage(bankPath) {
    try {
      const bankPackagePath = path.resolve(bankPath);
      const bankPackageData = fs.readFileSync(bankPackagePath, 'utf8');
      this.bankPackage = JSON.parse(bankPackageData);
      this.qaData.bank_id = this.bankPackage.meta.bank_id;
      return true;
    } catch (error) {
      console.error('Failed to load bank package:', error.message);
      return false;
    }
  }

  generateQADashboard() {
    if (!this.bankPackage) {
      throw new Error('Bank package not loaded');
    }

    this.analyzeFamilies();
    this.analyzeFaces();
    this.computeMetrics();
    this.generateWarnings();
    this.generateErrors();

    return this.qaData;
  }

  analyzeFamilies() {
    const families = this.bankPackage.registries.families;
    const questions = this.bankPackage.questions;

    for (const family of families) {
      const familyName = family.name;
      const familyQuestions = questions[familyName.toLowerCase()] || [];
      
      const analysis = {
        family: familyName,
        questions: familyQuestions.length,
        has_C: false,
        has_O: false,
        has_F: false,
        options: 0,
        avg_tells_per_option: 0,
        dead_options: 0,
        sibling_collision_options: 0
      };

      let totalTells = 0;
      let totalOptions = 0;

      for (const question of familyQuestions) {
        for (const option of question.options) {
          totalOptions++;
          analysis.options++;

          // Check for COF presence
          if (option.lineCOF === 'C') analysis.has_C = true;
          if (option.lineCOF === 'O') analysis.has_O = true;
          if (option.lineCOF === 'F') analysis.has_F = true;

          // Count tells
          const tellCount = option.tells ? option.tells.length : 0;
          totalTells += tellCount;

          // Check for dead options (no tells)
          if (tellCount === 0) {
            analysis.dead_options++;
          }

          // Check for sibling collisions
          if (this.hasSiblingCollision(option.tells, familyName)) {
            analysis.sibling_collision_options++;
          }
        }
      }

      analysis.avg_tells_per_option = totalOptions > 0 ? (totalTells / totalOptions).toFixed(1) : 0;

      this.qaData.summaries.by_family.push(analysis);
    }
  }

  analyzeFaces() {
    const faces = this.bankPackage.registries.faces;
    const questions = this.bankPackage.questions;
    const contrastMatrix = this.bankPackage.registries.contrast_matrix;

    for (const face of faces) {
      const faceId = face.id;
      const familyName = face.family;
      
      const analysis = {
        face_id: faceId,
        opportunities_total: 0,
        signature_opportunities: 0,
        adjacent_opportunities: 0,
        families_covered: new Set(),
        contrast_tells_present: false,
        max_family_share_opportunities: 0
      };

      const familyCounts = {};

      // Analyze all questions across all families
      for (const [familyKey, familyQuestions] of Object.entries(questions)) {
        for (const question of familyQuestions) {
          for (const option of question.options) {
            if (!option.tells) continue;

            let hasFaceTell = false;
            for (const tell of option.tells) {
              if (tell.face_id === faceId) {
                hasFaceTell = true;
                analysis.opportunities_total++;

                // Check if signature opportunity (home family)
                if (familyKey.toLowerCase() === familyName.toLowerCase()) {
                  analysis.signature_opportunities++;
                } else {
                  analysis.adjacent_opportunities++;
                }

                // Track families covered
                analysis.families_covered.add(familyKey);

                // Track family counts for concentration analysis
                if (!familyCounts[familyKey]) {
                  familyCounts[familyKey] = 0;
                }
                familyCounts[familyKey]++;

                // Check for contrast tells
                if (this.isContrastTell(tell.tell_id, contrastMatrix)) {
                  analysis.contrast_tells_present = true;
                }
              }
            }
          }
        }
      }

      analysis.families_covered = analysis.families_covered.size;

      // Calculate max family share
      const totalOpportunities = analysis.opportunities_total;
      if (totalOpportunities > 0) {
        const maxFamilyCount = Math.max(...Object.values(familyCounts));
        analysis.max_family_share_opportunities = (maxFamilyCount / totalOpportunities).toFixed(2);
      }

      this.qaData.summaries.by_face.push(analysis);
    }
  }

  hasSiblingCollision(tells, familyName) {
    if (!tells || tells.length < 2) return false;

    const faceIds = tells.map(tell => tell.face_id);
    const familyFaces = this.bankPackage.registries.faces
      .filter(face => face.family === familyName)
      .map(face => face.id);

    // Check if multiple faces from the same family appear in this option
    const familyFaceCount = faceIds.filter(faceId => familyFaces.includes(faceId)).length;
    return familyFaceCount > 1;
  }

  isContrastTell(tellId, contrastMatrix) {
    for (const pair of contrastMatrix.pairs) {
      if (pair.a_contrast_tells.includes(tellId) || pair.b_contrast_tells.includes(tellId)) {
        return true;
      }
    }
    return false;
  }

  computeMetrics() {
    const questions = this.bankPackage.questions;
    let totalTells = 0;
    let totalOptions = 0;
    let facesWithSigLt2 = 0;
    let familiesMissingCOF = 0;

    // Calculate bank tell density
    for (const familyQuestions of Object.values(questions)) {
      for (const question of familyQuestions) {
        for (const option of question.options) {
          totalOptions++;
          if (option.tells) {
            totalTells += option.tells.length;
          }
        }
      }
    }

    // Count faces with signature opportunities < 2
    for (const faceAnalysis of this.qaData.summaries.by_face) {
      if (faceAnalysis.signature_opportunities < 2) {
        facesWithSigLt2++;
      }
    }

    // Count families missing any COF
    for (const familyAnalysis of this.qaData.summaries.by_family) {
      if (!familyAnalysis.has_C || !familyAnalysis.has_O || !familyAnalysis.has_F) {
        familiesMissingCOF++;
      }
    }

    this.qaData.metrics = {
      bank_tell_density: totalOptions > 0 ? (totalTells / totalOptions).toFixed(1) : 0,
      faces_with_sig_lt_2: facesWithSigLt2,
      families_missing_any_COF: familiesMissingCOF
    };
  }

  generateWarnings() {
    // Low adjacent opportunities warning
    for (const faceAnalysis of this.qaData.summaries.by_face) {
      if (faceAnalysis.adjacent_opportunities < 4) {
        this.qaData.warnings.push({
          code: 'W_LOW_ADJACENT',
          face_id: faceAnalysis.face_id,
          detail: `Only ${faceAnalysis.adjacent_opportunities} adjacent opportunities; target ≥4.`
        });
      }
    }

    // Sibling collision warnings
    for (const familyAnalysis of this.qaData.summaries.by_family) {
      if (familyAnalysis.sibling_collision_options > 0) {
        this.qaData.warnings.push({
          code: 'W_SIBLING_COLLISION',
          family: familyAnalysis.family,
          detail: `${familyAnalysis.sibling_collision_options} options have sibling collisions`
        });
      }
    }
  }

  generateErrors() {
    // Missing O probe errors
    for (const familyAnalysis of this.qaData.summaries.by_family) {
      if (!familyAnalysis.has_O) {
        this.qaData.errors.push({
          code: 'E_MISSING_O_PROBE',
          family: familyAnalysis.family,
          detail: 'Missing O probe in family questions'
        });
      }
    }

    // Too many tells errors (check during analysis)
    const questions = this.bankPackage.questions;
    for (const [familyKey, familyQuestions] of Object.entries(questions)) {
      for (const question of familyQuestions) {
        for (const option of question.options) {
          if (option.tells && option.tells.length > 3) {
            this.qaData.errors.push({
              code: 'E_TOO_MANY_TELLS',
              qid: question.qid,
              option: option.key,
              count: option.tells.length,
              detail: `Option has ${option.tells.length} tells (max 3)`
            });
          }
        }
      }
    }
  }

  saveDashboard(outputPath) {
    const dashboardJson = JSON.stringify(this.qaData, null, 2);
    fs.writeFileSync(outputPath, dashboardJson);
    console.log(`QA Dashboard saved to: ${outputPath}`);
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node generate-qa-dashboard.js <bank-package-path> [output-path]');
    console.log('Example: node generate-qa-dashboard.js bank/packaged/bank_package.json qa-dashboard.json');
    process.exit(1);
  }

  const bankPath = args[0];
  const outputPath = args[1] || 'qa-dashboard.json';

  const generator = new QADashboardGenerator();
  
  if (await generator.loadBankPackage(bankPath)) {
    const dashboard = generator.generateQADashboard();
    generator.saveDashboard(outputPath);
    
    // Print summary
    console.log('\n📊 QA Dashboard Summary:');
    console.log(`Bank ID: ${dashboard.bank_id}`);
    console.log(`Families: ${dashboard.summaries.by_family.length}`);
    console.log(`Faces: ${dashboard.summaries.by_face.length}`);
    console.log(`Warnings: ${dashboard.warnings.length}`);
    console.log(`Errors: ${dashboard.errors.length}`);
    console.log(`Bank Tell Density: ${dashboard.metrics.bank_tell_density}`);
    
    if (dashboard.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      dashboard.warnings.forEach(warning => {
        console.log(`  ${warning.code}: ${warning.detail}`);
      });
    }
    
    if (dashboard.errors.length > 0) {
      console.log('\n❌ Errors:');
      dashboard.errors.forEach(error => {
        console.log(`  ${error.code}: ${error.detail}`);
      });
    }
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = QADashboardGenerator;
