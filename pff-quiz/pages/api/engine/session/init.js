// Real Engine API for Vercel
const path = require('path');
const { initSession } = require('../../../../engine/index.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_seed } = req.body;
    
    if (!session_seed) {
      return res.status(400).json({ error: 'session_seed is required' });
    }

    // Load bank package from the correct path
    const bankPath = path.join(process.cwd(), 'bank', 'packaged', 'bank_package.json');
    
    // Call the real engine function
    const result = initSession(session_seed, bankPath);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Engine init error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
