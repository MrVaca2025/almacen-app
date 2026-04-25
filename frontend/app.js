// app.js — Frontend logic for almacen-app
// Uses fetch() to communicate with the backend API.

const API_BASE = 'http://localhost:3000';

// =============================================
// CLP CURRENCY FORMATTER
// =============================================
const clpFormat = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

function formatCLP(value) {
  return clpFormat.format(value || 0);
}

// =============================================
// STATE
// =============================================
let carrito = [];
let carritoIngreso = [];
let ultimasVentas = [];
let productosData = [];

// Chart instances
let chartVentasDia = null;
let chartProductos = null;

// =============================================
// LOCALSTORAGE PERSISTENCE
// Save and restore carts, filters, payment method,
// and operator name across page reloads.
// =============================================

const LS_KEYS = {
  CARRITO: 'almacen_carrito',
  CARRITO_INGRESO: 'almacen_carritoIngreso',
  FILTRO_DESDE: 'almacen_filtroDesde',
  FILTRO_HASTA: 'almacen_filtroHasta',
  MEDIO_PAGO: 'almacen_medioPago',
  OPERADOR: 'almacen_operador'
};

function saveState() {
  try {
    localStorage.setItem(LS_KEYS.CARRITO, JSON.stringify(carrito));
    localStorage.setItem(LS_KEYS.CARRITO_INGRESO, JSON.stringify(carritoIngreso));
    localStorage.setItem(LS_KEYS.FILTRO_DESDE, document.getElementById('filtro-desde').value);
    localStorage.setItem(LS_KEYS.FILTRO_HASTA, document.getElementById('filtro-hasta').value);
    localStorage.setItem(LS_KEYS.MEDIO_PAGO, document.getElementById('venta-medio-pago').value);
    localStorage.setItem(LS_KEYS.OPERADOR, document.getElementById('operador-nombre').value);
  } catch (e) {
    // localStorage not available — ignore
  }
}

