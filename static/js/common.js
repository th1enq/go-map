// Common authentication functions
const Auth = {
    // Check if user is logged in
    isLoggedIn() {
        const token = localStorage.getItem('token');
        console.log('[Auth] Checking login status:', !!token);
        return !!token;
    },

    // Check if user is admin
    isAdmin() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('[Auth] Checking admin status:', user.role === 'admin');
        return user.role === 'admin';
    },

    // Get current user data
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('user') || '{}');
    },

    // Get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        if (!token) {
            return {};
        }
        return {
            'Authorization': `Bearer ${token}`
        };
    },

    // Handle unauthorized access
    handleUnauthorized() {
        console.log('[Auth] Handling unauthorized');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },

    // Handle logout
    handleLogout() {
        console.log('[Auth] Handling logout');
        // Make logout API call
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('[Auth] Logout response status:', response.status);
        })
        .catch(error => {
            console.error('[Auth] Logout error:', error);
        })
        .finally(() => {
            // Clear local storage and redirect regardless of API response
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        });
    }
};

// Common API functions
const API = {
    // Helper function to make authenticated API calls
    async fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            Auth.handleUnauthorized();
            return null;
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        
        try {
            console.log(`[API] Fetching ${url} with token`);
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            console.log(`[API] Response status for ${url}:`, response.status);
            
            // Handle unauthorized access
            if (response.status === 401) {
                console.log('[API] Unauthorized response, handling...');
                Auth.handleUnauthorized();
                return null;
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }
            
            return response.json();
        } catch (error) {
            console.error('[API] Error:', error);
            throw error;
        }
    },

    // GET request with authentication
    get(url) {
        return this.fetchWithAuth(url, { method: 'GET' });
    },

    // POST request with authentication
    post(url, data) {
        return this.fetchWithAuth(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request with authentication
    put(url, data) {
        return this.fetchWithAuth(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE request with authentication
    delete(url) {
        return this.fetchWithAuth(url, {
            method: 'DELETE'
        });
    }
};