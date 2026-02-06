export default function handler(request, response) {
  if (request.url === '/api/health') {
    return response.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  }
  
  if (request.url === '/api/projects' && request.method === 'POST') {
    const { name } = JSON.parse(request.body || '{}');
    if (!name) {
      return response.status(400).json({ message: 'Name is required' });
    }
    
    return response.status(201).json({
      id: 'test-project-id',
      name: name,
      createdAt: new Date().toISOString()
    });
  }
  
  // Serve static files
  if (request.url === '/' || request.url === '/index.html') {
    return response.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TeamHub</title>
        </head>
        <body>
          <h1>Welcome to TeamHub!</h1>
          <p>This is a test deployment.</p>
        </body>
      </html>
    `);
  }
  
  return response.status(404).json({ message: 'Not found' });
}