function restoreState() {
  try {
    const savedCarrito = localStorage.getItem(LS_KEYS.CARRITO);
    if (savedCarrito) carrito = JSON.parse(savedCarrito);

    const savedIngresoCart = localStorage.getItem(LS_KEYS.CARRITO_INGRESO);
    if (savedIngresoCart) carritoIngreso = JSON.parse(savedIngresoCart);

    const desde = localStorage.getItem(LS_KEYS.FILTRO_DESDE);
    if (desde) document.getElementById('filtro-desde').value = desde;

    const hasta = localStorage.getItem(LS_KEYS.FILTRO_HASTA);
    if (hasta) document.getElementById('filtro-hasta').value = hasta;

    const medioPago = localStorage.getItem(LS_KEYS.MEDIO_PAGO);
    if (medioPago) document.getElementById('venta-medio-pago').value = medioPago;

    const operador = localStorage.getItem(LS_KEYS.OPERADOR);
    if (operador) document.getElementById('operador-nombre').value = operador;

    // Render restored carts
    renderCarrito();
    renderIngresoCart();
  } catch (e) {
    // localStorage not available — ignore
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function showMessage(elementId, text, type) {
  const el = document.getElementById(elementId);
  el.textContent = text;
  el.className = 'msg ' + type + ' msg-animate';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearMessage(elementId) {
  const el = document.getElementById(elementId);
  el.textContent = '';
  el.className = 'msg';
}

function setResultado(html) {
  const el = document.getElementById('resultado');
  el.innerHTML = html;
  el.classList.add('fade-in');
}

function getStockBadge(stockActual, stockMinimo) {
  if (stockActual <= Math.floor(stockMinimo / 2)) {
    return '<span class="badge badge-critical">Crítico</span>';
  } else if (stockActual <= stockMinimo) {
    return '<span class="badge badge-warning">Bajo stock</span>';
  }
  return '<span class="badge badge-success">OK</span>';
}

function getStockIndicator(stockActual, stockMinimo) {
  if (stockActual <= Math.floor(stockMinimo / 2)) return '🔴';
  if (stockActual <= stockMinimo) return '🟡';
  return '🟢';
}

function getCleanName(fullText) {
  const parts = fullText.split(' — ');
  return parts.length > 1 ? parts[1].split(' (')[0] : fullText;
}

// Get payment method display text from its ID
function getMedioPagoText(id) {
  var names = { '1': 'Efectivo', '2': 'Tarjeta', '3': 'Transferencia' };
  return names[String(id)] || 'Medio #' + id;
}

// =============================================
// STOCK ALERT BANNER
// =============================================

async function updateStockAlert() {
  try {
    const res = await fetch(API_BASE + '/api/productos');
    const data = await res.json();
    if (!res.ok) return;

    let critico = 0;
    let bajo = 0;
    for (const p of data) {
      if (p.stock_actual <= Math.floor(p.stock_minimo / 2)) {
        critico++;
      } else if (p.stock_actual <= p.stock_minimo) {
        bajo++;
      }
    }

    const banner = document.getElementById('stock-alert');
    if (critico > 0 || bajo > 0) {
      let text = '⚠️ ';
      const parts = [];
      if (critico > 0) parts.push(critico + ' producto' + (critico > 1 ? 's' : '') + ' en estado crítico');
      if (bajo > 0) parts.push(bajo + ' producto' + (bajo > 1 ? 's' : '') + ' con bajo stock');
      text += parts.join(' / ');
      text += ' — Click para ver detalles';

      banner.textContent = text;
      banner.className = 'stock-alert' + (critico > 0 ? ' stock-alert-critical' : ' stock-alert-warning');
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  } catch (err) {
    // Silently ignore
  }
}

// =============================================
// FORM VALIDATION STATE
// =============================================

function checkVentaFields() {
  const producto = document.getElementById('venta-producto').value;
  const cantidad = document.getElementById('venta-cantidad').value;
  const precio = document.getElementById('venta-precio').value;
  document.getElementById('btn-agregar-carrito').disabled = !(producto && cantidad && precio);
}

function checkIngresoFields() {
  const producto = document.getElementById('ingreso-producto').value;
  const cantidad = document.getElementById('ingreso-cantidad').value;
  const precio = document.getElementById('ingreso-precio').value;
  document.getElementById('btn-agregar-ingreso').disabled = !(producto && cantidad && precio);
}

// =============================================
// PRODUCT DROPDOWNS
// =============================================

async function cargarDropdownProductos() {
  try {
    const res = await fetch(API_BASE + '/api/productos');
    const data = await res.json();
    if (!res.ok) return;

    productosData = data;

    const options = data.map(function (p) {
      const indicator = getStockIndicator(p.stock_actual, p.stock_minimo);
      return '<option value="' + p.id_producto + '" data-stock="' + p.stock_actual + '" data-minimo="' + p.stock_minimo + '" data-precio="' + p.precio_venta + '">'
        + indicator + ' ' + p.id_producto + ' — ' + p.nombre
        + ' (Stock: ' + p.stock_actual + ', ' + formatCLP(p.precio_venta) + ')'
        + '</option>';
    });

    const optionsHtml = '<option value="">-- Seleccionar producto --</option>' + options.join('');
    document.getElementById('venta-producto').innerHTML = optionsHtml;
    document.getElementById('ingreso-producto').innerHTML = optionsHtml;

    checkVentaFields();
    checkIngresoFields();
  } catch (err) {
    const fallback = '<option value="">-- Error al cargar productos --</option>';
    document.getElementById('venta-producto').innerHTML = fallback;
    document.getElementById('ingreso-producto').innerHTML = fallback;
  }
}

function onVentaProductoChange() {
  const select = document.getElementById('venta-producto');
  const option = select.options[select.selectedIndex];
  if (option && option.value) {
    const precio = option.getAttribute('data-precio');
    if (precio) document.getElementById('venta-precio').value = precio;
  }
  checkVentaFields();
}

// =============================================
// A) PRODUCTS VIEW
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
      html += '<td>' + formatCLP(p.precio_venta) + '</td>';
      html += '<td>' + p.stock_actual + ' ' + stockBadge + '</td>';
      html += '<td>' + p.stock_minimo + '</td>';
      html += '<td>' + (p.categoria || '—') + '</td>';
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

    let html = '<h2>⚠️ Productos bajo stock mínimo</h2>';
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
    document.getElementById('resultado').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    setResultado('<p class="error">Error de conexión: ' + err.message + '</p>');
  }
}

// =============================================
// C) SALE CART
// =============================================

function agregarAlCarrito() {
  clearMessage('msg-venta');

  const selectEl = document.getElementById('venta-producto');
  const id_producto = Number(selectEl.value);
  const nombre = selectEl.options[selectEl.selectedIndex].textContent;
  const cantidad_vendida = Number(document.getElementById('venta-cantidad').value);
  const precio_unitario = Number(document.getElementById('venta-precio').value);

  if (!id_producto) { showMessage('msg-venta', 'Selecciona un producto', 'error'); return; }
  if (!cantidad_vendida || cantidad_vendida <= 0) { showMessage('msg-venta', 'Cantidad inválida', 'error'); return; }
  if (!precio_unitario || precio_unitario <= 0) { showMessage('msg-venta', 'Precio inválido', 'error'); return; }

  const producto = productosData.find(function (p) { return p.id_producto === id_producto; });
  const stockDisponible = producto ? producto.stock_actual : 0;

  let cantidadEnCarrito = 0;
  for (let i = 0; i < carrito.length; i++) {
    if (carrito[i].id_producto === id_producto) cantidadEnCarrito += carrito[i].cantidad_vendida;
  }

  if (cantidad_vendida + cantidadEnCarrito > stockDisponible) {
    showMessage('msg-venta', 'Stock insuficiente. Disponible: ' + (stockDisponible - cantidadEnCarrito) + ' unidades', 'error');
    return;
  }

  const existente = carrito.find(function (item) { return item.id_producto === id_producto; });
  if (existente) {
    existente.cantidad_vendida += cantidad_vendida;
    existente.precio_unitario = precio_unitario;
    showMessage('msg-venta', 'Cantidad actualizada en el carrito', 'success');
  } else {
    carrito.push({ id_producto, nombre, cantidad_vendida, precio_unitario, stock_disponible: stockDisponible });
    showMessage('msg-venta', 'Producto agregado al carrito', 'success');
  }

  document.getElementById('venta-producto').value = '';
  document.getElementById('venta-cantidad').value = '';
  document.getElementById('venta-precio').value = '';
  checkVentaFields();
  renderCarrito();
  saveState();
}

function renderCarrito() {
  const container = document.getElementById('carrito-container');
  const tbody = document.getElementById('carrito-body');

  if (carrito.length === 0) { container.style.display = 'none'; return; }

  container.style.display = 'block';
  let total = 0;
  let html = '';

  for (let i = 0; i < carrito.length; i++) {
    const item = carrito[i];
    const subtotal = item.cantidad_vendida * item.precio_unitario;
    total += subtotal;
    const cleanName = getCleanName(item.nombre);

    html += '<tr class="row-animate">';
    html += '<td>' + cleanName + '</td>';
    html += '<td>' + item.cantidad_vendida + '</td>';
    html += '<td>' + formatCLP(item.precio_unitario) + '</td>';
    html += '<td>' + formatCLP(subtotal) + '</td>';
    html += '<td><button class="btn-remove" onclick="quitarDelCarrito(' + i + ')">✕</button></td>';
    html += '</tr>';
  }

  tbody.innerHTML = html;
  document.getElementById('carrito-total').innerHTML = '<strong>' + formatCLP(total) + '</strong>';
}

function quitarDelCarrito(index) {
  var item = carrito[index];
  var name = getCleanName(item.nombre);
  if (!confirm('¿Quitar "' + name + '" del carrito?')) return;
  carrito.splice(index, 1);
  renderCarrito();
  saveState();
}

async function registrarVenta() {
  clearMessage('msg-venta');

  const id_medio_pago = Number(document.getElementById('venta-medio-pago').value);
  if (!id_medio_pago) { showMessage('msg-venta', 'Selecciona un medio de pago', 'error'); return; }
  if (carrito.length === 0) { showMessage('msg-venta', 'El carrito está vacío. Agrega productos primero.', 'error'); return; }

  // Loading state
  var btnVenta = document.getElementById('btn-registrar-venta');
  var btnOrigText = btnVenta.textContent;
  btnVenta.textContent = 'Registrando...';
  btnVenta.disabled = true;

  const detalles = carrito.map(function (item) {
    return { id_producto: item.id_producto, cantidad_vendida: item.cantidad_vendida, precio_unitario: item.precio_unitario };
  });

  // Keep cart items for the receipt before clearing
  var carritoParaRecibo = carrito.slice();

  try {
    const res = await fetch(API_BASE + '/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_medio_pago: id_medio_pago, detalles: detalles })
    });
    const data = await res.json();

    if (res.ok) {
      showMessage('msg-venta', '✔ Venta registrada correctamente. ID: ' + data.id_venta + ' | Total: ' + formatCLP(data.total_venta), 'success');
      // Show receipt modal
      mostrarRecibo(data.id_venta, id_medio_pago, data.total_venta, carritoParaRecibo);
      carrito = [];
      renderCarrito();
      document.getElementById('venta-medio-pago').value = '';
      saveState();
      cargarDropdownProductos();
      updateStockAlert();
    } else {
      showMessage('msg-venta', 'Error: ' + data.error, 'error');
    }
  } catch (err) {
    showMessage('msg-venta', 'Error de conexión: ' + err.message, 'error');
  } finally {
    btnVenta.textContent = btnOrigText;
    btnVenta.disabled = false;
  }
}

// =============================================
// RECEIPT MODAL
// Shows sale details after successful registration.
// =============================================

function mostrarRecibo(idVenta, idMedioPago, totalVenta, items) {
  var operador = document.getElementById('operador-nombre').value || '—';
  var fecha = new Date().toLocaleString('es-CL');
  var medioPago = getMedioPagoText(idMedioPago);

  var html = '<div class="receipt">';
  html += '<h2>🧾 Comprobante de Venta</h2>';
  html += '<div class="receipt-header">';
  html += '<p><strong>Venta ID:</strong> ' + idVenta + '</p>';
  html += '<p><strong>Fecha:</strong> ' + fecha + '</p>';
  html += '<p><strong>Medio de pago:</strong> ' + medioPago + '</p>';
  html += '<p><strong>Operador:</strong> ' + operador + '</p>';
  html += '</div>';

  html += '<table class="receipt-table">';
  html += '<thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>';
  html += '<tbody>';

  var total = 0;
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var subtotal = item.cantidad_vendida * item.precio_unitario;
    total += subtotal;
    var cleanName = getCleanName(item.nombre);
    html += '<tr>';
    html += '<td>' + cleanName + '</td>';
    html += '<td>' + item.cantidad_vendida + '</td>';
    html += '<td>' + formatCLP(item.precio_unitario) + '</td>';
    html += '<td>' + formatCLP(subtotal) + '</td>';
    html += '</tr>';
  }

  html += '</tbody>';
  html += '<tfoot><tr><td colspan="3"><strong>Total</strong></td><td><strong>' + formatCLP(totalVenta) + '</strong></td></tr></tfoot>';
  html += '</table>';
  html += '<p class="receipt-footer">Comprobante interno — No válido como boleta</p>';
  html += '</div>';

  document.getElementById('receipt-body').innerHTML = html;
  document.getElementById('receipt-modal').style.display = 'flex';
}

