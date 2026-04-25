// routes/productos.js — Product endpoints
// Products are the central entity. Stock is managed by database triggers,
// so this module only reads products and creates new ones (with stock_actual = 0).

const { Router } = require('express');
const pool = require('../db');

const router = Router();

// GET /api/productos — List all products with their category name
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS categoria
       FROM producto p
       JOIN categoria c ON p.id_categoria = c.id_categoria
       ORDER BY p.nombre`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/productos/bajo-stock — Products where stock_actual <= stock_minimo
// Ordered by deficit (most critical first)
router.get('/bajo-stock', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT nombre, stock_actual, stock_minimo,
              (stock_minimo - stock_actual) AS deficit
       FROM producto
       WHERE stock_actual <= stock_minimo AND activo = TRUE
       ORDER BY deficit DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/productos — Create a new product
// New products start with stock_actual = 0 (DB default).
// Stock increases only through ingresos (via trigger).
router.post('/', async (req, res) => {
  try {
    const {
      nombre, descripcion, precio_venta, stock_minimo,
      unidad_venta, unidad_compra, factor_conversion,
      activo, id_categoria
    } = req.body;

    if (!nombre || !precio_venta || !stock_minimo || !unidad_venta || !unidad_compra || !factor_conversion || !id_categoria) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, precio_venta, stock_minimo, unidad_venta, unidad_compra, factor_conversion, id_categoria' });
    }

    const [result] = await pool.query(
      `INSERT INTO producto
         (nombre, descripcion, precio_venta, stock_minimo,
          unidad_venta, unidad_compra, factor_conversion, activo, id_categoria)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion || null, precio_venta, stock_minimo,
       unidad_venta, unidad_compra, factor_conversion,
       activo !== undefined ? activo : true, id_categoria]
    );

    res.status(201).json({ id_producto: result.insertId, message: 'Producto creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
