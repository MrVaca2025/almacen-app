// app.js — Frontend logic for almacen-app
// Uses fetch() to communicate with the backend API.
// Base URL points to the Express server running on localhost:3000.

const API_BASE = 'http://localhost:3000';

// =============================================
// SALE CART — stores items before submitting
// Each item: { id_producto, nombre, cantidad_vendida, precio_unitario }
// =============================================
let carrito = [];

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
// PRODUCT DROPDOWNS
// Fetches products from the API and populates
// all <select> elements that need product options.
// Called on page load and after ingreso/venta.
// =============================================

async function cargarDropdownProductos() {
  try {
    const res = await fetch(API_BASE + '/api/productos');
    const data = await res.json();

    if (!res.ok) return; // silently fail — dropdowns show default text

    // Build option elements: "ID — Nombre (Stock: X, $Precio)"
    const options = data.map(function (p) {
      return '<option value="' + p.id_producto + '">'
        + p.id_producto + ' — ' + p.nombre
        + ' (Stock: ' + p.stock_actual + ', $' + p.precio_venta + ')'
        + '</option>';
    });

    const optionsHtml = '<option value="">-- Seleccionar producto --</option>' + options.join('');

    // Populate both dropdowns (venta and ingreso)
    document.getElementById('venta-producto').innerHTML = optionsHtml;
    document.getElementById('ingreso-producto').innerHTML = optionsHtml;
  } catch (err) {
    // If the backend is not running, show fallback text
    const fallback = '<option value="">-- Error al cargar productos --</option>';
    document.getElementById('venta-producto').innerHTML = fallback;
    document.getElementById('ingreso-producto').innerHTML = fallback;
  }
}

// Auto-fill price when a product is selected in the venta dropdown
function onVentaProductoChange() {
  // We store product data from the last dropdown load to auto-fill price
  const select = document.getElementById('venta-producto');
  const option = select.options[select.selectedIndex];
  if (option && option.value) {
    // Extract price from the option text: "... $PRICE)"
    const match = option.textContent.match(/\$(\d+(?:\.\d+)?)\)/);
    if (match) {
      document.getElementById('venta-precio').value = match[1];
    }
  }
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
// C) SALE CART
// Users add products to the cart one at a time,
// then submit all items as a single sale.
// =============================================

// agregarAlCarrito — Validate inputs and add an item to the cart array
function agregarAlCarrito() {
  clearMessage('msg-venta');

  const selectEl = document.getElementById('venta-producto');
  const id_producto = Number(selectEl.value);
  const nombre = selectEl.options[selectEl.selectedIndex].textContent;
  const cantidad_vendida = Number(document.getElementById('venta-cantidad').value);
  const precio_unitario = Number(document.getElementById('venta-precio').value);

  // Validate all fields
  if (!id_producto) {
    showMessage('msg-venta', 'Seleccione un producto', 'error');
    return;
  }
  if (!cantidad_vendida || cantidad_vendida <= 0) {
    showMessage('msg-venta', 'Ingrese una cantidad válida', 'error');
    return;
  }
  if (!precio_unitario || precio_unitario <= 0) {
    showMessage('msg-venta', 'Ingrese un precio válido', 'error');
    return;
  }

  // Add item to cart array
  carrito.push({ id_producto, nombre, cantidad_vendida, precio_unitario });

  // Clear the input fields (keep medio de pago selected)
  document.getElementById('venta-producto').value = '';
  document.getElementById('venta-cantidad').value = '';
  document.getElementById('venta-precio').value = '';

  renderCarrito();
  showMessage('msg-venta', 'Producto agregado al carrito', 'success');
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

    // Each row shows product name, quantity, unit price, subtotal, and a remove button
    html += '<tr>';
    html += '<td>' + item.nombre.split(' — ')[1].split(' (')[0] + '</td>'; // extract clean name
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
    showMessage('msg-venta', 'Seleccione un medio de pago', 'error');
    return;
  }
  if (carrito.length === 0) {
    showMessage('msg-venta', 'El carrito está vacío. Agregue productos primero.', 'error');
    return;
  }

  // Build detalles array from cart items
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
      // Clear cart and refresh product dropdowns to show updated stock
      carrito = [];
      renderCarrito();
      document.getElementById('venta-medio-pago').value = '';
      cargarDropdownProductos();
      cargarProductos(); // refresh product table if visible
    } else {
      // Show the API error message (e.g. "Stock insuficiente: ...")
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

  // Read form values from inputs and dropdown
  const id_interlocutor = Number(document.getElementById('ingreso-interlocutor').value);
  const id_producto = Number(document.getElementById('ingreso-producto').value);
  const cantidad_ingresada = Number(document.getElementById('ingreso-cantidad').value);
  const precio_compra = Number(document.getElementById('ingreso-precio').value);

  if (!id_producto) {
    showMessage('msg-ingreso', 'Seleccione un producto', 'error');
    return;
  }

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
      // Refresh product dropdowns and table to show updated stock
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

// =============================================
// INITIALIZATION
// Load product dropdowns when the page opens.
// Also attach the change event for auto-fill.
// =============================================

document.addEventListener('DOMContentLoaded', function () {
  cargarDropdownProductos();
  document.getElementById('venta-producto').addEventListener('change', onVentaProductoChange);
});
