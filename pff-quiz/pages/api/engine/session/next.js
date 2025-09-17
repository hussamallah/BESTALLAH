// Real Engine API for Vercel
const { getNextQuestion } = require('../../../../engine/index.js');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // Call the real engine function
    const result = getNextQuestion(session_id);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Engine next question error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
