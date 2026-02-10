// Minimal Vercel function for testing
export default async function handler(req: any, res: any) {
  try {
    console.log('Function called:', req.method, req.url);
    
    // Simple health check
    if (req.url === '/api/health') {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Vercel function is working!'
      });
    }
    
    // Simple API endpoint
    if (req.url === '/api/test') {
      return res.status(200).json({ 
        message: 'API endpoint works!',
        method: req.method
      });
    }
    
    // Default response
    res.status(200).json({ 
      message: 'Hello from Vercel!',
      url: req.url,
      method: req.method
    });
    
  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({ 
      error: 'Function crashed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}