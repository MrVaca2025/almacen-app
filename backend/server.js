// server.js — Express application entry point
// Loads environment variables, configures middleware, and mounts API routes.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productosRouter = require('./routes/productos');
const ingresosRouter = require('./routes/ingresos');
const ventasRouter = require('./routes/ventas');
const dashboardRouter = require('./routes/dashboard');
const authRouter = require('./routes/auth');
const kardexRouter = require('./routes/kardex');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', authRouter);
app.use('/api/productos', productosRouter);
app.use('/api/ingresos', ingresosRouter);
app.use('/api/ventas', ventasRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/kardex', kardexRouter);

// 404 handler for undefined routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
