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
let ultimosIngresos = [];
let productosData = [];
let categoriasData = [];
let ingresosData = [];

// Chart instances
let chartVentasDia = null;
let chartProductos = null;
let chartCategorias = null;
let chartRentabilidad = null;

// Prevent double-click submissions
let isSubmitting = false;

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function showToast(text, type) {
  var container = document.getElementById('toast-container');
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'info');
  toast.textContent = text;
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('toast-fade-out');
    setTimeout(function () { toast.remove(); }, 400);
  }, 3500);
}

// =============================================
// LOCALSTORAGE PERSISTENCE
// =============================================

var LS_KEYS = {
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
  } catch (e) { /* ignore */ }
}

function restoreState() {
  try {
    var savedCarrito = localStorage.getItem(LS_KEYS.CARRITO);
    if (savedCarrito) carrito = JSON.parse(savedCarrito);

    var savedIngresoCart = localStorage.getItem(LS_KEYS.CARRITO_INGRESO);
    if (savedIngresoCart) carritoIngreso = JSON.parse(savedIngresoCart);

    var desde = localStorage.getItem(LS_KEYS.FILTRO_DESDE);
    if (desde) document.getElementById('filtro-desde').value = desde;

    var hasta = localStorage.getItem(LS_KEYS.FILTRO_HASTA);
    if (hasta) document.getElementById('filtro-hasta').value = hasta;

    var medioPago = localStorage.getItem(LS_KEYS.MEDIO_PAGO);
    if (medioPago) document.getElementById('venta-medio-pago').value = medioPago;

    var operador = localStorage.getItem(LS_KEYS.OPERADOR);
    if (operador) document.getElementById('operador-nombre').value = operador;

    renderCarrito();
    renderIngresoCart();
  } catch (e) { /* ignore */ }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function showMessage(elementId, text, type) {
  var el = document.getElementById(elementId);
  el.textContent = text;
  el.className = 'msg ' + type + ' msg-animate';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearMessage(elementId) {
  var el = document.getElementById(elementId);
  el.textContent = '';
  el.className = 'msg';
}

function setResultado(html) {
  var el = document.getElementById('resultado');
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
  var parts = fullText.split(' — ');
  return parts.length > 1 ? parts[1].split(' (')[0] : fullText;
}

function getMedioPagoText(id) {
  var names = { '1': 'Efectivo', '2': 'Tarjeta', '3': 'Transferencia' };
  return names[String(id)] || 'Medio #' + id;
}

// =============================================
// MODAL KEYBOARD HANDLER
// =============================================

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (document.getElementById('receipt-modal').style.display === 'flex') cerrarRecibo();
    if (document.getElementById('edit-modal').style.display === 'flex') cerrarEditModal();
    if (document.getElementById('create-modal').style.display === 'flex') cerrarCreateModal();
  }
});

// =============================================
// STOCK ALERT BANNER
// =============================================

