// app.js — Main entry point (loads after all module scripts)
// Handles localStorage persistence and app initialization.

// =============================================
// LOCALSTORAGE PERSISTENCE
// =============================================

function saveState() {
  try {
    localStorage.setItem(LS_KEYS.CARRITO, JSON.stringify(carrito));
    localStorage.setItem(LS_KEYS.CARRITO_INGRESO, JSON.stringify(carritoIngreso));
    localStorage.setItem(LS_KEYS.FILTRO_DESDE, document.getElementById('filtro-desde').value);
    localStorage.setItem(LS_KEYS.FILTRO_HASTA, document.getElementById('filtro-hasta').value);
    localStorage.setItem(LS_KEYS.MEDIO_PAGO, document.getElementById('venta-medio-pago').value);
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

    renderCarrito();
    renderIngresoCart();
  } catch (e) { /* ignore */ }
}

// =============================================
// APP INITIALIZATION
// =============================================

function initApp() {
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

  // Save state on filter/payment changes
  document.getElementById('venta-medio-pago').addEventListener('change', saveState);
  document.getElementById('filtro-desde').addEventListener('change', saveState);
  document.getElementById('filtro-hasta').addEventListener('change', saveState);
}

// =============================================
// DOM READY — check session and start
// =============================================

document.addEventListener('DOMContentLoaded', function () {
  if (isLoggedIn()) {
    showApp();
    initApp();
  } else {
    showLoginScreen();
  }
});
