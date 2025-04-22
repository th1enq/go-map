/**
 * Register Page JavaScript
 */
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const alertContainer = document.getElementById('alert-container');
    
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/';
    }
    
    // Handle register form submission
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating account...';
            
            console.log('[Register] Attempting registration for:', email);
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            console.log('[Register] Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }
            
            // Store token and user data in localStorage
            console.log('[Register] Storing token and user data');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Create a cookie as well for server-side auth
            document.cookie = `auth_token=${data.token}; path=/; max-age=86400; SameSite=Strict`;
            
            // Show success message
            showAlert('success', 'Registration successful! Redirecting to homepage...');
            
            // Add animation for smooth transition
            document.querySelector('.auth-card').classList.add('animate__animated', 'animate__fadeOutUp');
            
            // Redirect to homepage after a delay
            setTimeout(() => {
                console.log('[Register] Redirecting to homepage');
                window.location.href = '/';
            }, 1500);
            
        } catch (error) {
            console.error('[Register] Error:', error);
            showAlert('danger', error.message);
            
            // Reset the button
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
        }
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