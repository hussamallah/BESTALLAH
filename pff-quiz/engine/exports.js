/**
 * Compatibility Export Schemas
 * 
 * Provides read-only snapshots at FINALIZED for downstream consumers.
 * These exports are data-only, plug-and-play formats.
 */

class ExportGenerator {
  constructor() {
    this.session = null;
    this.bankPackage = null;
  }

  setSession(session) {
    this.session = session;
  }

  setBankPackage(bankPackage) {
    this.bankPackage = bankPackage;
  }

  /**
   * Generate minimal verdict export
   * Contains only line verdicts for each family
   */
  generateVerdictExport() {
    if (!this.session || this.session.status !== 'FINALIZED') {
      throw new Error('Session must be finalized to generate verdict export');
    }

    return {
      version: 'export.verdicts.v1',
      session_id: this.session.sessionId,
      bank_id: this.bankPackage.meta.bank_id,
      line_verdicts: this.session.lineVerdicts
    };
  }

  /**
   * Generate face presence export
   * Contains detailed face state information
   */
  generateFacePresenceExport() {
    if (!this.session || this.session.status !== 'FINALIZED') {
      throw new Error('Session must be finalized to generate face presence export');
    }

    const faces = [];
    for (const [faceId, faceState] of Object.entries(this.session.faceStates)) {
      faces.push({
        face_id: faceId,
        state: faceState.state,
        familiesHit: faceState.familiesHit,
        signatureHits: faceState.signatureHits,
        clean: faceState.clean,
        bent: faceState.bent,
        broken: faceState.broken,
        contrastSeen: faceState.contrastSeen,
        familyRep: this.isFamilyRep(faceId)
      });
    }

    return {
      version: 'export.face_presence.v1',
      session_id: this.session.sessionId,
      faces: faces,
      family_reps: this.session.familyReps
    };
  }

  /**
   * Generate proof tells export (optional)
   * Contains the specific tells that triggered face states
   */
  generateProofTellsExport() {
    if (!this.session || this.session.status !== 'FINALIZED') {
      throw new Error('Session must be finalized to generate proof tells export');
    }

    const proof = [];
    
    // Extract proof tells from answers
    for (const answer of this.session.answers) {
      if (!answer.tells) continue;

      for (const tell of answer.tells) {
        const faceId = tell.face_id;
        const existingProof = proof.find(p => p.face_id === faceId);
        
        if (existingProof) {
          if (!existingProof.tell_ids.includes(tell.tell_id)) {
            existingProof.tell_ids.push(tell.tell_id);
          }
        } else {
          proof.push({
            face_id: faceId,
            tell_ids: [tell.tell_id]
          });
        }
      }
    }

    return {
      version: 'export.proof_tells.v1',
      session_id: this.session.sessionId,
      proof: proof
    };
  }

  /**
   * Generate comprehensive export
   * Combines all export types into a single object
   */
  generateComprehensiveExport() {
    if (!this.session || this.session.status !== 'FINALIZED') {
      throw new Error('Session must be finalized to generate comprehensive export');
    }

    return {
      version: 'export.comprehensive.v1',
      session_id: this.session.sessionId,
      bank_id: this.bankPackage.meta.bank_id,
      finalized_at: this.session.finalizedAt,
      
      // Verdict data
      line_verdicts: this.session.lineVerdicts,
      
      // Face data
      face_states: this.session.faceStates,
      family_reps: this.session.familyReps,
      anchor_family: this.session.anchorFamily,
      
      // Session metadata
      picked_families: Array.from(this.session.picks),
      total_questions: this.session.answers.length,
      
      // Bank metadata
      bank_version: this.bankPackage.meta.version,
      constants_profile: this.session.constantsProfile
    };
  }

