/**
 * Login Page JavaScript
 */
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const alertContainer = document.getElementById('alert-container');
    
    // Clear localStorage to ensure we don't have stale tokens
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Check if there's an auth error in localStorage and display it
    const authError = localStorage.getItem('authError');
    if (authError) {
        showAlert('danger', authError);
        localStorage.removeItem('authError');
    }
    
    // Handle login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        try {
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
            
            console.log('[Login] Attempting login for:', email);
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email, 
                    password,
                    remember_me: rememberMe 
                })
            });
            
            const data = await response.json();
            console.log('[Login] Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            // Store token and user data in localStorage
            console.log('[Login] Storing token and user data');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Create a cookie as well for server-side auth (in case localStorage doesn't work)
            document.cookie = `auth_token=${data.token}; path=/; max-age=${rememberMe ? 2592000 : 86400}; SameSite=Strict`;
            
            console.log('[Login] Login successful for:', email);
            console.log('[Login] User role:', data.user.role);
            
            // Validate we have what we need
            if (!data.token) {
                throw new Error('No token received from server');
            }
            
            if (!data.user || !data.user.role) {
                throw new Error('No user data or role received from server');
            }
            
            // Show success message
            showAlert('success', 'Login successful! Redirecting...');
            
            // Add animation for smooth transition
            document.querySelector('.auth-card').classList.add('animate__animated', 'animate__fadeOutUp');
            
            // Redirect based on user role
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    console.log('[Login] Redirecting to admin dashboard');
                    window.location.href = '/admin';
                } else {
                    console.log('[Login] Redirecting to home page');
                    window.location.href = '/';
                }
            }, 1000);
            
        } catch (error) {
            console.error('[Login] Error:', error);
            showAlert('danger', error.message);
            
            // Reset the button
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login';
        }
    });
    
    // Handle forgot password
    document.getElementById('forgot-password').addEventListener('click', function(e) {
        e.preventDefault();
        showAlert('info', 'Password reset functionality is not implemented yet.');
    });
    
    // Helper function to show alerts
    function showAlert(type, message) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}); 