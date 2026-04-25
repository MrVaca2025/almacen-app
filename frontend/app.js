// app.js — Frontend logic for almacen-app
// Uses fetch() to communicate with the backend API.
// Base URL points to the Express server running on localhost:3000.

const API_BASE = 'http://localhost:3000';

// =============================================
// HELPER FUNCTIONS
// =============================================

// showMessage — Display a success or error message inside a target element
function showMessage(elementId, text, type) {
  const el = document.getElementById(elementId);
  el.textContent = text;
  el.className = 'msg ' + type; // 'success' or 'error'
}

// clearMessage — Remove message from a target element
function clearMessage(elementId) {
  const el = document.getElementById(elementId);
  el.textContent = '';
  el.className = 'msg';
}

// setResultado — Write HTML content into the results area
function setResultado(html) {
  document.getElementById('resultado').innerHTML = html;
}

// =============================================
// A) PRODUCTS VIEW
// Fetches all products from GET /api/productos
// and displays them in a table.
// =============================================

async function cargarProductos() {
  setResultado('Cargando productos...');
  try {
    const res = await fetch(API_BASE + '/api/productos');
    const data = await res.json();

    if (!res.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudieron cargar los productos') + '</p>');
      return;
    }

    if (data.length === 0) {
      setResultado('<p>No hay productos registrados.</p>');
      return;
    }

    // Build HTML table with product data
    let html = '<h2>Productos</h2>';
    html += '<table>';
    html += '<tr><th>ID</th><th>Nombre</th><th>Precio venta</th><th>Stock actual</th><th>Stock mínimo</th><th>Categoría</th><th>Activo</th></tr>';
    for (const p of data) {
      html += '<tr>';
      html += '<td>' + p.id_producto + '</td>';
      html += '<td>' + p.nombre + '</td>';
      html += '<td>$' + p.precio_venta + '</td>';
      html += '<td>' + p.stock_actual + '</td>';
      html += '<td>' + p.stock_minimo + '</td>';
      html += '<td>' + p.categoria + '</td>';
      html += '<td>' + (p.activo ? 'Sí' : 'No') + '</td>';
      html += '</tr>';
    }
    html += '</table>';
    setResultado(html);
  } catch (err) {
    setResultado('<p style="color:red;">Error de conexión: ' + err.message + '</p>');
  }
}

// =============================================
// B) LOW STOCK VIEW
// Fetches products below minimum stock from
// GET /api/productos/bajo-stock
// =============================================

async function verBajoStock() {
  setResultado('Cargando productos bajo stock...');
  try {
    const res = await fetch(API_BASE + '/api/productos/bajo-stock');
    const data = await res.json();

    if (!res.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudo consultar') + '</p>');
      return;
    }

    if (data.length === 0) {
      setResultado('<p>No hay productos bajo stock mínimo.</p>');
      return;
    }

    let html = '<h2>Productos bajo stock mínimo</h2>';
    html += '<table>';
    html += '<tr><th>Nombre</th><th>Stock actual</th><th>Stock mínimo</th><th>Déficit</th></tr>';
    for (const p of data) {
      html += '<tr>';
      html += '<td>' + p.nombre + '</td>';
      html += '<td>' + p.stock_actual + '</td>';
      html += '<td>' + p.stock_minimo + '</td>';
      html += '<td>' + p.deficit + '</td>';
      html += '</tr>';
    }
    html += '</table>';
    setResultado(html);
  } catch (err) {
    setResultado('<p style="color:red;">Error de conexión: ' + err.message + '</p>');
  }
}

// =============================================
// C) CREATE SALE
// Reads form inputs and sends POST /api/ventas
// with the sale details.
// =============================================

async function registrarVenta(event) {
  event.preventDefault();
  clearMessage('msg-venta');

  // Read form values
  const id_medio_pago = Number(document.getElementById('venta-medio-pago').value);
  const id_producto = Number(document.getElementById('venta-producto').value);
  const cantidad_vendida = Number(document.getElementById('venta-cantidad').value);
  const precio_unitario = Number(document.getElementById('venta-precio').value);

  // Build request body matching the API format
  const body = {
    id_medio_pago: id_medio_pago,
    detalles: [
      {
        id_producto: id_producto,
        cantidad_vendida: cantidad_vendida,
        precio_unitario: precio_unitario
      }
    ]
  };

  try {
    const res = await fetch(API_BASE + '/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok) {
      showMessage('msg-venta', 'Venta registrada. ID: ' + data.id_venta + ' | Total: $' + data.total_venta, 'success');
      document.getElementById('form-venta').reset();
    } else {
      // Show API error (e.g. stock insuficiente, campos faltantes)
      showMessage('msg-venta', 'Error: ' + data.error, 'error');
    }
  } catch (err) {
    showMessage('msg-venta', 'Error de conexión: ' + err.message, 'error');
  }
}