async function updateStockAlert() {
  try {
    var res = await fetch(API_BASE + '/api/productos');
    var data = await res.json();
    if (!res.ok) return;

    productosData = data;
    var critico = 0;
    var bajo = 0;
    for (var i = 0; i < data.length; i++) {
      var p = data[i];
      if (!p.activo) continue;
      if (p.stock_actual <= Math.floor(p.stock_minimo / 2)) {
        critico++;
      } else if (p.stock_actual <= p.stock_minimo) {
        bajo++;
      }
    }

    var banner = document.getElementById('stock-alert');
    if (critico > 0 || bajo > 0) {
      var text = '⚠️ ';
      var parts = [];
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
  } catch (err) { /* ignore */ }
}

// =============================================
// FORM VALIDATION STATE
// =============================================

function checkVentaFields() {
  var producto = document.getElementById('venta-producto').value;
  var cantidad = document.getElementById('venta-cantidad').value;
  var precio = document.getElementById('venta-precio').value;
  document.getElementById('btn-agregar-carrito').disabled = !(producto && cantidad && precio);
}

function checkIngresoFields() {
  var producto = document.getElementById('ingreso-producto').value;
  var cantidad = document.getElementById('ingreso-cantidad').value;
  var precio = document.getElementById('ingreso-precio').value;
  document.getElementById('btn-agregar-ingreso').disabled = !(producto && cantidad && precio);
}

// =============================================
// PRODUCT DROPDOWNS
// =============================================

async function cargarDropdownProductos() {
  try {
    var res = await fetch(API_BASE + '/api/productos');
    var data = await res.json();
    if (!res.ok) return;

    productosData = data;

    var options = [];
    for (var i = 0; i < data.length; i++) {
      var p = data[i];
      if (!p.activo) continue;
      var indicator = getStockIndicator(p.stock_actual, p.stock_minimo);
      options.push('<option value="' + p.id_producto + '" data-stock="' + p.stock_actual + '" data-minimo="' + p.stock_minimo + '" data-precio="' + p.precio_venta + '">'
        + indicator + ' ' + p.id_producto + ' — ' + p.nombre
        + ' (Stock: ' + p.stock_actual + ', ' + formatCLP(p.precio_venta) + ')'
        + '</option>');
    }

    var optionsHtml = '<option value="">-- Seleccionar producto --</option>' + options.join('');
    document.getElementById('venta-producto').innerHTML = optionsHtml;
    document.getElementById('ingreso-producto').innerHTML = optionsHtml;

    checkVentaFields();
    checkIngresoFields();
  } catch (err) {
    var fallback = '<option value="">-- Error al cargar productos --</option>';
    document.getElementById('venta-producto').innerHTML = fallback;
    document.getElementById('ingreso-producto').innerHTML = fallback;
  }
}

async function cargarCategorias() {
  try {
    var res = await fetch(API_BASE + '/api/productos/categorias');
    var data = await res.json();
    if (!res.ok) return;
    categoriasData = data;
  } catch (err) { /* ignore */ }
}

function onVentaProductoChange() {
  var select = document.getElementById('venta-producto');
  var option = select.options[select.selectedIndex];
  if (option && option.value) {
    var precio = option.getAttribute('data-precio');
    if (precio) document.getElementById('venta-precio').value = precio;
    document.getElementById('venta-cantidad').focus();
  }
  checkVentaFields();
}

// =============================================
// A) PRODUCTS VIEW — with edit/toggle/create
// =============================================

async function cargarProductos() {
  setResultado('<div class="loading-spinner"></div> Cargando productos...');
  try {
    var res = await fetch(API_BASE + '/api/productos');
    var data = await res.json();

    if (!res.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudieron cargar los productos') + '</p>');
      return;
    }
    if (data.length === 0) {
      setResultado('<div class="empty-state"><p>📦 No hay productos registrados.</p><button class="btn-action btn-toggle-on" onclick="abrirCreateModal()">➕ Agregar primer producto</button></div>');
      return;
    }

    productosData = data;

    var html = '<div class="section-header"><h2>Productos</h2><button class="btn-action btn-toggle-on" onclick="abrirCreateModal()">➕ Agregar producto</button></div>';
    html += '<table>';
    html += '<tr><th>ID</th><th>Nombre</th><th>Precio venta</th><th>Stock actual</th><th>Stock mín.</th><th>Categoría</th><th>Estado</th><th>Acciones</th></tr>';
    for (var i = 0; i < data.length; i++) {
      var p = data[i];
      var stockBadge = getStockBadge(p.stock_actual, p.stock_minimo);
      var activoBadge = p.activo
        ? '<span class="badge badge-success">Activo</span>'
        : '<span class="badge badge-danger">Inactivo</span>';
      var toggleLabel = p.activo ? 'Desactivar' : 'Activar';
      var toggleClass = p.activo ? 'btn-toggle-off' : 'btn-toggle-on';

      html += '<tr>';
      html += '<td>' + p.id_producto + '</td>';
      html += '<td>' + p.nombre + '</td>';
      html += '<td>' + formatCLP(p.precio_venta) + '</td>';
      html += '<td>' + p.stock_actual + ' ' + stockBadge + '</td>';
      html += '<td>' + p.stock_minimo + '</td>';
      html += '<td>' + (p.categoria || '—') + '</td>';
      html += '<td>' + activoBadge + '</td>';
      html += '<td class="actions-cell">';
      html += '<button class="btn-action btn-edit" onclick="abrirEditModal(' + p.id_producto + ')">✏️ Editar</button>';
      html += '<button class="btn-action ' + toggleClass + '" onclick="toggleProducto(' + p.id_producto + ')">' + toggleLabel + '</button>';
      html += '</td>';
      html += '</tr>';
    }
    html += '</table>';
    setResultado(html);
  } catch (err) {
    setResultado('<p class="error">Error de conexión: ' + err.message + '</p>');
  }
}

// =============================================
// PRODUCT EDIT MODAL
// =============================================

async function abrirEditModal(id) {
  var producto = productosData.find(function (p) { return p.id_producto === id; });
  if (!producto) return;

  if (categoriasData.length === 0) await cargarCategorias();

  document.getElementById('edit-id').value = id;
  document.getElementById('edit-nombre').value = producto.nombre;
  document.getElementById('edit-precio').value = producto.precio_venta;
  document.getElementById('edit-stock-min').value = producto.stock_minimo;

  var catSelect = document.getElementById('edit-categoria');
  var catHtml = '';
  for (var i = 0; i < categoriasData.length; i++) {
    var c = categoriasData[i];
    var selected = c.id_categoria === producto.id_categoria ? ' selected' : '';
    catHtml += '<option value="' + c.id_categoria + '"' + selected + '>' + c.nombre + '</option>';
  }
  catSelect.innerHTML = catHtml;

  clearMessage('msg-edit');
  document.getElementById('edit-modal').style.display = 'flex';
  document.getElementById('edit-nombre').focus();
}

function cerrarEditModal(event) {
  if (event && event.target && event.target.id !== 'edit-modal') return;
  document.getElementById('edit-modal').style.display = 'none';
}

async function guardarEdicionProducto() {
  clearMessage('msg-edit');

  var id = Number(document.getElementById('edit-id').value);
  var nombre = document.getElementById('edit-nombre').value.trim();
  var precio_venta = Number(document.getElementById('edit-precio').value);
  var stock_minimo = Number(document.getElementById('edit-stock-min').value);
  var id_categoria = Number(document.getElementById('edit-categoria').value);

  if (!nombre) { showMessage('msg-edit', 'El nombre es obligatorio', 'error'); return; }
  if (isNaN(precio_venta) || precio_venta < 0) { showMessage('msg-edit', 'El precio debe ser >= 0', 'error'); return; }
  if (isNaN(stock_minimo) || stock_minimo < 0) { showMessage('msg-edit', 'El stock mínimo debe ser >= 0', 'error'); return; }
  if (!id_categoria) { showMessage('msg-edit', 'Selecciona una categoría', 'error'); return; }

  var btn = document.getElementById('btn-guardar-edit');
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  try {
    var res = await fetch(API_BASE + '/api/productos/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre, precio_venta: precio_venta, stock_minimo: stock_minimo, id_categoria: id_categoria })
    });
    var data = await res.json();

    if (res.ok) {
      showToast('Producto actualizado correctamente', 'success');
      document.getElementById('edit-modal').style.display = 'none';
      cargarProductos();
      cargarDropdownProductos();
      updateStockAlert();
    } else {
      showMessage('msg-edit', 'Error: ' + data.error, 'error');
    }
  } catch (err) {
    showMessage('msg-edit', 'Error de conexión: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Guardar cambios';
    btn.disabled = false;
  }
}

async function toggleProducto(id) {
  var producto = productosData.find(function (p) { return p.id_producto === id; });
  if (!producto) return;

  var action = producto.activo ? 'desactivar' : 'activar';
  if (!confirm('¿' + action.charAt(0).toUpperCase() + action.slice(1) + ' "' + producto.nombre + '"?')) return;

  try {
    var res = await fetch(API_BASE + '/api/productos/' + id + '/toggle', { method: 'PATCH' });
    var data = await res.json();

    if (res.ok) {
      showToast(data.message, 'success');
      cargarProductos();
      cargarDropdownProductos();
    } else {
      showToast('Error: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Error de conexión: ' + err.message, 'error');
  }
}

// =============================================
// CREATE PRODUCT MODAL
// =============================================

async function abrirCreateModal() {
  if (categoriasData.length === 0) await cargarCategorias();

  document.getElementById('create-nombre').value = '';
  document.getElementById('create-descripcion').value = '';
  document.getElementById('create-precio').value = '';
  document.getElementById('create-stock-min').value = '';
  document.getElementById('create-unidad-venta').value = '';
  document.getElementById('create-unidad-compra').value = '';
  document.getElementById('create-factor').value = '1';
  document.getElementById('create-activo').value = '1';

  var catSelect = document.getElementById('create-categoria');
  var catHtml = '<option value="">-- Seleccionar --</option>';
  for (var i = 0; i < categoriasData.length; i++) {
    var c = categoriasData[i];
    catHtml += '<option value="' + c.id_categoria + '">' + c.nombre + '</option>';
  }
  catSelect.innerHTML = catHtml;

  clearMessage('msg-create');
  document.getElementById('create-modal').style.display = 'flex';
  document.getElementById('create-nombre').focus();
}

function cerrarCreateModal(event) {
  if (event && event.target && event.target.id !== 'create-modal') return;
  document.getElementById('create-modal').style.display = 'none';
}

async function crearProducto() {
  clearMessage('msg-create');

  var nombre = document.getElementById('create-nombre').value.trim();
  var descripcion = document.getElementById('create-descripcion').value.trim();
  var precio_venta = Number(document.getElementById('create-precio').value);
  var stock_minimo = Number(document.getElementById('create-stock-min').value);
  var unidad_venta = document.getElementById('create-unidad-venta').value.trim();
  var unidad_compra = document.getElementById('create-unidad-compra').value.trim();
  var factor_conversion = Number(document.getElementById('create-factor').value);
  var id_categoria = Number(document.getElementById('create-categoria').value);
  var activo = document.getElementById('create-activo').value === '1';

  if (!nombre) { showMessage('msg-create', 'El nombre es obligatorio', 'error'); return; }
  if (isNaN(precio_venta) || precio_venta < 0) { showMessage('msg-create', 'El precio debe ser >= 0', 'error'); return; }
  if (isNaN(stock_minimo) || stock_minimo < 0) { showMessage('msg-create', 'El stock mínimo debe ser >= 0', 'error'); return; }
  if (!unidad_venta) { showMessage('msg-create', 'La unidad de venta es obligatoria', 'error'); return; }
  if (!unidad_compra) { showMessage('msg-create', 'La unidad de compra es obligatoria', 'error'); return; }
  if (isNaN(factor_conversion) || factor_conversion <= 0) { showMessage('msg-create', 'El factor de conversión debe ser > 0', 'error'); return; }
  if (!id_categoria) { showMessage('msg-create', 'Selecciona una categoría', 'error'); return; }

  var btn = document.getElementById('btn-crear-producto');
  btn.textContent = 'Creando...';
  btn.disabled = true;

  try {
    var res = await fetch(API_BASE + '/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre,
        descripcion: descripcion || null,
        precio_venta: precio_venta,
        stock_minimo: stock_minimo,
        unidad_venta: unidad_venta,
        unidad_compra: unidad_compra,
        factor_conversion: factor_conversion,
        activo: activo,
        id_categoria: id_categoria
      })
    });
    var data = await res.json();

    if (res.ok) {
      showToast('Producto creado: ' + nombre, 'success');
      document.getElementById('create-modal').style.display = 'none';
      cargarProductos();
      cargarDropdownProductos();
      updateStockAlert();
    } else {
      showMessage('msg-create', 'Error: ' + data.error, 'error');
    }
  } catch (err) {
    showMessage('msg-create', 'Error de conexión: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Añadir producto';
    btn.disabled = false;
  }
}

