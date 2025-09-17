// Real Engine API for Vercel
const PFFEngine = require('../../../../engine/index.js');

let engine = null;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize engine if not already done
    if (!engine) {
      engine = new PFFEngine();
    }

    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // Call the real engine
    const result = engine.getNextQuestion(session_id);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Engine next question error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
