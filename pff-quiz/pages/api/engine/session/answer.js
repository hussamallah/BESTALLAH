// Real Engine API for Vercel
const PFFEngine = require('../../../../engine/index.js');

let engine = null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize engine if not already done
    if (!engine) {
      engine = new PFFEngine();
    }

    const { session_id, qid, picked_key, ts, latency_ms } = req.body;
    
    if (!session_id || !qid || !picked_key) {
      return res.status(400).json({ error: 'session_id, qid, and picked_key are required' });
    }

    // Call the real engine
    const result = engine.submitAnswer(session_id, qid, picked_key, ts, latency_ms);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Engine answer error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