// =============================================
// B) LOW STOCK VIEW
// =============================================

async function verBajoStock() {
  setResultado('<div class="loading-spinner"></div> Cargando productos bajo stock...');
  try {
    var res = await fetch(API_BASE + '/api/productos/bajo-stock');
    var data = await res.json();

    if (!res.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudo consultar') + '</p>');
      return;
    }
    if (data.length === 0) {
      setResultado('<div class="empty-state"><p>✅ Todos los productos tienen stock suficiente.</p></div>');
      return;
    }

    var html = '<h2>⚠️ Productos bajo stock mínimo</h2>';
    html += '<table>';
    html += '<tr><th>Nombre</th><th>Stock actual</th><th>Stock mínimo</th><th>Déficit</th><th>Estado</th></tr>';
    for (var i = 0; i < data.length; i++) {
      var p = data[i];
      var stockBadge = getStockBadge(p.stock_actual, p.stock_minimo);
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

  var selectEl = document.getElementById('venta-producto');
  var id_producto = Number(selectEl.value);
  var nombre = selectEl.options[selectEl.selectedIndex].textContent;
  var cantidad_vendida = Number(document.getElementById('venta-cantidad').value);
  var precio_unitario = Number(document.getElementById('venta-precio').value);

  if (!id_producto) { showMessage('msg-venta', 'Selecciona un producto', 'error'); return; }
  if (!cantidad_vendida || cantidad_vendida <= 0) { showMessage('msg-venta', 'Cantidad inválida', 'error'); return; }
  if (!precio_unitario || precio_unitario <= 0) { showMessage('msg-venta', 'Precio inválido', 'error'); return; }

  var producto = productosData.find(function (p) { return p.id_producto === id_producto; });
  var stockDisponible = producto ? producto.stock_actual : 0;

  var cantidadEnCarrito = 0;
  for (var i = 0; i < carrito.length; i++) {
    if (carrito[i].id_producto === id_producto) cantidadEnCarrito += carrito[i].cantidad_vendida;
  }

  if (cantidad_vendida + cantidadEnCarrito > stockDisponible) {
    showMessage('msg-venta', 'Stock insuficiente. Disponible: ' + (stockDisponible - cantidadEnCarrito) + ' unidades', 'error');
    return;
  }

  var existente = carrito.find(function (item) { return item.id_producto === id_producto; });
  if (existente) {
    existente.cantidad_vendida += cantidad_vendida;
    existente.precio_unitario = precio_unitario;
    showMessage('msg-venta', 'Cantidad actualizada en el carrito', 'success');
  } else {
    carrito.push({ id_producto: id_producto, nombre: nombre, cantidad_vendida: cantidad_vendida, precio_unitario: precio_unitario, stock_disponible: stockDisponible });
    showMessage('msg-venta', 'Producto agregado al carrito', 'success');
  }

  document.getElementById('venta-producto').value = '';
  document.getElementById('venta-cantidad').value = '';
  document.getElementById('venta-precio').value = '';
  checkVentaFields();
  renderCarrito();
  saveState();
  document.getElementById('venta-producto').focus();
}

function renderCarrito() {
  var container = document.getElementById('carrito-container');
  var tbody = document.getElementById('carrito-body');

  if (carrito.length === 0) { container.style.display = 'none'; return; }

  container.style.display = 'block';
  var total = 0;
  var html = '';

  for (var i = 0; i < carrito.length; i++) {
    var item = carrito[i];
    var subtotal = item.cantidad_vendida * item.precio_unitario;
    total += subtotal;
    var cleanName = getCleanName(item.nombre);

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
  if (isSubmitting) return;
  clearMessage('msg-venta');

  var id_medio_pago = Number(document.getElementById('venta-medio-pago').value);
  if (!id_medio_pago) { showMessage('msg-venta', 'Selecciona un medio de pago', 'error'); return; }
  if (carrito.length === 0) { showMessage('msg-venta', 'El carrito está vacío. Agrega productos primero.', 'error'); return; }

  isSubmitting = true;
  var btnVenta = document.getElementById('btn-registrar-venta');
  var btnOrigText = btnVenta.textContent;
  btnVenta.textContent = 'Registrando...';
  btnVenta.disabled = true;

  var detalles = carrito.map(function (item) {
    return { id_producto: item.id_producto, cantidad_vendida: item.cantidad_vendida, precio_unitario: item.precio_unitario };
  });

  var carritoParaRecibo = carrito.slice();

  try {
    var res = await fetch(API_BASE + '/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_medio_pago: id_medio_pago, detalles: detalles })
    });
    var data = await res.json();

    if (res.ok) {
      showMessage('msg-venta', '✔ Venta registrada correctamente. ID: ' + data.id_venta + ' | Total: ' + formatCLP(data.total_venta), 'success');
      mostrarRecibo(data.id_venta, id_medio_pago, data.total_venta, carritoParaRecibo);
      carrito = [];
      renderCarrito();
      document.getElementById('venta-medio-pago').value = '';
      saveState();
      var oldProds = productosData.slice();
      await cargarDropdownProductos();
      updateStockAlert();
      checkStockAfterSale(carritoParaRecibo, oldProds);
    } else {
      showMessage('msg-venta', 'Error: ' + data.error, 'error');
    }
  } catch (err) {
    showMessage('msg-venta', 'Error de conexión: ' + err.message, 'error');
  } finally {
    btnVenta.textContent = btnOrigText;
    btnVenta.disabled = false;
    isSubmitting = false;
  }
}

// Smart stock alert after sale
function checkStockAfterSale(items, oldProds) {
  for (var i = 0; i < items.length; i++) {
    var soldItem = items[i];
    var current = productosData.find(function (p) { return p.id_producto === soldItem.id_producto; });
    if (!current) continue;
    var cleanName = getCleanName(soldItem.nombre);
    if (current.stock_actual <= Math.floor(current.stock_minimo / 2)) {
      showToast('🔴 ' + cleanName + ' quedó en stock CRÍTICO (' + current.stock_actual + ')', 'error');
    } else if (current.stock_actual <= current.stock_minimo) {
      showToast('⚠️ ' + cleanName + ' quedó bajo stock (' + current.stock_actual + ')', 'warning');
    }
  }
}

// Smart stock alert after ingreso (recovery)
function checkStockAfterIngreso(items, oldProds) {
  for (var i = 0; i < items.length; i++) {
    var ingresoItem = items[i];
    var current = productosData.find(function (p) { return p.id_producto === ingresoItem.id_producto; });
    var old = oldProds.find(function (p) { return p.id_producto === ingresoItem.id_producto; });
    if (!current || !old) continue;
    var cleanName = getCleanName(ingresoItem.nombre);
    var wasLow = old.stock_actual <= old.stock_minimo;
    var isNowOk = current.stock_actual > current.stock_minimo;
    if (wasLow && isNowOk) {
      showToast('✅ ' + cleanName + ' volvió a stock OK (' + current.stock_actual + ')', 'success');
    }
  }
}

// =============================================
// RECEIPT MODAL
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

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var subtotal = item.cantidad_vendida * item.precio_unitario;
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

  var selectEl = document.getElementById('ingreso-producto');
  var id_producto = Number(selectEl.value);
  var nombre = selectEl.options[selectEl.selectedIndex].textContent;
  var cantidad = Number(document.getElementById('ingreso-cantidad').value);
  var precio = Number(document.getElementById('ingreso-precio').value);

  if (!id_producto) { showMessage('msg-ingreso', 'Selecciona un producto', 'error'); return; }
  if (!cantidad || cantidad <= 0) { showMessage('msg-ingreso', 'Cantidad inválida', 'error'); return; }
  if (precio < 0) { showMessage('msg-ingreso', 'El precio no puede ser negativo', 'error'); return; }

  var existente = carritoIngreso.find(function (item) { return item.id_producto === id_producto; });
  if (existente) {
    existente.cantidad += cantidad;
    existente.precio = precio;
    showMessage('msg-ingreso', 'Cantidad actualizada en el ingreso', 'success');
  } else {
    carritoIngreso.push({ id_producto: id_producto, nombre: nombre, cantidad: cantidad, precio: precio });
    showMessage('msg-ingreso', 'Producto agregado al ingreso', 'success');
  }

  document.getElementById('ingreso-producto').value = '';
  document.getElementById('ingreso-cantidad').value = '';
  document.getElementById('ingreso-precio').value = '';
  checkIngresoFields();
  renderIngresoCart();
  saveState();
  document.getElementById('ingreso-producto').focus();
}

function renderIngresoCart() {
  var container = document.getElementById('ingreso-cart-container');
  var tbody = document.getElementById('ingreso-cart-body');

  if (carritoIngreso.length === 0) { container.style.display = 'none'; return; }

  container.style.display = 'block';
  var total = 0;
  var html = '';

  for (var i = 0; i < carritoIngreso.length; i++) {
    var item = carritoIngreso[i];
    var subtotal = item.cantidad * item.precio;
    total += subtotal;
    var cleanName = getCleanName(item.nombre);

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
  if (isSubmitting) return;
  clearMessage('msg-ingreso');

  var id_interlocutor = Number(document.getElementById('ingreso-interlocutor').value);
  if (!id_interlocutor || id_interlocutor <= 0) {
    showMessage('msg-ingreso', 'Ingresa un ID de proveedor válido', 'error');
    return;
  }
  if (carritoIngreso.length === 0) {
    showMessage('msg-ingreso', 'El carrito de ingreso está vacío. Agrega productos primero.', 'error');
    return;
  }

  isSubmitting = true;
  var btnIngreso = document.getElementById('btn-registrar-ingreso');
  var btnOrigText = btnIngreso.textContent;
  btnIngreso.textContent = 'Registrando...';
  btnIngreso.disabled = true;

  var detalles = carritoIngreso.map(function (item) {
    return {
      id_producto: item.id_producto,
      cantidad_ingresada: item.cantidad,
      precio_compra: item.precio,
      estado_recepcion: 'aceptado'
    };
  });

  var carritoParaAlerta = carritoIngreso.slice();

  try {
    var res = await fetch(API_BASE + '/api/ingresos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_interlocutor: id_interlocutor, detalles: detalles })
    });
    var data = await res.json();

    if (res.ok) {
      showMessage('msg-ingreso', '✔ Ingreso registrado correctamente. ID: ' + data.id_ingreso, 'success');
      carritoIngreso = [];
      renderIngresoCart();
      document.getElementById('ingreso-interlocutor').value = '';
      checkIngresoFields();
      saveState();
      var oldProds = productosData.slice();
      await cargarDropdownProductos();
      updateStockAlert();
      checkStockAfterIngreso(carritoParaAlerta, oldProds);
    } else {
      showMessage('msg-ingreso', 'Error: ' + data.error, 'error');
    }
  } catch (err) {
    showMessage('msg-ingreso', 'Error de conexión: ' + err.message, 'error');
  } finally {
    btnIngreso.textContent = btnOrigText;
    btnIngreso.disabled = false;
    isSubmitting = false;
  }
}

// =============================================
// E) DASHBOARD — with margin, profitability
// =============================================

async function verDashboard() {
  setResultado('<div class="loading-spinner"></div> Cargando dashboard...');
  try {
    var results = await Promise.all([
      fetch(API_BASE + '/api/dashboard'),
      fetch(API_BASE + '/api/ventas'),
      fetch(API_BASE + '/api/ingresos')
    ]);

    var resDash = results[0];
    var resVentas = results[1];
    var resIngresos = results[2];

    var data = await resDash.json();
    var ventas = resVentas.ok ? await resVentas.json() : [];
    var ingresos = resIngresos.ok ? await resIngresos.json() : [];

    ingresosData = ingresos;

    if (!resDash.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudo cargar el dashboard') + '</p>');
      return;
    }

    // Calculate revenue per product
    var revenueByProduct = {};
    var qtyByProduct = {};
    for (var v = 0; v < ventas.length; v++) {
      var detalles = ventas[v].detalles;
      for (var d = 0; d < detalles.length; d++) {
        var det = detalles[d];
        if (!revenueByProduct[det.producto]) revenueByProduct[det.producto] = 0;
        if (!qtyByProduct[det.producto]) qtyByProduct[det.producto] = 0;
        revenueByProduct[det.producto] += Number(det.subtotal);
        qtyByProduct[det.producto] += Number(det.cantidad_vendida);
      }
    }

    // Calculate average purchase price per product from ingresos
    var costByProduct = {};
    var costCountByProduct = {};
    for (var ig = 0; ig < ingresos.length; ig++) {
      var igDets = ingresos[ig].detalles;
      for (var igd = 0; igd < igDets.length; igd++) {
        var igd2 = igDets[igd];
        if (!costByProduct[igd2.producto]) { costByProduct[igd2.producto] = 0; costCountByProduct[igd2.producto] = 0; }
        costByProduct[igd2.producto] += Number(igd2.precio_compra || 0) * Number(igd2.cantidad_ingresada);
        costCountByProduct[igd2.producto] += Number(igd2.cantidad_ingresada);
      }
    }

    // Average cost per unit
    var avgCostPerUnit = {};
    for (var pName in costByProduct) {
      avgCostPerUnit[pName] = costCountByProduct[pName] > 0 ? costByProduct[pName] / costCountByProduct[pName] : 0;
    }

    // Estimated cost of goods sold
    var totalRevenue = 0;
    var totalEstCost = 0;
    var profitByProduct = {};
    for (var pn in revenueByProduct) {
      totalRevenue += revenueByProduct[pn];
      var estCost = (avgCostPerUnit[pn] || 0) * (qtyByProduct[pn] || 0);
      totalEstCost += estCost;
      profitByProduct[pn] = revenueByProduct[pn] - estCost;
    }
    var estimatedMargin = totalRevenue - totalEstCost;

    // Top product by revenue
    var topProducto = '—';
    var topRevenue = 0;
    for (var pName2 in revenueByProduct) {
      if (revenueByProduct[pName2] > topRevenue) {
        topRevenue = revenueByProduct[pName2];
        topProducto = pName2;
      }
    }

    var html = '<h2>📊 Dashboard</h2>';
    html += '<div class="kpi-grid">';
    html += buildKpiCard('📦', data.kpis.productos_activos, 'Productos activos');
    html += buildKpiCard('🛒', data.kpis.total_ventas, 'Ventas realizadas');
    html += buildKpiCard('📥', data.kpis.total_ingresos, 'Ingresos registrados');
    html += buildKpiCard('💰', formatCLP(data.kpis.monto_total_vendido || 0), 'Monto total vendido');
    html += buildKpiCard('⚠️', data.kpis.productos_bajo_stock, 'Productos bajo stock');
    html += buildKpiCard('🏆', topProducto, 'Más rentable (' + formatCLP(topRevenue) + ')');
    html += '</div>';

    html += '<div class="kpi-grid">';
    html += buildKpiCard('💵', formatCLP(data.ventas.ventas_totales || 0), 'Ventas totales');
    html += buildKpiCard('🧾', data.ventas.numero_ventas || 0, 'Número de ventas');
    html += buildKpiCard('🎫', formatCLP(data.ventas.ticket_promedio || 0), 'Ticket promedio');
    html += buildKpiCard('💹', formatCLP(estimatedMargin), 'Ganancia estimada *');
    html += '</div>';
    html += '<p class="margin-note">* Margen estimado usando precio promedio de compra de los ingresos registrados. No es un cálculo contable exacto.</p>';

    html += '<div class="charts-grid">';
    html += '<div class="chart-card card"><h3>📈 Ventas por día</h3><canvas id="chart-ventas-dia"></canvas></div>';
    html += '<div class="chart-card card"><h3>🏆 Ingresos por producto</h3><canvas id="chart-productos"></canvas></div>';
    html += '<div class="chart-card card"><h3>📂 Ventas por categoría</h3><canvas id="chart-categorias"></canvas></div>';
    html += '<div class="chart-card card"><h3>💹 Rentabilidad estimada</h3><canvas id="chart-rentabilidad"></canvas></div>';
    html += '</div>';

    if (data.productos_bajo_stock && data.productos_bajo_stock.length > 0) {
      html += '<h3>Productos bajo stock</h3>';
      html += '<table>';
      html += '<tr><th>Nombre</th><th>Stock actual</th><th>Stock mínimo</th><th>Déficit</th><th>Estado</th></tr>';
      for (var pb = 0; pb < data.productos_bajo_stock.length; pb++) {
        var p = data.productos_bajo_stock[pb];
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
      for (var pm = 0; pm < data.mas_vendidos.length; pm++) {
        html += '<tr><td>' + data.mas_vendidos[pm].nombre + '</td><td>' + data.mas_vendidos[pm].total_vendido + '</td></tr>';
      }
      html += '</table>';
    }

    setResultado(html);
    renderCharts(ventas, revenueByProduct, profitByProduct);
  } catch (err) {
    setResultado('<p class="error">Error de conexión: ' + err.message + '</p>');
  }
}

function renderCharts(ventas, revenueByProduct, profitByProduct) {
  if (chartVentasDia) { chartVentasDia.destroy(); chartVentasDia = null; }
  if (chartProductos) { chartProductos.destroy(); chartProductos = null; }
  if (chartCategorias) { chartCategorias.destroy(); chartCategorias = null; }
  if (chartRentabilidad) { chartRentabilidad.destroy(); chartRentabilidad = null; }

  var chartColors = ['#4361ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

  // ---- Chart 1: Ventas por día (line chart with smooth curve) ----
  var ventasPorDia = {};
  for (var i = 0; i < ventas.length; i++) {
    var v = ventas[i];
    var isoDate = v.fecha_venta.substring(0, 10);
    if (!ventasPorDia[isoDate]) ventasPorDia[isoDate] = 0;
    ventasPorDia[isoDate] += Number(v.total_venta);
  }

  var sortedDates = Object.keys(ventasPorDia).sort();
  var fechasDisplay = sortedDates.map(function (d) {
    var parts = d.split('-');
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  });
  var totalesDia = sortedDates.map(function (d) { return ventasPorDia[d]; });

  var ctxDia = document.getElementById('chart-ventas-dia');
  if (ctxDia) {
    if (totalesDia.length === 0) {
      ctxDia.parentElement.innerHTML += '<p class="empty-chart">Sin datos de ventas para mostrar</p>';
    } else {
      chartVentasDia = new Chart(ctxDia, {
        type: 'line',
        data: {
          labels: fechasDisplay,
          datasets: [{
            label: 'Total vendido',
            data: totalesDia,
            borderColor: '#4361ee',
            backgroundColor: 'rgba(67, 97, 238, 0.08)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#4361ee',
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function (items) { return items[0].label; },
                label: function (item) { return '→ ' + formatCLP(item.raw); }
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
  }

  // ---- Chart 2: Revenue by product (bar chart) ----
  var sortedProductos = Object.entries(revenueByProduct)
    .sort(function (a, b) { return b[1] - a[1]; })
    .slice(0, 10);

  var nombresProductos = sortedProductos.map(function (e) { return e[0]; });
  var revenueProductos = sortedProductos.map(function (e) { return e[1]; });

  var ctxProd = document.getElementById('chart-productos');
  if (ctxProd) {
    if (nombresProductos.length === 0) {
      ctxProd.parentElement.innerHTML += '<p class="empty-chart">Sin datos de productos para mostrar</p>';
    } else {
      chartProductos = new Chart(ctxProd, {
        type: 'bar',
        data: {
          labels: nombresProductos,
          datasets: [{
            label: 'Ingresos',
            data: revenueProductos,
            backgroundColor: chartColors.slice(0, nombresProductos.length),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (item) { return item.label + ': ' + formatCLP(item.raw); }
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
  }

  // ---- Chart 3: Ventas por categoría (pie chart) ----
  var revenueByCategory = {};
  for (var vi = 0; vi < ventas.length; vi++) {
    var ventaDets = ventas[vi].detalles;
    for (var di = 0; di < ventaDets.length; di++) {
      var det = ventaDets[di];
      var prodName = det.producto;
      var prodData = productosData.find(function (pp) { return pp.nombre === prodName; });
      var catName = prodData ? (prodData.categoria || 'Sin categoría') : 'Sin categoría';
      if (!revenueByCategory[catName]) revenueByCategory[catName] = 0;
      revenueByCategory[catName] += Number(det.subtotal);
    }
  }

  var catNames = Object.keys(revenueByCategory);
  var catValues = catNames.map(function (c) { return revenueByCategory[c]; });

  var ctxCat = document.getElementById('chart-categorias');
  if (ctxCat) {
    if (catNames.length === 0) {
      ctxCat.parentElement.innerHTML += '<p class="empty-chart">Sin datos de categorías para mostrar</p>';
    } else {
      chartCategorias = new Chart(ctxCat, {
        type: 'pie',
        data: {
          labels: catNames,
          datasets: [{
            data: catValues,
            backgroundColor: chartColors.slice(0, catNames.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
            tooltip: {
              callbacks: {
                label: function (item) { return item.label + ': ' + formatCLP(item.raw); }
              }
            }
          }
        }
      });
    }
  }

  // ---- Chart 4: Rentabilidad estimada por producto (bar chart) ----
  var sortedProfit = Object.entries(profitByProduct)
    .sort(function (a, b) { return b[1] - a[1]; })
    .slice(0, 10);

  var profitNames = sortedProfit.map(function (e) { return e[0]; });
  var profitValues = sortedProfit.map(function (e) { return e[1]; });
  var profitColors = profitValues.map(function (v) { return v >= 0 ? '#10b981' : '#ef4444'; });

  var ctxRent = document.getElementById('chart-rentabilidad');
  if (ctxRent) {
    if (profitNames.length === 0) {
      ctxRent.parentElement.innerHTML += '<p class="empty-chart">Sin datos para calcular rentabilidad</p>';
    } else {
      chartRentabilidad = new Chart(ctxRent, {
        type: 'bar',
        data: {
          labels: profitNames,
          datasets: [{
            label: 'Ganancia estimada',
            data: profitValues,
            backgroundColor: profitColors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (item) { return item.label + ': ' + formatCLP(item.raw); }
              }
            }
          },
          scales: {
            y: {
              ticks: { callback: function (v) { return formatCLP(v); } }
            }
          }
        }
      });
    }
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
  var desde = document.getElementById('filtro-desde').value;
  var hasta = document.getElementById('filtro-hasta').value;
  saveState();
  var queryString = '';
  var params = [];
  if (desde) params.push('desde=' + desde);
  if (hasta) params.push('hasta=' + hasta);
  if (params.length > 0) queryString = '?' + params.join('&');
  await cargarVentas(queryString);
}

async function cargarVentas(queryString) {
  setResultado('<div class="loading-spinner"></div> Cargando historial de ventas...');
  try {
    var res = await fetch(API_BASE + '/api/ventas' + queryString);
    var data = await res.json();

    if (!res.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudo cargar el historial') + '</p>');
      return;
    }

    ultimasVentas = data;

    if (data.length === 0) {
      setResultado('<div class="empty-state"><p>🕐 No hay ventas registradas en el rango seleccionado.</p></div>');
      return;
    }

    var html = '<h2>🕐 Historial de Ventas (' + data.length + ')</h2>';
    html += '<table>';
    html += '<tr><th>ID</th><th>Fecha</th><th>Medio de pago</th><th>Productos vendidos</th><th>Total</th></tr>';

    for (var i = 0; i < data.length; i++) {
      var venta = data[i];
      var productosTexto = venta.detalles.map(function (d) {
        return d.producto + ' x' + d.cantidad_vendida + ' (' + formatCLP(d.subtotal) + ')';
      }).join(', ');

      var fecha = new Date(venta.fecha_venta).toLocaleString('es-CL');

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
// G) INGRESO HISTORY
// =============================================

async function verHistorialIngresos() {
  await cargarIngresos('');
}

async function filtrarIngresos() {
  var desde = document.getElementById('filtro-desde').value;
  var hasta = document.getElementById('filtro-hasta').value;
  saveState();
  var queryString = '';
  var params = [];
  if (desde) params.push('desde=' + desde);
  if (hasta) params.push('hasta=' + hasta);
  if (params.length > 0) queryString = '?' + params.join('&');
  await cargarIngresos(queryString);
}

async function cargarIngresos(queryString) {
  setResultado('<div class="loading-spinner"></div> Cargando historial de ingresos...');
  try {
    var res = await fetch(API_BASE + '/api/ingresos' + queryString);
    var data = await res.json();

    if (!res.ok) {
      setResultado('<p class="error">Error: ' + (data.error || 'No se pudo cargar el historial') + '</p>');
      return;
    }

    ultimosIngresos = data;

    if (data.length === 0) {
      setResultado('<div class="empty-state"><p>📥 No hay ingresos registrados en el rango seleccionado.</p></div>');
      return;
    }

    var html = '<h2>📥 Historial de Ingresos (' + data.length + ')</h2>';
    html += '<table>';
    html += '<tr><th>ID</th><th>Fecha</th><th>Proveedor</th><th>Productos ingresados</th><th>Total</th></tr>';

    for (var i = 0; i < data.length; i++) {
      var ingreso = data[i];
      var productosTexto = ingreso.detalles.map(function (d) {
        return d.producto + ' x' + d.cantidad_ingresada + ' (' + formatCLP(d.subtotal) + ')';
      }).join(', ');

      var fecha = new Date(ingreso.fecha_ingreso).toLocaleString('es-CL');

      html += '<tr>';
      html += '<td>' + ingreso.id_ingreso + '</td>';
      html += '<td>' + fecha + '</td>';
      html += '<td>' + ingreso.proveedor + '</td>';
      html += '<td>' + productosTexto + '</td>';
      html += '<td>' + formatCLP(ingreso.total_ingreso) + '</td>';
      html += '</tr>';
    }

    html += '</table>';
    setResultado(html);
  } catch (err) {
    setResultado('<p class="error">Error de conexión: ' + err.message + '</p>');
  }
}

// =============================================
// H) CSV EXPORT
// =============================================

function exportarCSV() {
  if (ultimasVentas.length === 0) {
    alert('No hay ventas para exportar. Primero cargue el historial de ventas.');
    return;
  }

  var headers = ['ID venta', 'Fecha', 'Medio de pago', 'Producto', 'Cantidad', 'Precio unitario', 'Subtotal', 'Total venta'];

  var rows = [];
  for (var i = 0; i < ultimasVentas.length; i++) {
    var venta = ultimasVentas[i];
    var fecha = new Date(venta.fecha_venta).toLocaleString('es-CL');
    for (var j = 0; j < venta.detalles.length; j++) {
      var d = venta.detalles[j];
      rows.push([venta.id_venta, fecha, venta.medio_pago, d.producto, d.cantidad_vendida, d.precio_unitario, d.subtotal, venta.total_venta]);
    }
  }

  var csv = headers.join(';') + '\n';
  for (var r = 0; r < rows.length; r++) {
    csv += rows[r].map(function (val) {
      var str = String(val);
      if (str.indexOf(';') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(';') + '\n';
  }

  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
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
  cargarCategorias();
  updateStockAlert();

  // Venta form events
  document.getElementById('venta-producto').addEventListener('change', onVentaProductoChange);
  document.getElementById('venta-producto').addEventListener('change', checkVentaFields);
  document.getElementById('venta-cantidad').addEventListener('input', checkVentaFields);
  document.getElementById('venta-precio').addEventListener('input', checkVentaFields);

  // Ingreso form events
  document.getElementById('ingreso-producto').addEventListener('change', function () {
    checkIngresoFields();
    document.getElementById('ingreso-cantidad').focus();
  });
  document.getElementById('ingreso-cantidad').addEventListener('input', checkIngresoFields);
  document.getElementById('ingreso-precio').addEventListener('input', checkIngresoFields);

  // Save operator name and payment method on change
  document.getElementById('operador-nombre').addEventListener('input', saveState);
  document.getElementById('venta-medio-pago').addEventListener('change', saveState);
  document.getElementById('filtro-desde').addEventListener('change', saveState);
  document.getElementById('filtro-hasta').addEventListener('change', saveState);
});
