// routes/auth.js — Simple authentication (hardcoded users, no DB changes)

const { Router } = require('express');
const router = Router();

const USERS = [
  { username: 'admin', password: '1234', role: 'admin' },
  { username: 'vendedor', password: '1234', role: 'vendedor' }
];

// POST /api/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  const user = USERS.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  res.json({
    message: 'Login exitoso',
    username: user.username,
    role: user.role
  });
});

module.exports = router;
