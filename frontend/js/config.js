// config.js — Global configuration and helpers

var CONFIG = {
  API_BASE: 'http://localhost:3000'
};

// CLP currency formatter
var clpFormat = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

function formatCLP(value) {
  return clpFormat.format(value || 0);
}

// localStorage keys
var LS_KEYS = {
  CARRITO: 'almacen_carrito',
  CARRITO_INGRESO: 'almacen_carritoIngreso',
  FILTRO_DESDE: 'almacen_filtroDesde',
  FILTRO_HASTA: 'almacen_filtroHasta',
  MEDIO_PAGO: 'almacen_medioPago',
  OPERADOR: 'almacen_operador',
  SESSION: 'almacen_session'
};
