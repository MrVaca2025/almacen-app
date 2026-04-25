// app.js — Frontend logic for almacen-app
// Uses fetch() to communicate with the backend API.
// Base URL points to the Express server running on localhost:3000.

const API_BASE = 'http://localhost:3000';

// =============================================
// SALE CART — stores items before submitting
// Each item: { id_producto, nombre, cantidad_vendida, precio_unitario, stock_disponible }
// =============================================
let carrito = [];

// =============================================
// SALES DATA — stores last loaded ventas for CSV export
// =============================================
let ultimasVentas = [];

// =============================================
// PRODUCT DATA — stores loaded products for
// stock validation and badge rendering
// =============================================
let productosData = [];

// =============================================
// HELPER FUNCTIONS
// =============================================

// showMessage — Display a success, error, or warning message
function showMessage(elementId, text, type) {
  const el = document.getElementById(elementId);
  el.textContent = text;
  el.className = 'msg ' + type; // 'success', 'error', or 'warning'
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

// getStockBadge — Return badge HTML based on 3-level stock status
// OK: stock > minimo | Bajo stock: stock <= minimo | Crítico: stock <= minimo/2
function getStockBadge(stockActual, stockMinimo) {
  if (stockActual <= Math.floor(stockMinimo / 2)) {
    return '<span class="badge badge-critical">Crítico</span>';
  } else if (stockActual <= stockMinimo) {
    return '<span class="badge badge-warning">Bajo stock</span>';
  }
  return '<span class="badge badge-success">OK</span>';
}

// getStockIndicator — Return colored text for dropdown options
function getStockIndicator(stockActual, stockMinimo) {
  if (stockActual <= Math.floor(stockMinimo / 2)) {
    return '🔴';
  } else if (stockActual <= stockMinimo) {
    return '🟡';
  }
  return '🟢';
}

// =============================================
// FORM VALIDATION STATE
// Checks required fields and enables/disables buttons
// =============================================

function checkVentaFields() {
  const producto = document.getElementById('venta-producto').value;
  const cantidad = document.getElementById('venta-cantidad').value;
  const precio = document.getElementById('venta-precio').value;
  const btn = document.getElementById('btn-agregar-carrito');
  btn.disabled = !(producto && cantidad && precio);
}

function checkIngresoFields() {
  const proveedor = document.getElementById('ingreso-interlocutor').value;
  const producto = document.getElementById('ingreso-producto').value;
  const cantidad = document.getElementById('ingreso-cantidad').value;
  const precio = document.getElementById('ingreso-precio').value;
  const btn = document.getElementById('btn-registrar-ingreso');
  btn.disabled = !(proveedor && producto && cantidad && precio);
}

// =============================================
// PRODUCT DROPDOWNS
// Fetches products from the API, stores data,
// and populates <select> elements with stock indicators.
// =============================================

async function cargarDropdownProductos() {
  try {
    const res = await fetch(API_BASE + '/api/productos');
    const data = await res.json();

    if (!res.ok) return;

    // Store product data for stock validation
    productosData = data;

    // Build option elements with stock indicator emoji
    const options = data.map(function (p) {
      const indicator = getStockIndicator(p.stock_actual, p.stock_minimo);
      return '<option value="' + p.id_producto + '" data-stock="' + p.stock_actual + '" data-minimo="' + p.stock_minimo + '" data-precio="' + p.precio_venta + '">'
        + indicator + ' ' + p.id_producto + ' — ' + p.nombre
        + ' (Stock: ' + p.stock_actual + ', $' + p.precio_venta + ')'
        + '</option>';
    });

    const optionsHtml = '<option value="">-- Seleccionar producto --</option>' + options.join('');

    document.getElementById('venta-producto').innerHTML = optionsHtml;
    document.getElementById('ingreso-producto').innerHTML = optionsHtml;

    // Re-check field state after loading
    checkVentaFields();
    checkIngresoFields();
  } catch (err) {
    const fallback = '<option value="">-- Error al cargar productos --</option>';
    document.getElementById('venta-producto').innerHTML = fallback;
    document.getElementById('ingreso-producto').innerHTML = fallback;
  }
}

// Auto-fill price when a product is selected in the venta dropdown
function onVentaProductoChange() {
  const select = document.getElementById('venta-producto');
  const option = select.options[select.selectedIndex];
  if (option && option.value) {
    const precio = option.getAttribute('data-precio');
    if (precio) {
      document.getElementById('venta-precio').value = precio;
    }
  }
  checkVentaFields();
}

// =============================================
// A) PRODUCTS VIEW
// Fetches all products and displays them with
// 3-level stock badges and active status badges.
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

    let html = '<h2>Productos</h2>';
    html += '<table>';
    html += '<tr><th>ID</th><th>Nombre</th><th>Precio venta</th><th>Stock actual</th><th>Stock mínimo</th><th>Categoría</th><th>Estado</th></tr>';
    for (const p of data) {
      const stockBadge = getStockBadge(p.stock_actual, p.stock_minimo);
      const activoBadge = p.activo
        ? '<span class="badge badge-success">Activo</span>'
        : '<span class="badge badge-warning">Inactivo</span>';

      html += '<tr>';
      html += '<td>' + p.id_producto + '</td>';
      html += '<td>' + p.nombre + '</td>';
      html += '<td>$' + p.precio_venta + '</td>';
      html += '<td>' + p.stock_actual + ' ' + stockBadge + '</td>';
      html += '<td>' + p.stock_minimo + '</td>';
      html += '<td>' + p.categoria + '</td>';
      html += '<td>' + activoBadge + '</td>';
      html += '</tr>';
    }
    html += '</table>';
    setResultado(html);
  } catch (err) {
    setResultado('<p class="error">Error de conexión: ' + err.message + '</p>');
  }
}

