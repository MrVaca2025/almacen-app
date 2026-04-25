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
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
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
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
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
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
  }
});

// PUT /api/productos/:id — Update product fields (nombre, precio_venta, stock_minimo, id_categoria)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const { nombre, precio_venta, stock_minimo, id_categoria } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (precio_venta == null || isNaN(Number(precio_venta)) || Number(precio_venta) < 0) {
      return res.status(400).json({ error: 'El precio de venta debe ser >= 0' });
    }
    if (stock_minimo == null || isNaN(Number(stock_minimo)) || Number(stock_minimo) < 0) {
      return res.status(400).json({ error: 'El stock mínimo debe ser >= 0' });
    }
    if (!id_categoria || isNaN(Number(id_categoria))) {
      return res.status(400).json({ error: 'La categoría es obligatoria' });
    }

    const [result] = await pool.query(
      `UPDATE producto SET nombre = ?, precio_venta = ?, stock_minimo = ?, id_categoria = ? WHERE id_producto = ?`,
      [nombre.trim(), Number(precio_venta), Number(stock_minimo), Number(id_categoria), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto actualizado', id_producto: id });
  } catch (err) {
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
  }
});

// PATCH /api/productos/:id/toggle — Toggle active/inactive
router.patch('/:id/toggle', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const [rows] = await pool.query('SELECT activo FROM producto WHERE id_producto = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const nuevoEstado = !rows[0].activo;
    await pool.query('UPDATE producto SET activo = ? WHERE id_producto = ?', [nuevoEstado, id]);

    res.json({ message: nuevoEstado ? 'Producto activado' : 'Producto desactivado', activo: nuevoEstado, id_producto: id });
  } catch (err) {
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
  }
});

// GET /api/categorias — List all categories (for edit form dropdown)
router.get('/categorias', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id_categoria, nombre FROM categoria ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
  }
});

module.exports = router;
