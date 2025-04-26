// API route for handling logout
export default async function handler(req, res) {
  // Chỉ cho phép phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Lấy cookie từ request
    const cookies = req.headers.cookie || '';
    
    // URL của backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const apiUrl = `${backendUrl}/api/auth/logout`;
    
    // Chuyển tiếp request đến backend
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    // Lấy dữ liệu từ response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { message: 'Logged out successfully' };
    }
    
    // Lấy cookie từ header response để set lại cho client
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);
    }

    // Trả về response cho client
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
}