// routes/ingresos.js — Goods receipt (ingreso) endpoint
//
// IMPORTANT: Stock is NOT updated manually in this code.
// The database trigger "trg_aumentar_stock_ingreso" automatically increases
// producto.stock_actual when a detalle_ingreso row is inserted with
// estado_recepcion = 'aceptado'.
//
// We use a transaction so that the ingreso header and all its detail rows
// are inserted atomically — if any detail fails, everything is rolled back.

const { Router } = require('express');
const pool = require('../db');

const router = Router();

// POST /api/ingresos — Register a goods receipt with detail lines
router.post('/', async (req, res) => {
  let conn;
  try {
    const { fecha_ingreso, observacion, id_interlocutor, detalles } = req.body;

    // Validate required header fields
    if (!id_interlocutor) {
      return res.status(400).json({ error: 'El campo id_interlocutor es obligatorio (proveedor)' });
    }
    if (!detalles || !detalles.length) {
      return res.status(400).json({ error: 'Debe incluir al menos un detalle de ingreso' });
    }

    // Validate each detail line has required fields
    for (let i = 0; i < detalles.length; i++) {
      const d = detalles[i];
      if (d.id_producto == null || d.cantidad_ingresada == null) {
        return res.status(400).json({
          error: `Detalle ${i + 1}: los campos id_producto y cantidad_ingresada son obligatorios`
        });
      }
      if (isNaN(Number(d.cantidad_ingresada))) {
        return res.status(400).json({
          error: `Detalle ${i + 1}: cantidad_ingresada debe ser un valor numérico`
        });
      }
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Insert ingreso header
    const [ingresoResult] = await conn.query(
      `INSERT INTO ingreso (fecha_ingreso, observacion, id_interlocutor)
       VALUES (?, ?, ?)`,
      [fecha_ingreso || new Date(), observacion || null, id_interlocutor]
    );

    const id_ingreso = ingresoResult.insertId;

    // Insert each detail line
    // The trigger "trg_aumentar_stock_ingreso" fires AFTER each INSERT and
    // increases stock_actual if estado_recepcion = 'aceptado'.
    for (const detalle of detalles) {
      await conn.query(
        `INSERT INTO detalle_ingreso
           (cantidad_ingresada, precio_compra, estado_recepcion, motivo_rechazo, id_ingreso, id_producto)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          Number(detalle.cantidad_ingresada),
          detalle.precio_compra != null ? Number(detalle.precio_compra) : null,
          detalle.estado_recepcion || 'aceptado',
          detalle.motivo_rechazo || null,
          id_ingreso,
          detalle.id_producto
        ]
      );
    }

    await conn.commit();
    res.status(201).json({ id_ingreso, message: 'Ingreso registrado correctamente' });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
