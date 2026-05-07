// ingresos.js — Ingreso cart, registration, history, PDF export

var carritoIngreso = [];
var ultimosIngresos = [];

// =============================================
// FORM VALIDATION
// =============================================

function checkIngresoFields() {
  var producto = document.getElementById('ingreso-producto').value;
  var cantidad = document.getElementById('ingreso-cantidad').value;
  var precio = document.getElementById('ingreso-precio').value;
  document.getElementById('btn-agregar-ingreso').disabled = !(producto && cantidad && precio);
}

// =============================================
// INGRESO CART
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
    var res = await fetch(CONFIG.API_BASE + '/api/ingresos', {
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
// INGRESO HISTORY
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
  showSkeleton('Cargando historial de ingresos...');
  try {
    var res = await fetch(CONFIG.API_BASE + '/api/ingresos' + queryString);
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

    var html = '<div class="section-header"><h2>📥 Historial de Ingresos (' + data.length + ')</h2>';
    html += '<button class="btn-action btn-edit" onclick="exportarIngresosPDF()">📄 Exportar PDF</button></div>';
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
// PDF EXPORT FOR INGRESOS
// =============================================

function exportarIngresosPDF() {
  if (ultimosIngresos.length === 0) {
    alert('No hay ingresos para exportar.');
    return;
  }

  var html = '<h2>Historial de Ingresos</h2>';
  html += '<table><tr><th>ID</th><th>Fecha</th><th>Proveedor</th><th>Productos</th><th>Total</th></tr>';
  for (var i = 0; i < ultimosIngresos.length; i++) {
    var ing = ultimosIngresos[i];
    var prods = ing.detalles.map(function (d) { return d.producto + ' x' + d.cantidad_ingresada; }).join(', ');
    var fecha = new Date(ing.fecha_ingreso).toLocaleString('es-CL');
    html += '<tr><td>' + ing.id_ingreso + '</td><td>' + fecha + '</td><td>' + ing.proveedor + '</td><td>' + prods + '</td><td>' + formatCLP(ing.total_ingreso) + '</td></tr>';
  }
  html += '</table>';
  exportarPDF('Historial de Ingresos', html);
}