function cerrarRecibo(event) {
  if (event && event.target && event.target.id !== 'receipt-modal') return;
  document.getElementById('receipt-modal').style.display = 'none';
}

function imprimirRecibo() {
  window.print();
}

// =============================================
// D) INGRESO CART (multi-product)
// =============================================

function agregarAlIngresoCart() {
  clearMessage('msg-ingreso');

  const selectEl = document.getElementById('ingreso-producto');
  const id_producto = Number(selectEl.value);
  const nombre = selectEl.options[selectEl.selectedIndex].textContent;
  const cantidad = Number(document.getElementById('ingreso-cantidad').value);
  const precio = Number(document.getElementById('ingreso-precio').value);

  if (!id_producto) { showMessage('msg-ingreso', 'Selecciona un producto', 'error'); return; }
  if (!cantidad || cantidad <= 0) { showMessage('msg-ingreso', 'Cantidad inválida', 'error'); return; }
  if (precio < 0) { showMessage('msg-ingreso', 'El precio no puede ser negativo', 'error'); return; }

  const existente = carritoIngreso.find(function (item) { return item.id_producto === id_producto; });
  if (existente) {
    existente.cantidad += cantidad;
    existente.precio = precio;
    showMessage('msg-ingreso', 'Cantidad actualizada en el ingreso', 'success');
  } else {
    carritoIngreso.push({ id_producto, nombre, cantidad, precio });
    showMessage('msg-ingreso', 'Producto agregado al ingreso', 'success');
  }

  document.getElementById('ingreso-producto').value = '';
  document.getElementById('ingreso-cantidad').value = '';
  document.getElementById('ingreso-precio').value = '';
  checkIngresoFields();
  renderIngresoCart();
  saveState();
}

