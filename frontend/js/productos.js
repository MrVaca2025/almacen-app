// productos.js — Product management: list, edit, create, toggle, kardex

var productosData = [];
var categoriasData = [];

// =============================================
// PRODUCT DROPDOWNS
// =============================================

async function cargarDropdownProductos() {
  try {
    var res = await fetch(CONFIG.API_BASE + '/api/productos');
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
    var res = await fetch(CONFIG.API_BASE + '/api/productos/categorias');
    var data = await res.json();
    if (!res.ok) return;
    categoriasData = data;
  } catch (err) { /* ignore */ }
}

// =============================================
// PRODUCTS VIEW
// =============================================

async function cargarProductos() {
  showSkeleton('Cargando productos...');
  try {
    var res = await fetch(CONFIG.API_BASE + '/api/productos');
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
      html += '<button class="btn-action btn-kardex" onclick="verKardex(' + p.id_producto + ')">📋 Kardex</button>';
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
// EDIT MODAL
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
    var res = await fetch(CONFIG.API_BASE + '/api/productos/' + id, {
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
    var res = await fetch(CONFIG.API_BASE + '/api/productos/' + id + '/toggle', { method: 'PATCH' });
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
    var res = await fetch(CONFIG.API_BASE + '/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre, descripcion: descripcion || null, precio_venta: precio_venta,
        stock_minimo: stock_minimo, unidad_venta: unidad_venta, unidad_compra: unidad_compra,
        factor_conversion: factor_conversion, activo: activo, id_categoria: id_categoria
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
// KARDEX MODAL
// =============================================

async function verKardex(productoId) {
  var modal = document.getElementById('kardex-modal');
  var body = document.getElementById('kardex-body');
  body.innerHTML = '<div class="loading-spinner"></div> Cargando movimientos...';
  modal.style.display = 'flex';

  try {
    var res = await fetch(CONFIG.API_BASE + '/api/kardex/' + productoId);
    var data = await res.json();

    if (!res.ok) {
      body.innerHTML = '<p class="error">Error: ' + (data.error || 'No se pudo cargar') + '</p>';
      return;
    }

    var html = '<h2>📋 Kardex: ' + data.producto.nombre + '</h2>';
    html += '<p>Stock actual: <strong>' + data.producto.stock_actual + '</strong></p>';

    if (data.movimientos.length === 0) {
      html += '<div class="empty-state"><p>Sin movimientos registrados para este producto.</p></div>';
    } else {
      html += '<table class="kardex-table">';
      html += '<tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Precio</th><th>Stock resultante</th></tr>';
      for (var i = 0; i < data.movimientos.length; i++) {
        var mov = data.movimientos[i];
        var fecha = new Date(mov.fecha).toLocaleString('es-CL');
        var tipoClass = mov.tipo === 'Ingreso' ? 'badge-ingreso' : 'badge-venta';
        var tipoBadge = mov.tipo === 'Ingreso'
          ? '<span class="badge badge-success">Ingreso</span>'
          : '<span class="badge badge-danger">Venta</span>';
        var signo = mov.tipo === 'Ingreso' ? '+' : '-';

        html += '<tr class="kardex-row-' + mov.tipo.toLowerCase() + '">';
        html += '<td>' + fecha + '</td>';
        html += '<td>' + tipoBadge + '</td>';
        html += '<td>' + signo + mov.cantidad + '</td>';
        html += '<td>' + formatCLP(mov.precio) + '</td>';
        html += '<td><strong>' + mov.stock_resultante + '</strong></td>';
        html += '</tr>';
      }
      html += '</table>';
    }

    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = '<p class="error">Error de conexión: ' + err.message + '</p>';
  }
}

function cerrarKardexModal(event) {
  if (event && event.target && event.target.id !== 'kardex-modal') return;
  document.getElementById('kardex-modal').style.display = 'none';
}

function exportarKardexPDF() {
  var body = document.getElementById('kardex-body');
  exportarPDF('Kardex', body.innerHTML);
}

// =============================================
// LOW STOCK VIEW
// =============================================

async function verBajoStock() {
  showSkeleton('Cargando productos bajo stock...');
  try {
    var res = await fetch(CONFIG.API_BASE + '/api/productos/bajo-stock');
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
// STOCK ALERT BANNER
// =============================================

async function updateStockAlert() {
  try {
    var res = await fetch(CONFIG.API_BASE + '/api/productos');
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
