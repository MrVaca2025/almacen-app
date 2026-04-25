// auth.js — Login/logout, session management

function getSession() {
  try {
    var session = localStorage.getItem(LS_KEYS.SESSION);
    if (session) return JSON.parse(session);
  } catch (e) { /* ignore */ }
  return null;
}

function isLoggedIn() {
  return getSession() !== null;
}

function showLoginScreen() {
  document.getElementById('app-container').style.display = 'none';
  document.getElementById('login-modal').style.display = 'flex';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  clearMessage('msg-login');
  document.getElementById('login-username').focus();
}

function showApp() {
  document.getElementById('login-modal').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';

  var session = getSession();
  if (session) {
    document.getElementById('session-username').textContent = session.username;
    document.getElementById('session-role').textContent = session.role === 'admin' ? 'Administrador' : 'Vendedor';
  }
}

async function handleLogin() {
  clearMessage('msg-login');

  var username = document.getElementById('login-username').value.trim();
  var password = document.getElementById('login-password').value;

  if (!username) { showMessage('msg-login', 'Ingresa tu usuario', 'error'); return; }
  if (!password) { showMessage('msg-login', 'Ingresa tu contraseña', 'error'); return; }

  var btn = document.getElementById('btn-login');
  btn.textContent = 'Ingresando...';
  btn.disabled = true;

  try {
    var res = await fetch(CONFIG.API_BASE + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });
    var data = await res.json();

    if (res.ok) {
      var session = {
        username: data.username,
        role: data.role,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(LS_KEYS.SESSION, JSON.stringify(session));
      showToast('Bienvenido, ' + data.username, 'success');
      showApp();
      initApp();
    } else {
      showMessage('msg-login', data.error || 'Credenciales inválidas', 'error');
    }
  } catch (err) {
    showMessage('msg-login', 'Error de conexión: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Ingresar';
    btn.disabled = false;
  }
}

function cerrarSesion() {
  if (!confirm('¿Cerrar sesión?')) return;
  localStorage.removeItem(LS_KEYS.SESSION);
  showToast('Sesión cerrada', 'info');
  showLoginScreen();
}

// Allow Enter key to submit login
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && document.getElementById('login-modal').style.display === 'flex') {
    handleLogin();
  }
});
