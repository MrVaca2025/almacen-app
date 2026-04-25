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

// POST /api/ventas — Register a sale with detail lines
router.post('/', async (req, res) => {
  let conn;
  try {
    const { fecha_venta, observacion, id_interlocutor, id_medio_pago, detalles } = req.body;

    // Validate required fields
    if (!id_medio_pago) {
      return res.status(400).json({ error: 'El campo id_medio_pago es obligatorio' });
    }
    if (!detalles || !detalles.length) {
      return res.status(400).json({ error: 'Debe incluir al menos un detalle de venta' });
    }

    // Calculate total from detail lines
    let total_venta = 0;
    for (const detalle of detalles) {
      total_venta += detalle.cantidad_vendida * detalle.precio_unitario;
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
      const subtotal = detalle.cantidad_vendida * detalle.precio_unitario;
      await conn.query(
        `INSERT INTO detalle_venta
           (cantidad_vendida, precio_unitario, subtotal, id_venta, id_producto)
         VALUES (?, ?, ?, ?, ?)`,
        [detalle.cantidad_vendida, detalle.precio_unitario, subtotal, id_venta, detalle.id_producto]
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
