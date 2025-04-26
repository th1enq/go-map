// API route for checking authentication status
export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the auth token from the request headers or cookies
    const authToken = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
    
    if (!authToken) {
      return res.status(401).json({ 
        authenticated: false,
        error: 'Authentication required. Please provide token via Authorization header or cookie' 
      });
    }

    // URL của backend API - ensure this matches your .env configuration
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const apiUrl = `${backendUrl}/api/auth/status`;
    
    console.log(`Forwarding request to: ${apiUrl}`);

    // Forward the request to the Go backend with the token
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Log the response status for debugging
    console.log('Backend response status:', response.status);
    
    // If the response includes Set-Cookie headers, forward them to the client
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      console.log('Setting cookies from backend:', setCookieHeader);
      res.setHeader('Set-Cookie', setCookieHeader);
    }

    // Get the response data
    const data = await response.json();
    console.log('Auth data from backend:', data);

    // Return the same status code and data from the backend
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error checking auth status:', error);
    return res.status(500).json({ 
      authenticated: false,
      error: 'Internal server error'
    });
  }
}