export const printMovimiento = (movimientoOrGroup, instituciones = [], productos = []) => {
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) return

  const isGroup = Array.isArray(movimientoOrGroup);
  const movs = isGroup ? movimientoOrGroup : [movimientoOrGroup];
  const primer = movs[0];

  const institucionMatch = instituciones.find(i => i.nombre === primer.institucion_nombre)
  const direccionStr = institucionMatch && institucionMatch.direccion ? institucionMatch.direccion : ''
  const departamentoStr = institucionMatch && institucionMatch.departamento ? institucionMatch.departamento : ''
  const ubicacionParts = [direccionStr, departamentoStr, 'SAN JUAN'].filter(Boolean)
  const ubicacionDestino = primer.dependencia_destino
    ? 'Edificio Centro Cívico'
    : (ubicacionParts.join(' - ') || 'No registrada')

  const institucionNombre = primer.dependencia_destino
    ? `Centro Cívico - ${primer.dependencia_destino}`
    : (primer.institucion_nombre || '-')
  const depositoOrigen = primer.deposito_nombre || (primer.dependencia_destino ? 'CENTRO CÍVICO' : 'DEPOSITO CENTRAL')

  const dateObj = primer.created_at ? new Date(primer.created_at) : new Date()
  const day = dateObj.getDate()
  const month = dateObj.getMonth() + 1
  const year = dateObj.getFullYear()
  const fechaStr = `${day}/${month}/${year}`



  // Buscar codigo_sku de cada producto
  const getCodigoProducto = (mov) => {
    if (mov.codigo_sku) return mov.codigo_sku
    const prod = productos.find(p =>
      p.nombre === mov.producto_nombre ||
      p.id === mov.id_producto ||
      p.id === mov.producto_id
    )
    return prod && prod.codigo_sku ? prod.codigo_sku : '-'
  }

  const rowsHTML = movs.map((m) => `<tr>
    <td style="padding: 8px 12px; border-bottom: 1px solid #ddd; font-size: 12px; color: #333;">${getCodigoProducto(m)}</td>
    <td style="padding: 8px 12px; border-bottom: 1px solid #ddd; font-size: 12px; color: #333; text-transform: uppercase;">${(m.producto_nombre || m.producto || '-').toUpperCase()}</td>
    <td style="padding: 8px 12px; border-bottom: 1px solid #ddd; font-size: 12px; color: #333; text-align: right;">${Number(m.cantidad || 0).toFixed(2)}</td>
  </tr>`).join('');

  const cantidadItems = movs.length

  printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orden de Dispensación de Productos</title>
        <style>
          @page {
            margin: 20mm 15mm 20mm 15mm;
            size: A4;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
            color: #222;
            font-size: 12px;
            line-height: 1.4;
            padding: 0;
          }
          .page-container {
            max-width: 720px;
            margin: 0 auto;
            padding: 30px 40px;
          }

          /* HEADER */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 0;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .header-left img {
            height: 42px;
            width: auto;
          }
          .header-left-text {
            line-height: 1.2;
          }
          .header-left-text .gob-name {
            font-size: 14px;
            font-weight: 700;
            color: #1a1a1a;
          }
          .header-left-text .gob-sub {
            font-size: 10px;
            color: #666;
          }
          .header-left-text .ministerio {
            font-size: 10px;
            color: #555;
            border-left: 1px solid #ccc;
            padding-left: 8px;
            margin-left: 8px;
            display: inline-block;
          }


          /* TÍTULO */
          .main-title {
            text-align: center;
            font-size: 16px;
            font-weight: 700;
            color: #111;
            margin: 18px 0 20px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #333;
            letter-spacing: 0.3px;
          }

          /* INFO SECTION */
          .info-section {
            margin-bottom: 20px;
            font-size: 12px;
            line-height: 1.9;
          }
          .info-row {
            display: flex;
            gap: 12px;
          }
          .info-row .info-left {
            flex: 1;
          }
          .info-row .info-right {
            text-align: right;
            white-space: nowrap;
          }
          .info-section strong {
            color: #111;
          }

          /* TABLE */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          thead th {
            background: #f5f5f5;
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
            padding: 8px 12px;
            text-align: left;
            font-size: 11px;
            font-weight: 700;
            color: #111;
            text-transform: none;
          }
          thead th:last-child {
            text-align: right;
          }
          tbody td {
            padding: 7px 12px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 12px;
          }
          tbody tr:last-child td {
            border-bottom: 2px solid #333;
          }

          /* FOOTER INFO */
          .footer-info {
            margin-top: 20px;
            font-size: 13px;
            font-weight: 600;
            color: #111;
          }

          @media print {
            body { padding: 0; }
            .page-container { padding: 0; max-width: none; }
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          
          <!-- HEADER -->
          <div class="header">
            <div class="header-left">
              <img src="/faviconmin.png" alt="Logo San Juan" />
              <div class="header-left-text">
                <div class="gob-name">San Juan</div>
                <div class="gob-sub">Gobierno</div>
              </div>
              <span class="header-left-text ministerio">Ministerio de<br/>Educación</span>
            </div>
          </div>

          <!-- TÍTULO -->
          <div class="main-title">Orden de Dispensación de Productos</div>

          <!-- INFORMACIÓN -->
          <div class="info-section">
            <div><strong>Fecha:</strong> ${fechaStr}</div>
            <div><strong>Depósito Origen:</strong> ${depositoOrigen.toUpperCase()}</div>
            <div><strong>Destino:</strong> ${institucionNombre.toUpperCase()}</div>
            ${primer.cargo_retira ? `<div><strong>Receptor:</strong> ${primer.cargo_retira}</div>` : ''}
            <div><strong>Ubicación del Destino:</strong> ${ubicacionDestino}</div>
          </div>

          <!-- TABLA DE PRODUCTOS -->
          <table>
            <thead>
              <tr>
                <th style="width: 160px;">Código de Producto</th>
                <th>Descripción del Producto</th>
                <th style="width: 140px; text-align: right;">Cantidad Dispensada</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          <!-- CANTIDAD DE ITEMS -->
          <div class="footer-info">
            Cantidad de Items &nbsp;&nbsp; ${cantidadItems}
          </div>

        </div>
      </body>
      </html>
    `)

  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 400)
}
