// ventas.js — Sales cart, registration, history, CSV/PDF export

var carrito = [];
var ultimasVentas = [];
var isSubmitting = false;

// =============================================
// FORM VALIDATION
// =============================================

function checkVentaFields() {
  var producto = document.getElementById('venta-producto').value;
  var cantidad = document.getElementById('venta-cantidad').value;
  var precio = document.getElementById('venta-precio').value;
  document.getElementById('btn-agregar-carrito').disabled = !(producto && cantidad && precio);
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
// SALE CART
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
    var res = await fetch(CONFIG.API_BASE + '/api/ventas', {
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

// =============================================
// STOCK ALERTS AFTER OPERATIONS
// =============================================

function checkStockAfterSale(items, oldProds) {
  for (var i = 0; i < items.length; i++) {
    var soldItem = items[i];
    var current = productosData.find(function (p) { return p.id_producto === soldItem.id_producto; });
    var old = oldProds ? oldProds.find(function (p) { return p.id_producto === soldItem.id_producto; }) : null;
    if (!current) continue;
    var cleanName = getCleanName(soldItem.nombre);

    var wasCritical = old ? old.stock_actual <= Math.floor(old.stock_minimo / 2) : false;
    var wasLow = old ? old.stock_actual <= old.stock_minimo : false;
    var isCritical = current.stock_actual <= Math.floor(current.stock_minimo / 2);
    var isLow = current.stock_actual <= current.stock_minimo;

    if (isCritical && !wasCritical) {
      showToast('🔴 ' + cleanName + ' quedó en stock CRÍTICO (' + current.stock_actual + ')', 'error');
    } else if (isLow && !wasLow) {
      showToast('⚠️ ' + cleanName + ' quedó bajo stock (' + current.stock_actual + ')', 'warning');
    }
  }
}

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
  var session = getSession();
  var operador = session ? session.username : '—';
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
    html += '<tr><td>' + cleanName + '</td><td>' + item.cantidad_vendida + '</td><td>' + formatCLP(item.precio_unitario) + '</td><td>' + formatCLP(subtotal) + '</td></tr>';
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

function exportarReciboPDF() {
  var body = document.getElementById('receipt-body');
  exportarPDF('Comprobante de Venta', body.innerHTML);
}

// =============================================
// SALES HISTORY
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
  showSkeleton('Cargando historial de ventas...');
  try {
    var res = await fetch(CONFIG.API_BASE + '/api/ventas' + queryString);
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

    var html = '<div class="section-header"><h2>🕐 Historial de Ventas (' + data.length + ')</h2>';
    html += '<button class="btn-action btn-edit" onclick="exportarVentasPDF()">📄 Exportar PDF</button></div>';
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
// CSV EXPORT
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
// PDF EXPORT FOR VENTAS
// =============================================

function exportarVentasPDF() {
  if (ultimasVentas.length === 0) {
    alert('No hay ventas para exportar.');
    return;
  }

  var html = '<h2>Historial de Ventas</h2>';
  html += '<table><tr><th>ID</th><th>Fecha</th><th>Medio pago</th><th>Productos</th><th>Total</th></tr>';
  for (var i = 0; i < ultimasVentas.length; i++) {
    var v = ultimasVentas[i];
    var prods = v.detalles.map(function (d) { return d.producto + ' x' + d.cantidad_vendida; }).join(', ');
    var fecha = new Date(v.fecha_venta).toLocaleString('es-CL');
    html += '<tr><td>' + v.id_venta + '</td><td>' + fecha + '</td><td>' + v.medio_pago + '</td><td>' + prods + '</td><td>' + formatCLP(v.total_venta) + '</td></tr>';
  }
  html += '</table>';
  exportarPDF('Historial de Ventas', html);
}
