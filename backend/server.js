require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productosRouter = require('./routes/productos');
const ingresosRouter = require('./routes/ingresos');
const ventasRouter = require('./routes/ventas');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/productos', productosRouter);
app.use('/api/ingresos', ingresosRouter);
app.use('/api/ventas', ventasRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