  /**
   * Generate analytics export
   * Contains session flow and timing data for analytics
   */
  generateAnalyticsExport() {
    if (!this.session || this.session.status !== 'FINALIZED') {
      throw new Error('Session must be finalized to generate analytics export');
    }

    const events = [];
    
    // Session start event
    events.push({
      ts: this.session.startedAt,
      type: 'SESSION_STARTED',
      session_id: this.session.sessionId,
      bank_id: this.bankPackage.meta.bank_id,
      picked_families: Array.from(this.session.picks)
    });

    // Question events
    for (let i = 0; i < this.session.answers.length; i++) {
      const answer = this.session.answers[i];
      const question = this.bankPackage.questions[answer.familyScreen.toLowerCase()]?.find(q => q.qid === answer.qid);
      
      if (question) {
        events.push({
          ts: answer.ts,
          type: 'QUESTION_PRESENTED',
          session_id: this.session.sessionId,
          qid: answer.qid,
          familyScreen: answer.familyScreen,
          index: i + 1,
          total: this.session.answers.length
        });

        events.push({
          ts: answer.ts,
          type: 'ANSWER_SUBMITTED',
          session_id: this.session.sessionId,
          qid: answer.qid,
          picked_key: answer.pickedKey,
          lineCOF: answer.lineCOF,
          faces_hit: answer.tells ? answer.tells.map(t => t.face_id) : [],
          latency_ms: answer.latencyMs || 0
        });
      }
    }

    // Finalization event
    events.push({
      ts: this.session.finalizedAt,
      type: 'FINALIZED',
      session_id: this.session.sessionId,
      line_verdicts: this.session.lineVerdicts,
      face_states_summary: this.generateFaceStatesSummary()
    });

    return {
      version: 'export.analytics.v1',
      session_id: this.session.sessionId,
      events: events
    };
  }

  /**
   * Generate audit export
   * Contains complete session data for compliance and debugging
   */
  generateAuditExport() {
    if (!this.session || this.session.status !== 'FINALIZED') {
      throw new Error('Session must be finalized to generate audit export');
    }

    return {
      version: 'export.audit.v1',
      session_id: this.session.sessionId,
      bank_id: this.bankPackage.meta.bank_id,
      bank_hash: this.bankPackage.meta.bank_hash_sha256,
      
      // Complete session state
      session_state: {
        started_at: this.session.startedAt,
        finalized_at: this.session.finalizedAt,
        status: this.session.status,
        picks: Array.from(this.session.picks),
        schedule: this.session.schedule,
        constants_profile: this.session.constantsProfile
      },
      
      // All answers with full context
      answers: this.session.answers,
      
      // Final computations
      line_verdicts: this.session.lineVerdicts,
      face_states: this.session.faceStates,
      family_reps: this.session.familyReps,
      anchor_family: this.session.anchorFamily,
      
      // Bank package metadata
      bank_metadata: {
        version: this.bankPackage.meta.version,
        created_at: this.bankPackage.meta.created_at,
        signature: this.bankPackage.meta.signature
      }
    };
  }

  /**
   * Helper method to check if a face is a family representative
   */
  isFamilyRep(faceId) {
    if (!this.session.familyReps) return false;
    
    return this.session.familyReps.some(rep => rep.rep === faceId);
  }

  /**
   * Generate face states summary for analytics
   */
  generateFaceStatesSummary() {
    const summary = {
      LIT: 0,
      LEAN: 0,
      GHOST: 0,
      COLD: 0,
      ABSENT: 0
    };

    for (const faceState of Object.values(this.session.faceStates)) {
      summary[faceState.state]++;
    }

    return summary;
  }

  /**
   * Save export to file
   */
  saveExport(exportData, filePath) {
    const fs = require('fs');
    const exportJson = JSON.stringify(exportData, null, 2);
    fs.writeFileSync(filePath, exportJson);
  }

  /**
   * Generate all export types and save to files
   */
  generateAllExports(outputDir) {
    const fs = require('fs');
    const path = require('path');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const sessionId = this.session.sessionId;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Generate and save all export types
    const exports = {
      verdicts: this.generateVerdictExport(),
      facePresence: this.generateFacePresenceExport(),
      proofTells: this.generateProofTellsExport(),
      comprehensive: this.generateComprehensiveExport(),
      analytics: this.generateAnalyticsExport(),
      audit: this.generateAuditExport()
    };

    // Save individual exports
    for (const [type, data] of Object.entries(exports)) {
      const fileName = `${sessionId}_${type}_${timestamp}.json`;
      const filePath = path.join(outputDir, fileName);
      this.saveExport(data, filePath);
      console.log(`Generated ${type} export: ${filePath}`);
    }

    // Save combined export
    const combinedExport = {
      version: 'export.combined.v1',
      session_id: sessionId,
      generated_at: new Date().toISOString(),
      exports: exports
    };

    const combinedFileName = `${sessionId}_combined_${timestamp}.json`;
    const combinedFilePath = path.join(outputDir, combinedFileName);
    this.saveExport(combinedExport, combinedFilePath);
    console.log(`Generated combined export: ${combinedFilePath}`);

    return exports;
  }
}

module.exports = ExportGenerator;