// =============================================
// B) LOW STOCK VIEW
// Fetches products below minimum stock with
// 3-level stock badges on each row.
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
    html += '<tr><th>Nombre</th><th>Stock actual</th><th>Stock mínimo</th><th>Déficit</th><th>Estado</th></tr>';
    for (const p of data) {
      const stockBadge = getStockBadge(p.stock_actual, p.stock_minimo);
      html += '<tr>';
      html += '<td>' + p.nombre + '</td>';
      html += '<td>' + p.stock_actual + '</td>';
      html += '<td>' + p.stock_minimo + '</td>';
      html += '<td>' + p.deficit + '</td>';
      html += '<td>' + stockBadge + '</td>';
      html += '</tr>';
    }
    html += '</table>';
    setResultado(html);
  } catch (err) {
    setResultado('<p class="error">Error de conexión: ' + err.message + '</p>');
  }
}

// =============================================
// C) SALE CART
// Users add products to the cart one at a time,
// then submit all items as a single sale.
// Validates stock availability and merges duplicates.
// =============================================

// agregarAlCarrito — Validate inputs, check stock, merge duplicates
function agregarAlCarrito() {
  clearMessage('msg-venta');

  const selectEl = document.getElementById('venta-producto');
  const id_producto = Number(selectEl.value);
  const nombre = selectEl.options[selectEl.selectedIndex].textContent;
  const cantidad_vendida = Number(document.getElementById('venta-cantidad').value);
  const precio_unitario = Number(document.getElementById('venta-precio').value);

  // Validate required fields
  if (!id_producto) {
    showMessage('msg-venta', 'Selecciona un producto', 'error');
    return;
  }
  if (!cantidad_vendida || cantidad_vendida <= 0) {
    showMessage('msg-venta', 'Cantidad inválida', 'error');
    return;
  }
  if (!precio_unitario || precio_unitario <= 0) {
    showMessage('msg-venta', 'Precio inválido', 'error');
    return;
  }

  // Get available stock from product data
  const producto = productosData.find(function (p) { return p.id_producto === id_producto; });
  const stockDisponible = producto ? producto.stock_actual : 0;

  // Calculate total quantity already in cart for this product
  let cantidadEnCarrito = 0;
  for (let i = 0; i < carrito.length; i++) {
    if (carrito[i].id_producto === id_producto) {
      cantidadEnCarrito += carrito[i].cantidad_vendida;
    }
  }

  // Validate total quantity vs available stock
  if (cantidad_vendida + cantidadEnCarrito > stockDisponible) {
    showMessage('msg-venta', 'Stock insuficiente. Disponible: ' + (stockDisponible - cantidadEnCarrito) + ' unidades', 'error');
    return;
  }

  // Check if product already exists in cart — merge quantities
  const existente = carrito.find(function (item) { return item.id_producto === id_producto; });
  if (existente) {
    existente.cantidad_vendida += cantidad_vendida;
    existente.precio_unitario = precio_unitario;
    showMessage('msg-venta', 'Cantidad actualizada en el carrito', 'success');
  } else {
    carrito.push({ id_producto, nombre, cantidad_vendida, precio_unitario, stock_disponible: stockDisponible });
    showMessage('msg-venta', 'Producto agregado al carrito', 'success');
  }

  // Clear input fields
  document.getElementById('venta-producto').value = '';
  document.getElementById('venta-cantidad').value = '';
  document.getElementById('venta-precio').value = '';
  checkVentaFields();

  renderCarrito();
}

