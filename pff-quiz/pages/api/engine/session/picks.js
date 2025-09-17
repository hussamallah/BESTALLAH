// Real Engine API for Vercel
const { setPicks } = require('../../../../engine/index.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id, picked_families } = req.body;
    
    if (!session_id || !picked_families) {
      return res.status(400).json({ error: 'session_id and picked_families are required' });
    }

    // Call the real engine function
    const result = setPicks(session_id, picked_families);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Engine picks error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
