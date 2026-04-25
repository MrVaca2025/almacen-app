// ui.js — UI helpers: messages, toasts, modals, skeletons

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
// MESSAGE HELPERS
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

// =============================================
// SKELETON LOADING
// =============================================

function showSkeleton(message) {
  setResultado(
    '<div class="skeleton-container">' +
    '<div class="loading-spinner"></div>' +
    '<p class="skeleton-text">' + (message || 'Cargando...') + '</p>' +
    '</div>'
  );
}

// =============================================
// STOCK BADGES
// =============================================

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

function buildKpiCard(icon, value, label) {
  return '<div class="kpi-card">'
    + '<div class="kpi-icon">' + icon + '</div>'
    + '<div class="kpi-value">' + value + '</div>'
    + '<div class="kpi-label">' + label + '</div>'
    + '</div>';
}

// =============================================
// MODAL KEYBOARD HANDLER
// =============================================

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    var modals = ['receipt-modal', 'edit-modal', 'create-modal', 'kardex-modal', 'login-modal'];
    for (var i = 0; i < modals.length; i++) {
      var modal = document.getElementById(modals[i]);
      if (modal && modal.style.display === 'flex') {
        if (modals[i] === 'login-modal') return; // don't close login with Escape
        modal.style.display = 'none';
      }
    }
  }
});

// =============================================
// PDF EXPORT
// =============================================

function exportarPDF(titulo, contenidoHtml) {
  var printWindow = window.open('', '_blank');
  printWindow.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<title>' + titulo + '</title>' +
    '<style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #1a1a2e; }' +
    'h2 { margin-bottom: 16px; }' +
    'table { width: 100%; border-collapse: collapse; margin-top: 12px; }' +
    'th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }' +
    'th { background: #334155; color: white; }' +
    'tr:nth-child(even) { background: #f1f5f9; }' +
    '.badge-ingreso { color: #065f46; font-weight: 600; }' +
    '.badge-venta { color: #991b1b; font-weight: 600; }' +
    '.footer { margin-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; }' +
    '</style></head><body>' +
    contenidoHtml +
    '<p class="footer">Generado: ' + new Date().toLocaleString('es-CL') + '</p>' +
    '</body></html>'
  );
  printWindow.document.close();
  printWindow.focus();
  setTimeout(function () { printWindow.print(); }, 500);
}