// renderCarrito — Rebuild the cart table from the carrito array
function renderCarrito() {
  const container = document.getElementById('carrito-container');
  const tbody = document.getElementById('carrito-body');

  if (carrito.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  let total = 0;
  let html = '';

  for (let i = 0; i < carrito.length; i++) {
    const item = carrito[i];
    const subtotal = item.cantidad_vendida * item.precio_unitario;
    total += subtotal;

    // Extract clean product name from dropdown text
    const parts = item.nombre.split(' — ');
    const cleanName = parts.length > 1 ? parts[1].split(' (')[0] : item.nombre;

    html += '<tr>';
    html += '<td>' + cleanName + '</td>';
    html += '<td>' + item.cantidad_vendida + '</td>';
    html += '<td>$' + item.precio_unitario + '</td>';
    html += '<td>$' + subtotal + '</td>';
    html += '<td><button class="btn-remove" onclick="quitarDelCarrito(' + i + ')">X</button></td>';
    html += '</tr>';
  }

  tbody.innerHTML = html;
  document.getElementById('carrito-total').innerHTML = '<strong>$' + total + '</strong>';
}

// quitarDelCarrito — Remove an item from the cart by index
function quitarDelCarrito(index) {
  carrito.splice(index, 1);
  renderCarrito();
}

// registrarVenta — Send all cart items to POST /api/ventas
async function registrarVenta() {
  clearMessage('msg-venta');

  const id_medio_pago = Number(document.getElementById('venta-medio-pago').value);
  if (!id_medio_pago) {
    showMessage('msg-venta', 'Selecciona un medio de pago', 'error');
    return;
  }
  if (carrito.length === 0) {
    showMessage('msg-venta', 'El carrito está vacío. Agrega productos primero.', 'error');
    return;
  }

  const detalles = carrito.map(function (item) {
    return {
      id_producto: item.id_producto,
      cantidad_vendida: item.cantidad_vendida,
      precio_unitario: item.precio_unitario
    };
  });

  const body = { id_medio_pago: id_medio_pago, detalles: detalles };

  try {
    const res = await fetch(API_BASE + '/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok) {
      showMessage('msg-venta', 'Venta registrada. ID: ' + data.id_venta + ' | Total: $' + data.total_venta, 'success');
      carrito = [];
      renderCarrito();
      document.getElementById('venta-medio-pago').value = '';
      cargarDropdownProductos();
      cargarProductos();
    } else {
      showMessage('msg-venta', 'Error: ' + data.error, 'error');
    }
  } catch (err) {
    showMessage('msg-venta', 'Error de conexión: ' + err.message, 'error');
  }
}

// =============================================
// D) CREATE INGRESO
// Validates all fields before sending POST /api/ingresos.
// Stock updated by trigger (trg_aumentar_stock_ingreso).
// =============================================

async function registrarIngreso(event) {
  event.preventDefault();
  clearMessage('msg-ingreso');

  const id_interlocutor = Number(document.getElementById('ingreso-interlocutor').value);
  const id_producto = Number(document.getElementById('ingreso-producto').value);
  const cantidad_ingresada = Number(document.getElementById('ingreso-cantidad').value);
  const precio_compra = Number(document.getElementById('ingreso-precio').value);

  // Validate all required fields
  if (!id_interlocutor || id_interlocutor <= 0) {
    showMessage('msg-ingreso', 'Ingresa un ID de proveedor válido', 'error');
    return;
  }
  if (!id_producto) {
    showMessage('msg-ingreso', 'Selecciona un producto', 'error');
    return;
  }
  if (!cantidad_ingresada || cantidad_ingresada <= 0) {
    showMessage('msg-ingreso', 'Cantidad inválida', 'error');
    return;
  }
  if (precio_compra < 0) {
    showMessage('msg-ingreso', 'El precio no puede ser negativo', 'error');
    return;
  }

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
      checkIngresoFields();
      cargarDropdownProductos();
      cargarProductos();
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
// ventas from GET /api/ventas. Renders KPI cards,
// tables, and Chart.js charts (line + bar).
// =============================================

// Store chart instances to destroy before re-creating
let chartVentasDia = null;
let chartProductos = null;

async function verDashboard() {
  setResultado('Cargando dashboard...');
  try {
    // Fetch dashboard KPIs and ventas data in parallel
    const [resDash, resVentas] = await Promise.all([
      fetch(API_BASE + '/api/dashboard'),
      fetch(API_BASE + '/api/ventas')
    ]);

    const data = await resDash.json();
    const ventas = resVentas.ok ? await resVentas.json() : [];

    if (!resDash.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudo cargar el dashboard') + '</p>');
      return;
    }

    let html = '<h2>Dashboard</h2>';
    html += '<div class="kpi-grid">';
    html += buildKpiCard(data.kpis.productos_activos, 'Productos activos');
    html += buildKpiCard(data.kpis.total_ventas, 'Ventas realizadas');
    html += buildKpiCard(data.kpis.total_ingresos, 'Ingresos registrados');
    html += buildKpiCard('$' + (data.kpis.monto_total_vendido || 0), 'Monto total vendido');
    html += buildKpiCard(data.kpis.productos_bajo_stock, 'Productos bajo stock');
    html += '</div>';

    html += '<h3>Ventas</h3>';
    html += '<div class="kpi-grid">';
    html += buildKpiCard('$' + (data.ventas.ventas_totales || 0), 'Ventas totales');
    html += buildKpiCard(data.ventas.numero_ventas || 0, 'Número de ventas');
    html += buildKpiCard('$' + (data.ventas.ticket_promedio || 0), 'Ticket promedio');
    html += '</div>';

    // Chart containers — canvas elements inside card-style divs
    html += '<div class="charts-grid">';
    html += '<div class="chart-card card"><h3>Ventas por día</h3><canvas id="chart-ventas-dia"></canvas></div>';
    html += '<div class="chart-card card"><h3>Productos más vendidos</h3><canvas id="chart-productos"></canvas></div>';
    html += '</div>';

    if (data.productos_bajo_stock && data.productos_bajo_stock.length > 0) {
      html += '<h3>Productos bajo stock</h3>';
      html += '<table>';
      html += '<tr><th>Nombre</th><th>Stock actual</th><th>Stock mínimo</th><th>Déficit</th><th>Estado</th></tr>';
      for (const p of data.productos_bajo_stock) {
        const stockBadge = getStockBadge(p.stock_actual, p.stock_minimo);
        html += '<tr>';
        html += '<td>' + p.nombre + '</td>';
        html += '<td>' + p.stock_actual + '</td>';
        html += '<td>' + p.stock_minimo + '</td>';
        html += '<td>' + p.deficit + '</td>';
        html += '<td>' + stockBadge + '</td>';
        html += '</tr>';
      }
      html += '</table>';
    }

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

    // Render charts after HTML is in the DOM
    renderCharts(ventas);
  } catch (err) {
    setResultado('<p class="error">Error de conexión: ' + err.message + '</p>');
  }
}

// renderCharts — Build and display Chart.js charts from ventas data
function renderCharts(ventas) {
  // Destroy previous chart instances if they exist
  if (chartVentasDia) { chartVentasDia.destroy(); chartVentasDia = null; }
  if (chartProductos) { chartProductos.destroy(); chartProductos = null; }

  // ---- Chart 1: Ventas por día (line chart) ----
  // Group sales totals by date (YYYY-MM-DD)
  const ventasPorDia = {};
  for (const v of ventas) {
    const fecha = new Date(v.fecha_venta).toLocaleDateString('es-CL');
    if (!ventasPorDia[fecha]) {
      ventasPorDia[fecha] = 0;
    }
    ventasPorDia[fecha] += Number(v.total_venta);
  }

  const fechas = Object.keys(ventasPorDia);
  const totalesDia = Object.values(ventasPorDia);

  const ctxDia = document.getElementById('chart-ventas-dia');
  if (ctxDia) {
    chartVentasDia = new Chart(ctxDia, {
      type: 'line',
      data: {
        labels: fechas,
        datasets: [{
          label: 'Total vendido ($)',
          data: totalesDia,
          borderColor: '#4361ee',
          backgroundColor: 'rgba(67, 97, 238, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#4361ee',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: function (v) { return '$' + v; } }
          }
        }
      }
    });
  }

  // ---- Chart 2: Productos más vendidos (bar chart) ----
  // Aggregate total quantity sold per product from detail lines
  const productosTotales = {};
  for (const v of ventas) {
    for (const d of v.detalles) {
      if (!productosTotales[d.producto]) {
        productosTotales[d.producto] = 0;
      }
      productosTotales[d.producto] += Number(d.cantidad_vendida);
    }
  }

  // Sort by quantity descending and take top 10
  const sortedProductos = Object.entries(productosTotales)
    .sort(function (a, b) { return b[1] - a[1]; })
    .slice(0, 10);

  const nombresProductos = sortedProductos.map(function (e) { return e[0]; });
  const cantidadesProductos = sortedProductos.map(function (e) { return e[1]; });

  const ctxProd = document.getElementById('chart-productos');
  if (ctxProd) {
    chartProductos = new Chart(ctxProd, {
      type: 'bar',
      data: {
        labels: nombresProductos,
        datasets: [{
          label: 'Unidades vendidas',
          data: cantidadesProductos,
          backgroundColor: [
            '#4361ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
          ],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }
}

// buildKpiCard — Helper to create a KPI card HTML string
function buildKpiCard(value, label) {
  return '<div class="kpi-card">'
    + '<div class="kpi-value">' + value + '</div>'
    + '<div class="kpi-label">' + label + '</div>'
    + '</div>';
}

// =============================================
// F) SALES HISTORY
// Fetches sales from GET /api/ventas.
// Supports optional date filter via query params.
// Stores loaded data in ultimasVentas for CSV export.
// =============================================

async function verHistorialVentas() {
  await cargarVentas('');
}

async function filtrarVentas() {
  const desde = document.getElementById('filtro-desde').value;
  const hasta = document.getElementById('filtro-hasta').value;

  let queryString = '';
  const params = [];
  if (desde) params.push('desde=' + desde);
  if (hasta) params.push('hasta=' + hasta);
  if (params.length > 0) queryString = '?' + params.join('&');

  await cargarVentas(queryString);
}

async function cargarVentas(queryString) {
  setResultado('Cargando historial de ventas...');
  try {
    const res = await fetch(API_BASE + '/api/ventas' + queryString);
    const data = await res.json();

    if (!res.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudo cargar el historial') + '</p>');
      return;
    }

    ultimasVentas = data;

    if (data.length === 0) {
      setResultado('<p>No hay ventas en el rango seleccionado.</p>');
      return;
    }

    let html = '<h2>Historial de Ventas (' + data.length + ')</h2>';
    html += '<table>';
    html += '<tr><th>ID</th><th>Fecha</th><th>Medio de pago</th><th>Productos vendidos</th><th>Total</th></tr>';

    for (const venta of data) {
      const productosTexto = venta.detalles.map(function (d) {
        return d.producto + ' x' + d.cantidad_vendida + ' ($' + d.subtotal + ')';
      }).join(', ');

      const fecha = new Date(venta.fecha_venta).toLocaleString('es-CL');

      html += '<tr>';
      html += '<td>' + venta.id_venta + '</td>';
      html += '<td>' + fecha + '</td>';
      html += '<td>' + venta.medio_pago + '</td>';
      html += '<td>' + productosTexto + '</td>';
      html += '<td>$' + venta.total_venta + '</td>';
      html += '</tr>';
    }

    html += '</table>';
    setResultado(html);
  } catch (err) {
    setResultado('<p class="error">Error de conexión: ' + err.message + '</p>');
  }
}

// =============================================
// G) CSV EXPORT
// Generates a CSV file from the last loaded
// sales data (ultimasVentas) and triggers a
// browser download. One row per detail line.
// =============================================

function exportarCSV() {
  if (ultimasVentas.length === 0) {
    alert('No hay ventas para exportar. Primero cargue el historial de ventas.');
    return;
  }

  const headers = ['ID venta', 'Fecha', 'Medio de pago', 'Producto', 'Cantidad', 'Precio unitario', 'Subtotal', 'Total venta'];

  const rows = [];
  for (const venta of ultimasVentas) {
    const fecha = new Date(venta.fecha_venta).toLocaleString('es-CL');
    for (const d of venta.detalles) {
      rows.push([
        venta.id_venta,
        fecha,
        venta.medio_pago,
        d.producto,
        d.cantidad_vendida,
        d.precio_unitario,
        d.subtotal,
        venta.total_venta
      ]);
    }
  }

  let csv = headers.join(';') + '\n';
  for (const row of rows) {
    csv += row.map(function (val) {
      const str = String(val);
      if (str.includes(';') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(';') + '\n';
  }

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ventas.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// =============================================
// INITIALIZATION
// Load product dropdowns when the page opens.
// Attach change/input events for validation state.
// =============================================

document.addEventListener('DOMContentLoaded', function () {
  cargarDropdownProductos();

  // Auto-fill price on product selection
  document.getElementById('venta-producto').addEventListener('change', onVentaProductoChange);

  // Enable/disable buttons based on field state
  document.getElementById('venta-producto').addEventListener('change', checkVentaFields);
  document.getElementById('venta-cantidad').addEventListener('input', checkVentaFields);
  document.getElementById('venta-precio').addEventListener('input', checkVentaFields);

  document.getElementById('ingreso-interlocutor').addEventListener('input', checkIngresoFields);
  document.getElementById('ingreso-producto').addEventListener('change', checkIngresoFields);
  document.getElementById('ingreso-cantidad').addEventListener('input', checkIngresoFields);
  document.getElementById('ingreso-precio').addEventListener('input', checkIngresoFields);
});