function renderIngresoCart() {
  const container = document.getElementById('ingreso-cart-container');
  const tbody = document.getElementById('ingreso-cart-body');

  if (carritoIngreso.length === 0) { container.style.display = 'none'; return; }

  container.style.display = 'block';
  let total = 0;
  let html = '';

  for (let i = 0; i < carritoIngreso.length; i++) {
    const item = carritoIngreso[i];
    const subtotal = item.cantidad * item.precio;
    total += subtotal;
    const cleanName = getCleanName(item.nombre);

    html += '<tr class="row-animate">';
    html += '<td>' + cleanName + '</td>';
    html += '<td>' + item.cantidad + '</td>';
    html += '<td>' + formatCLP(item.precio) + '</td>';
    html += '<td>' + formatCLP(subtotal) + '</td>';
    html += '<td><button class="btn-remove" onclick="quitarDelIngresoCart(' + i + ')">✕</button></td>';
    html += '</tr>';
  }

  tbody.innerHTML = html;
  document.getElementById('ingreso-cart-total').innerHTML = '<strong>' + formatCLP(total) + '</strong>';
}

function quitarDelIngresoCart(index) {
  var item = carritoIngreso[index];
  var name = getCleanName(item.nombre);
  if (!confirm('¿Quitar "' + name + '" del carrito de ingreso?')) return;
  carritoIngreso.splice(index, 1);
  renderIngresoCart();
  saveState();
}