// =============================================
// D) CREATE INGRESO
// Reads form inputs and sends POST /api/ingresos
// with the goods receipt details.
// Stock is updated automatically by the database
// trigger (trg_aumentar_stock_ingreso).
// =============================================

async function registrarIngreso(event) {
  event.preventDefault();
  clearMessage('msg-ingreso');

  // Read form values
  const id_interlocutor = Number(document.getElementById('ingreso-interlocutor').value);
  const id_producto = Number(document.getElementById('ingreso-producto').value);
  const cantidad_ingresada = Number(document.getElementById('ingreso-cantidad').value);
  const precio_compra = Number(document.getElementById('ingreso-precio').value);

  // Build request body matching the API format
  const body = {
    id_interlocutor: id_interlocutor,
    detalles: [
      {
        id_producto: id_producto,
        cantidad_ingresada: cantidad_ingresada,
        precio_compra: precio_compra,
        estado_recepcion: 'aceptado'
      }
    ]
  };

  try {
    const res = await fetch(API_BASE + '/api/ingresos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok) {
      showMessage('msg-ingreso', 'Ingreso registrado. ID: ' + data.id_ingreso, 'success');
      document.getElementById('form-ingreso').reset();
    } else {
      showMessage('msg-ingreso', 'Error: ' + data.error, 'error');
    }
  } catch (err) {
    showMessage('msg-ingreso', 'Error de conexión: ' + err.message, 'error');
  }
}

// =============================================
// E) DASHBOARD
// Fetches KPIs from GET /api/dashboard and
// displays them in a readable format.
// =============================================

async function verDashboard() {
  setResultado('Cargando dashboard...');
  try {
    const res = await fetch(API_BASE + '/api/dashboard');
    const data = await res.json();

    if (!res.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudo cargar el dashboard') + '</p>');
      return;
    }

    // KPI cards
    let html = '<h2>Dashboard</h2>';
    html += '<div class="kpi-grid">';
    html += buildKpiCard(data.kpis.productos_activos, 'Productos activos');
    html += buildKpiCard(data.kpis.total_ventas, 'Ventas realizadas');
    html += buildKpiCard(data.kpis.total_ingresos, 'Ingresos registrados');
    html += buildKpiCard('$' + (data.kpis.monto_total_vendido || 0), 'Monto total vendido');
    html += buildKpiCard(data.kpis.productos_bajo_stock, 'Productos bajo stock');
    html += '</div>';

    // Sales KPIs
    html += '<h3>Ventas</h3>';
    html += '<div class="kpi-grid">';
    html += buildKpiCard('$' + (data.ventas.ventas_totales || 0), 'Ventas totales');
    html += buildKpiCard(data.ventas.numero_ventas || 0, 'Número de ventas');
    html += buildKpiCard('$' + (data.ventas.ticket_promedio || 0), 'Ticket promedio');
    html += '</div>';

    // Low stock products table
    if (data.productos_bajo_stock && data.productos_bajo_stock.length > 0) {
      html += '<h3>Productos bajo stock</h3>';
      html += '<table>';
      html += '<tr><th>Nombre</th><th>Stock actual</th><th>Stock mínimo</th><th>Déficit</th></tr>';
      for (const p of data.productos_bajo_stock) {
        html += '<tr>';
        html += '<td>' + p.nombre + '</td>';
        html += '<td>' + p.stock_actual + '</td>';
        html += '<td>' + p.stock_minimo + '</td>';
        html += '<td>' + p.deficit + '</td>';
        html += '</tr>';
      }
      html += '</table>';
    }

    // Top selling products table
    if (data.mas_vendidos && data.mas_vendidos.length > 0) {
      html += '<h3 style="margin-top:16px;">Productos más vendidos</h3>';
      html += '<table>';
      html += '<tr><th>Nombre</th><th>Total vendido</th></tr>';
      for (const p of data.mas_vendidos) {
        html += '<tr>';
        html += '<td>' + p.nombre + '</td>';
        html += '<td>' + p.total_vendido + '</td>';
        html += '</tr>';
      }
      html += '</table>';
    }

    setResultado(html);
  } catch (err) {
    setResultado('<p style="color:red;">Error de conexión: ' + err.message + '</p>');
  }
}

// buildKpiCard — Helper to create a KPI card HTML string
function buildKpiCard(value, label) {
  return '<div class="kpi-card">'
    + '<div class="kpi-value">' + value + '</div>'
    + '<div class="kpi-label">' + label + '</div>'
    + '</div>';
}
