// dashboard.js — Dashboard with KPIs, charts, margin analysis

var ingresosData = [];
var chartVentasDia = null;
var chartProductos = null;
var chartCategorias = null;
var chartRentabilidad = null;

async function verDashboard() {
  showSkeleton('Cargando dashboard...');
  try {
    var results = await Promise.all([
      fetch(CONFIG.API_BASE + '/api/dashboard'),
      fetch(CONFIG.API_BASE + '/api/ventas'),
      fetch(CONFIG.API_BASE + '/api/ingresos')
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

    // Calculate revenue and quantity per product
    var revenueByProduct = {};
    var qtyByProduct = {};
    var salesCountByProduct = {};
    for (var v = 0; v < ventas.length; v++) {
      var detalles = ventas[v].detalles;
      for (var d = 0; d < detalles.length; d++) {
        var det = detalles[d];
        if (!revenueByProduct[det.producto]) revenueByProduct[det.producto] = 0;
        if (!qtyByProduct[det.producto]) qtyByProduct[det.producto] = 0;
        if (!salesCountByProduct[det.producto]) salesCountByProduct[det.producto] = 0;
        revenueByProduct[det.producto] += Number(det.subtotal);
        qtyByProduct[det.producto] += Number(det.cantidad_vendida);
        salesCountByProduct[det.producto]++;
      }
    }

    // Average purchase cost per product from ingresos
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

    var avgCostPerUnit = {};
    for (var pName in costByProduct) {
      avgCostPerUnit[pName] = costCountByProduct[pName] > 0 ? costByProduct[pName] / costCountByProduct[pName] : 0;
    }

    // Estimated COGS and profit
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

    // Most rotated product (most sale transactions)
    var mostRotated = '—';
    var maxRotation = 0;
    for (var pName3 in salesCountByProduct) {
      if (salesCountByProduct[pName3] > maxRotation) {
        maxRotation = salesCountByProduct[pName3];
        mostRotated = pName3;
      }
    }

    // Days of stock calculation
    var totalDays = 0;
    var daysCount = 0;
    if (ventas.length > 0) {
      var allDates = ventas.map(function (v) { return new Date(v.fecha_venta).getTime(); });
      var minDate = Math.min.apply(null, allDates);
      var maxDate = Math.max.apply(null, allDates);
      var daySpan = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));

      for (var pi = 0; pi < productosData.length; pi++) {
        var prod = productosData[pi];
        if (!prod.activo) continue;
        var totalSold = qtyByProduct[prod.nombre] || 0;
        if (totalSold > 0) {
          var avgDailySales = totalSold / daySpan;
          var daysOfStock = avgDailySales > 0 ? Math.round(prod.stock_actual / avgDailySales) : 999;
          totalDays += daysOfStock;
          daysCount++;
        }
      }
    }
    var avgDaysOfStock = daysCount > 0 ? Math.round(totalDays / daysCount) : '—';

    // Build dashboard HTML
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
    html += buildKpiCard('🔄', mostRotated, 'Producto más rotado');
    html += buildKpiCard('📅', avgDaysOfStock + (avgDaysOfStock !== '—' ? ' días' : ''), 'Stock estimado promedio');
    html += '</div>';
    html += '<p class="margin-note">* Margen estimado usando precio promedio de compra de los ingresos registrados. Días de stock = stock_actual ÷ ventas_diarias_promedio.</p>';

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
        html += '<tr><td>' + p.nombre + '</td><td>' + p.stock_actual + '</td><td>' + p.stock_minimo + '</td><td>' + p.deficit + '</td><td>' + getStockBadge(p.stock_actual, p.stock_minimo) + '</td></tr>';
      }
      html += '</table>';
    }

    if (data.mas_vendidos && data.mas_vendidos.length > 0) {
      html += '<h3 style="margin-top:16px;">Productos más vendidos</h3>';
      html += '<table><tr><th>Nombre</th><th>Total vendido</th></tr>';
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

  // ---- Chart 1: Ventas por día ----
  var ventasPorDia = {};
  for (var i = 0; i < ventas.length; i++) {
    var v = ventas[i];
    var isoDate = v.fecha_venta.substring(0, 10);
    if (!ventasPorDia[isoDate]) ventasPorDia[isoDate] = 0;
    ventasPorDia[isoDate] += Number(v.total_venta);
  }

  var sortedDates = Object.keys(ventasPorDia).sort();
  var fechasDisplay = sortedDates.map(function (d) { var p = d.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; });
  var totalesDia = sortedDates.map(function (d) { return ventasPorDia[d]; });

  var ctxDia = document.getElementById('chart-ventas-dia');
  if (ctxDia) {
    if (totalesDia.length === 0) {
      ctxDia.parentElement.innerHTML += '<p class="empty-chart">Sin datos de ventas para mostrar</p>';
    } else {
      chartVentasDia = new Chart(ctxDia, {
        type: 'line',
        data: { labels: fechasDisplay, datasets: [{ label: 'Total vendido', data: totalesDia, borderColor: '#4361ee', backgroundColor: 'rgba(67, 97, 238, 0.08)', borderWidth: 2.5, tension: 0.4, fill: true, pointBackgroundColor: '#4361ee', pointRadius: 5, pointHoverRadius: 7 }] },
        options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { title: function (items) { return items[0].label; }, label: function (item) { return '→ ' + formatCLP(item.raw); } } } }, scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return formatCLP(v); } } } } }
      });
    }
  }

  // ---- Chart 2: Revenue by product ----
  var sortedProductos = Object.entries(revenueByProduct).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10);
  var nombresProductos = sortedProductos.map(function (e) { return e[0]; });
  var revenueProductos = sortedProductos.map(function (e) { return e[1]; });

  var ctxProd = document.getElementById('chart-productos');
  if (ctxProd) {
    if (nombresProductos.length === 0) {
      ctxProd.parentElement.innerHTML += '<p class="empty-chart">Sin datos de productos para mostrar</p>';
    } else {
      chartProductos = new Chart(ctxProd, {
        type: 'bar',
        data: { labels: nombresProductos, datasets: [{ label: 'Ingresos', data: revenueProductos, backgroundColor: chartColors.slice(0, nombresProductos.length), borderRadius: 6 }] },
        options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (item) { return item.label + ': ' + formatCLP(item.raw); } } } }, scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return formatCLP(v); } } } } }
      });
    }
  }

  // ---- Chart 3: Ventas por categoría ----
  var revenueByCategory = {};
  for (var vi = 0; vi < ventas.length; vi++) {
    var ventaDets = ventas[vi].detalles;
    for (var di = 0; di < ventaDets.length; di++) {
      var det2 = ventaDets[di];
      var prodData = productosData.find(function (pp) { return pp.nombre === det2.producto; });
      var catName = prodData ? (prodData.categoria || 'Sin categoría') : 'Sin categoría';
      if (!revenueByCategory[catName]) revenueByCategory[catName] = 0;
      revenueByCategory[catName] += Number(det2.subtotal);
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
        data: { labels: catNames, datasets: [{ data: catValues, backgroundColor: chartColors.slice(0, catNames.length), borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } }, tooltip: { callbacks: { label: function (item) { return item.label + ': ' + formatCLP(item.raw); } } } } }
      });
    }
  }

  // ---- Chart 4: Rentabilidad estimada ----
  var sortedProfit = Object.entries(profitByProduct).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10);
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
        data: { labels: profitNames, datasets: [{ label: 'Ganancia estimada', data: profitValues, backgroundColor: profitColors, borderRadius: 6 }] },
        options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (item) { return item.label + ': ' + formatCLP(item.raw); } } } }, scales: { y: { ticks: { callback: function (v) { return formatCLP(v); } } } } }
      });
    }
  }
}