async function registrarIngreso() {
  clearMessage('msg-ingreso');

  const id_interlocutor = Number(document.getElementById('ingreso-interlocutor').value);
  if (!id_interlocutor || id_interlocutor <= 0) {
    showMessage('msg-ingreso', 'Ingresa un ID de proveedor válido', 'error');
    return;
  }
  if (carritoIngreso.length === 0) {
    showMessage('msg-ingreso', 'El carrito de ingreso está vacío. Agrega productos primero.', 'error');
    return;
  }

  // Loading state
  var btnIngreso = document.getElementById('btn-registrar-ingreso');
  var btnOrigText = btnIngreso.textContent;
  btnIngreso.textContent = 'Registrando...';
  btnIngreso.disabled = true;

  const detalles = carritoIngreso.map(function (item) {
    return {
      id_producto: item.id_producto,
      cantidad_ingresada: item.cantidad,
      precio_compra: item.precio,
      estado_recepcion: 'aceptado'
    };
  });

  try {
    const res = await fetch(API_BASE + '/api/ingresos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_interlocutor: id_interlocutor, detalles: detalles })
    });
    const data = await res.json();

    if (res.ok) {
      showMessage('msg-ingreso', '✔ Ingreso registrado correctamente. ID: ' + data.id_ingreso, 'success');
      carritoIngreso = [];
      renderIngresoCart();
      document.getElementById('ingreso-interlocutor').value = '';
      checkIngresoFields();
      saveState();
      cargarDropdownProductos();
      updateStockAlert();
    } else {
      showMessage('msg-ingreso', 'Error: ' + data.error, 'error');
    }
  } catch (err) {
    showMessage('msg-ingreso', 'Error de conexión: ' + err.message, 'error');
  } finally {
    btnIngreso.textContent = btnOrigText;
    btnIngreso.disabled = false;
  }
}

