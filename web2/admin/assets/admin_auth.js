// Session management
const ADMIN_TOKEN_KEY = 'probtc_admin_token';
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('/admin/login.html')) {
    setupLoginForm();
    checkForLogoutMessage();
  } else {
    verifyAdminSession();
    setupSessionTimer();
    setupLogoutButton();
  }
});

function setupLoginForm() {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const twoFactorCode = document.getElementById('twoFactorCode').value;

    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

      // Simulate API call (replace with real fetch to your backend)
      const response = await mockAdminLogin(email, password, twoFactorCode);

      if (response.success) {
        // Store the session token
        localStorage.setItem(ADMIN_TOKEN_KEY, response.token);
        localStorage.setItem('adminSessionStart', Date.now());

        // Redirect to admin dashboard
        window.location.href = '/admin/';
      } else {
        showLoginError(response.error);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Secure Login';
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Authentication failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Secure Login';
    }
  });
}

async function mockAdminLogin(email, password, twoFactorCode) {
  // In a real app, replace this with a fetch() to your backend
  return new Promise(resolve => {
    setTimeout(() => {
      // These are example credentials - replace with your actual admin credentials
      const validAdmin = {
        email: 'admin@probtc.net',
        password: 'SecureAdminPass123!',
        twoFactorSecret: 'SECRETKEY' // In real app, this would be from your database
      };

      if (email !== validAdmin.email) {
        resolve({ success: false, error: 'Invalid credentials' });
        return;
      }

      if (password !== validAdmin.password) {
        resolve({ success: false, error: 'Invalid credentials' });
        return;
      }

      // In a real app, you would validate the 2FA code against the secret
      if (!/^\d{6}$/.test(twoFactorCode)) {
        resolve({ success: false, error: 'Invalid 2FA code' });
        return;
      }

      // Simulate successful login
      resolve({
        success: true,
        token: 'simulated-jwt-token-' + Math.random().toString(36).substring(2)
      });
    }, 1000); // Simulate network delay
  });
}

function verifyAdminSession() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);

  // In a real app, you would verify the token with your backend
  if (!token || !token.startsWith('simulated-jwt-token-')) {
    logoutAdmin('Please log in to access the admin panel');
    return;
  }

  // Check session timeout
  const sessionStart = localStorage.getItem('adminSessionStart');
  if (sessionStart && (Date.now() - parseInt(sessionStart)) > ADMIN_SESSION_TIMEOUT) {
    logoutAdmin('Your session has expired');
    return;
  }
}

function setupSessionTimer() {
  // Reset timer on activity
  document.addEventListener('click', () => {
    localStorage.setItem('adminSessionStart', Date.now());
  });

  document.addEventListener('keypress', () => {
    localStorage.setItem('adminSessionStart', Date.now());
  });

  // Check every minute
  setInterval(() => {
    const sessionStart = localStorage.getItem('adminSessionStart');
    if (sessionStart && (Date.now() - parseInt(sessionStart)) > ADMIN_SESSION_TIMEOUT) {
      logoutAdmin('Your session has expired due to inactivity');
    }
  }, 60000);
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logoutAdmin('You have been logged out successfully');
    });
  }
}

function logoutAdmin(message) {
  // Clear auth data
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem('adminSessionStart');

  // Redirect to login page with message
  sessionStorage.setItem('logoutMessage', message);
  window.location.href = '/admin/login.html';
}

function checkForLogoutMessage() {
  const message = sessionStorage.getItem('logoutMessage');
  if (message) {
    alert(message);
    sessionStorage.removeItem('logoutMessage');
  }
}

function showLoginError(error) {
  // Simple error display - enhance as needed
  alert('Login failed: ' + error);
}
// In assets/admin-auth.js
document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  const twoFactorCode = document.getElementById('twoFactorCode').value;

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, twoFactorCode })
    });

    if (response.ok) {
      window.location.href = '/admin/dashboard'; // Redirect to admin CRM
    } else {
      const error = await response.json();
      showLoginError(error.message);
    }
  } catch (err) {
    showLoginError('Network error. Please try again.');
  }
});

function showLoginError(message) {
  const errorElement = document.getElementById('passwordError');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}