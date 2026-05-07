// routes/ventas.js — Sales (venta) endpoint
//
// IMPORTANT: Stock is NOT updated manually in this code.
// Two database triggers handle stock control:
//   1. "trg_disminuir_stock_venta" (AFTER INSERT on detalle_venta)
//      → decreases producto.stock_actual by cantidad_vendida.
//   2. "trg_no_stock_negativo" (BEFORE UPDATE on producto)
//      → blocks the operation with SQLSTATE 45000 if stock would go negative.
//
// When a sale tries to sell more than available stock, MySQL raises an error
// that we catch and return as HTTP 400 to the client.

const { Router } = require('express');
const pool = require('../db');

const router = Router();

// GET /api/ventas — List all sales with their detail lines
// Uses JOINs to include product names and payment method.
// Groups detail rows by sale in JavaScript.
// Optional query params: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    // Build query with optional date filter
    let sql = `SELECT v.id_venta, v.fecha_venta, v.total_venta, v.observacion,
              mp.nombre_medio_pago AS medio_pago,
              dv.cantidad_vendida, dv.precio_unitario, dv.subtotal,
              p.nombre AS producto
       FROM venta v
       JOIN medio_pago mp ON v.id_medio_pago = mp.id_medio_pago
       JOIN detalle_venta dv ON v.id_venta = dv.id_venta
       JOIN producto p ON dv.id_producto = p.id_producto`;

    const params = [];

    if (desde && hasta) {
      sql += ` WHERE v.fecha_venta BETWEEN ? AND ?`;
      params.push(desde, hasta + ' 23:59:59');
    } else if (desde) {
      sql += ` WHERE v.fecha_venta >= ?`;
      params.push(desde);
    } else if (hasta) {
      sql += ` WHERE v.fecha_venta <= ?`;
      params.push(hasta + ' 23:59:59');
    }

    sql += ` ORDER BY v.id_venta DESC, dv.id_detalle_venta`;

    const [rows] = await pool.query(sql, params);

    // Group detail rows by sale ID
    const ventasMap = {};
    for (const row of rows) {
      if (!ventasMap[row.id_venta]) {
        ventasMap[row.id_venta] = {
          id_venta: row.id_venta,
          fecha_venta: row.fecha_venta,
          total_venta: row.total_venta,
          observacion: row.observacion,
          medio_pago: row.medio_pago,
          detalles: []
        };
      }
      ventasMap[row.id_venta].detalles.push({
        producto: row.producto,
        cantidad_vendida: row.cantidad_vendida,
        precio_unitario: row.precio_unitario,
        subtotal: row.subtotal
      });
    }

    res.json(Object.values(ventasMap));
  } catch (err) {
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
  }
});

// POST /api/ventas — Register a sale with detail lines
router.post('/', async (req, res) => {
  let conn;
  try {
    const { fecha_venta, observacion, id_interlocutor, id_medio_pago, detalles } = req.body;

    // Validate required header fields
    if (!id_medio_pago) {
      return res.status(400).json({ error: 'El campo id_medio_pago es obligatorio' });
    }
    if (!detalles || !detalles.length) {
      return res.status(400).json({ error: 'Debe incluir al menos un detalle de venta' });
    }

    // Validate each detail line has required numeric fields
    for (let i = 0; i < detalles.length; i++) {
      const d = detalles[i];
      if (d.id_producto == null || d.cantidad_vendida == null || d.precio_unitario == null) {
        return res.status(400).json({
          error: `Detalle ${i + 1}: los campos id_producto, cantidad_vendida y precio_unitario son obligatorios`
        });
      }
      if (isNaN(Number(d.cantidad_vendida)) || isNaN(Number(d.precio_unitario))) {
        return res.status(400).json({
          error: `Detalle ${i + 1}: cantidad_vendida y precio_unitario deben ser valores numéricos`
        });
      }
    }

    // Calculate total from detail lines (safe after validation)
    let total_venta = 0;
    for (const detalle of detalles) {
      total_venta += Number(detalle.cantidad_vendida) * Number(detalle.precio_unitario);
    }

    // Pre-validate stock availability before starting transaction
    for (const detalle of detalles) {
      const [stockRows] = await pool.query(
        'SELECT nombre, stock_actual FROM producto WHERE id_producto = ?',
        [detalle.id_producto]
      );
      if (stockRows.length === 0) {
        return res.status(400).json({ error: 'Producto ID ' + detalle.id_producto + ' no encontrado' });
      }
      const prod = stockRows[0];
      if (Number(detalle.cantidad_vendida) > prod.stock_actual) {
        return res.status(400).json({
          error: 'Stock insuficiente para ' + prod.nombre + '. Disponible: ' + prod.stock_actual + ', solicitado: ' + detalle.cantidad_vendida
        });
      }
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Insert venta header (id_interlocutor can be null — anonymous sale)
    const [ventaResult] = await conn.query(
      `INSERT INTO venta (fecha_venta, total_venta, observacion, id_interlocutor, id_medio_pago)
       VALUES (?, ?, ?, ?, ?)`,
      [fecha_venta || new Date(), total_venta, observacion || null, id_interlocutor || null, id_medio_pago]
    );

    const id_venta = ventaResult.insertId;

    // Insert each detail line
    // The trigger "trg_disminuir_stock_venta" fires AFTER each INSERT and
    // decreases stock_actual. If stock would go negative, the trigger
    // "trg_no_stock_negativo" blocks the UPDATE with SQLSTATE 45000.
    for (const detalle of detalles) {
      const cantidad = Number(detalle.cantidad_vendida);
      const precio = Number(detalle.precio_unitario);
      const subtotal = cantidad * precio;
      await conn.query(
        `INSERT INTO detalle_venta
           (cantidad_vendida, precio_unitario, subtotal, id_venta, id_producto)
         VALUES (?, ?, ?, ?, ?)`,
        [cantidad, precio, subtotal, id_venta, detalle.id_producto]
      );
    }

    await conn.commit();
    res.status(201).json({ id_venta, total_venta, message: 'Venta registrada correctamente' });
  } catch (err) {
    if (conn) await conn.rollback();

    // SQLSTATE 45000 = custom error from trigger (insufficient stock)
    if (err.sqlState === '45000') {
      return res.status(400).json({ error: 'Stock insuficiente: ' + (err.message || 'No se puede vender más de lo disponible') });
    }

    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