// =============================================
// E) DASHBOARD
// =============================================

async function verDashboard() {
  setResultado('Cargando dashboard...');
  try {
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

    let html = '<h2>📊 Dashboard</h2>';
    html += '<div class="kpi-grid">';
    html += buildKpiCard('📦', data.kpis.productos_activos, 'Productos activos');
    html += buildKpiCard('🛒', data.kpis.total_ventas, 'Ventas realizadas');
    html += buildKpiCard('📥', data.kpis.total_ingresos, 'Ingresos registrados');
    html += buildKpiCard('💰', formatCLP(data.kpis.monto_total_vendido || 0), 'Monto total vendido');
    html += buildKpiCard('⚠️', data.kpis.productos_bajo_stock, 'Productos bajo stock');
    html += '</div>';

    html += '<h3>Ventas</h3>';
    html += '<div class="kpi-grid">';
    html += buildKpiCard('💵', formatCLP(data.ventas.ventas_totales || 0), 'Ventas totales');
    html += buildKpiCard('🧾', data.ventas.numero_ventas || 0, 'Número de ventas');
    html += buildKpiCard('🎫', formatCLP(data.ventas.ticket_promedio || 0), 'Ticket promedio');
    html += '</div>';

    html += '<div class="charts-grid">';
    html += '<div class="chart-card card"><h3>📈 Ventas por día</h3><canvas id="chart-ventas-dia"></canvas></div>';
    html += '<div class="chart-card card"><h3>🏆 Productos más vendidos</h3><canvas id="chart-productos"></canvas></div>';
    html += '</div>';

    if (data.productos_bajo_stock && data.productos_bajo_stock.length > 0) {
      html += '<h3>Productos bajo stock</h3>';
      html += '<table>';
      html += '<tr><th>Nombre</th><th>Stock actual</th><th>Stock mínimo</th><th>Déficit</th><th>Estado</th></tr>';
      for (const p of data.productos_bajo_stock) {
        html += '<tr>';
        html += '<td>' + p.nombre + '</td>';
        html += '<td>' + p.stock_actual + '</td>';
        html += '<td>' + p.stock_minimo + '</td>';
        html += '<td>' + p.deficit + '</td>';
        html += '<td>' + getStockBadge(p.stock_actual, p.stock_minimo) + '</td>';
        html += '</tr>';
      }
      html += '</table>';
    }

    if (data.mas_vendidos && data.mas_vendidos.length > 0) {
      html += '<h3 style="margin-top:16px;">Productos más vendidos</h3>';
      html += '<table>';
      html += '<tr><th>Nombre</th><th>Total vendido</th></tr>';
      for (const p of data.mas_vendidos) {
        html += '<tr><td>' + p.nombre + '</td><td>' + p.total_vendido + '</td></tr>';
      }
      html += '</table>';
    }

    setResultado(html);
    renderCharts(ventas);
  } catch (err) {
    setResultado('<p class="error">Error de conexión: ' + err.message + '</p>');
  }
}

function renderCharts(ventas) {
  if (chartVentasDia) { chartVentasDia.destroy(); chartVentasDia = null; }
  if (chartProductos) { chartProductos.destroy(); chartProductos = null; }

  // ---- Chart 1: Ventas por día (line chart) ----
  const ventasPorDia = {};
  for (const v of ventas) {
    const isoDate = v.fecha_venta.substring(0, 10);
    if (!ventasPorDia[isoDate]) ventasPorDia[isoDate] = 0;
    ventasPorDia[isoDate] += Number(v.total_venta);
  }

  const sortedDates = Object.keys(ventasPorDia).sort();
  const fechasDisplay = sortedDates.map(function (d) {
    const parts = d.split('-');
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  });
  const totalesDia = sortedDates.map(function (d) { return ventasPorDia[d]; });

  const ctxDia = document.getElementById('chart-ventas-dia');
  if (ctxDia) {
    chartVentasDia = new Chart(ctxDia, {
      type: 'line',
      data: {
        labels: fechasDisplay,
        datasets: [{
          label: 'Total vendido',
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
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (items) { return 'Fecha: ' + items[0].label; },
              label: function (item) { return formatCLP(item.raw); }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: function (v) { return formatCLP(v); } }
          }
        }
      }
    });
  }

  // ---- Chart 2: Productos más vendidos (bar chart) ----
  const productosTotales = {};
  for (const v of ventas) {
    for (const d of v.detalles) {
      if (!productosTotales[d.producto]) productosTotales[d.producto] = 0;
      productosTotales[d.producto] += Number(d.cantidad_vendida);
    }
  }

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
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (item) { return item.label + ': ' + item.raw + ' unidades'; }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }
}

function buildKpiCard(icon, value, label) {
  return '<div class="kpi-card">'
    + '<div class="kpi-icon">' + icon + '</div>'
    + '<div class="kpi-value">' + value + '</div>'
    + '<div class="kpi-label">' + label + '</div>'
    + '</div>';
}

// =============================================
// F) SALES HISTORY
// =============================================

async function verHistorialVentas() {
  await cargarVentas('');
}

async function filtrarVentas() {
  const desde = document.getElementById('filtro-desde').value;
  const hasta = document.getElementById('filtro-hasta').value;
  saveState();
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

    let html = '<h2>🕐 Historial de Ventas (' + data.length + ')</h2>';
    html += '<table>';
    html += '<tr><th>ID</th><th>Fecha</th><th>Medio de pago</th><th>Productos vendidos</th><th>Total</th></tr>';

    for (const venta of data) {
      const productosTexto = venta.detalles.map(function (d) {
        return d.producto + ' x' + d.cantidad_vendida + ' (' + formatCLP(d.subtotal) + ')';
      }).join(', ');

      const fecha = new Date(venta.fecha_venta).toLocaleString('es-CL');

      html += '<tr>';
      html += '<td>' + venta.id_venta + '</td>';
      html += '<td>' + fecha + '</td>';
      html += '<td>' + venta.medio_pago + '</td>';
      html += '<td>' + productosTexto + '</td>';
      html += '<td>' + formatCLP(venta.total_venta) + '</td>';
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
      rows.push([venta.id_venta, fecha, venta.medio_pago, d.producto, d.cantidad_vendida, d.precio_unitario, d.subtotal, venta.total_venta]);
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
// =============================================

document.addEventListener('DOMContentLoaded', function () {
  restoreState();
  cargarDropdownProductos();
  updateStockAlert();

  // Venta form events
  document.getElementById('venta-producto').addEventListener('change', onVentaProductoChange);
  document.getElementById('venta-producto').addEventListener('change', checkVentaFields);
  document.getElementById('venta-cantidad').addEventListener('input', checkVentaFields);
  document.getElementById('venta-precio').addEventListener('input', checkVentaFields);

  // Ingreso form events
  document.getElementById('ingreso-producto').addEventListener('change', checkIngresoFields);
  document.getElementById('ingreso-cantidad').addEventListener('input', checkIngresoFields);
  document.getElementById('ingreso-precio').addEventListener('input', checkIngresoFields);

  // Save operator name and payment method on change
  document.getElementById('operador-nombre').addEventListener('input', saveState);
  document.getElementById('venta-medio-pago').addEventListener('change', saveState);
  document.getElementById('filtro-desde').addEventListener('change', saveState);
  document.getElementById('filtro-hasta').addEventListener('change', saveState);
});
