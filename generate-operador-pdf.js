const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Obtener logo en base64
let logoBase64 = '';
const logoPath = path.join(__dirname, 'frontend', 'public', 'faviconmin.png');
if (fs.existsSync(logoPath)) {
  logoBase64 = 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64');
}

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual de Instrucciones de Funcionamiento - Rol Operador | Sistema DEPO</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4;
      margin: 14mm 14mm 14mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.48;
      font-size: 9pt;
    }

    /* Portada */
    .cover-page {
      page-break-after: always;
      height: 96vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 35px 25px;
      border: 3px solid #ff8200;
      border-radius: 12px;
      background: linear-gradient(145deg, #ffffff 0%, #fffbf7 100%);
      position: relative;
    }

    .cover-header {
      display: flex;
      align-items: center;
      gap: 18px;
      border-bottom: 2px solid #ff8200;
      padding-bottom: 20px;
    }

    .cover-logo {
      height: 70px;
      width: auto;
    }

    .cover-header-text h1 {
      font-size: 19pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }

    .cover-header-text p {
      font-size: 10.5pt;
      color: #64748b;
      font-weight: 500;
    }

    .cover-body {
      margin: auto 0;
      text-align: center;
      padding: 20px;
    }

    .badge-role {
      display: inline-block;
      background: #ff8200;
      color: #ffffff;
      font-size: 10.5pt;
      font-weight: 700;
      padding: 6px 18px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 18px;
      box-shadow: 0 4px 10px rgba(255, 130, 0, 0.25);
    }

    .cover-title {
      font-size: 25pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 14px;
    }

    .cover-subtitle {
      font-size: 12pt;
      color: #475569;
      max-width: 620px;
      margin: 0 auto 26px auto;
      line-height: 1.45;
    }

    .cover-features-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 22px;
      display: inline-flex;
      gap: 22px;
      text-align: left;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .feature-item {
      display: flex;
      flex-direction: column;
    }

    .feature-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 600;
    }

    .feature-val {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e293b;
    }

    .cover-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8.5pt;
      color: #64748b;
    }

    /* Estilos de Contenido General */
    h2 {
      font-size: 13.5pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 5px;
      margin-top: 18px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h2 .sec-num {
      background: #ff8200;
      color: #ffffff;
      font-size: 9pt;
      padding: 2px 7px;
      border-radius: 5px;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 600;
      color: #1e293b;
      margin-top: 12px;
      margin-bottom: 6px;
    }

    p {
      margin-bottom: 8px;
      color: #334155;
      text-align: justify;
    }

    ul, ol {
      margin-left: 18px;
      margin-bottom: 10px;
      color: #334155;
    }

    li {
      margin-bottom: 3px;
    }

    /* Tablas */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 12px 0;
      font-size: 8.2pt;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 9px;
      text-align: left;
    }

    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 600;
    }

    tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Cajas destacadas / Alertas */
    .callout {
      border-radius: 7px;
      padding: 10px 14px;
      margin: 10px 0;
      font-size: 8.5pt;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      page-break-inside: avoid;
    }

    .callout-info {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }

    .callout-warning {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }

    .callout-danger {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
    }

    .callout-success {
      background-color: #ecfdf5;
      border-left: 4px solid #10b981;
      color: #065f46;
    }

    .callout-icon {
      font-size: 13pt;
      line-height: 1;
    }

    /* Pasos / Steps */
    .step-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 9px 12px;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .step-number {
      background: #1e293b;
      color: white;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7.5pt;
      font-weight: 700;
    }

    .step-title {
      font-weight: 600;
      color: #0f172a;
      font-size: 9pt;
    }

    /* Tarjetas de cuadrícula */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 10px 0;
      page-break-inside: avoid;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 10px 0;
      page-break-inside: avoid;
    }

    .card-mini {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 8px 10px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }

    .card-mini strong {
      display: block;
      color: #0f172a;
      font-size: 8.5pt;
      margin-bottom: 2px;
    }

    .card-mini span {
      font-size: 7.5pt;
      color: #64748b;
      line-height: 1.35;
      display: block;
    }

    .page-break {
      page-break-before: always;
    }

    .header-doc {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 14px;
      font-size: 7.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- ==================== PÁGINA 1: PORTADA ==================== -->
  <div class="cover-page">
    <div class="cover-header">
      ${logoBase64 ? `<img src="${logoBase64}" class="cover-logo" alt="Logo Ministerio" />` : ''}
      <div class="cover-header-text">
        <h1>Gobierno de San Juan</h1>
        <p>Ministerio de Educación &bull; Secretaría Administrativa y Financiera</p>
      </div>
    </div>

    <div class="cover-body">
      <div class="badge-role">Rol Operador de Depósito</div>
      <h1 class="cover-title">MANUAL DE INSTRUCCIONES DE FUNCIONAMIENTO</h1>
      <p class="cover-subtitle">
        Guía de procedimientos técnicos, almacenamiento multidepósito, trazabilidad de existencias por lote, control de vencimientos y gestión de bajas y descartes (scrap).
      </p>

      <div class="cover-features-box">
        <div class="feature-item">
          <span class="feature-label">Plataforma</span>
          <span class="feature-val">Sistema DEPO v1.7.0</span>
        </div>
        <div class="feature-item">
          <span class="feature-label">Alcance</span>
          <span class="feature-val">Depósito Central y Subsedes</span>
        </div>
        <div class="feature-item">
          <span class="feature-label">Seguridad</span>
          <span class="feature-val">RBAC &bull; Trazabilidad Total</span>
        </div>
        <div class="feature-item">
          <span class="feature-label">Emisión</span>
          <span class="feature-val">Septiembre 2026</span>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong>Sistema DEPO Stock</strong> &bull; San Juan, Argentina<br>
        Documento oficial de inducción y soporte para agentes operativos de depósito.
      </div>
      <div style="text-align: right;">
        Código: <strong>MAN-OP-2026-V2</strong><br>
        Estado: <strong>VIGENTE / OPERATIVO</strong>
      </div>
    </div>
  </div>

  <!-- ==================== PÁGINA 2: CAPÍTULO 1 ==================== -->
  <div class="header-doc">
    <span>Sistema DEPO &bull; Manual de Instrucciones para el Operador</span>
    <span>Ministerio de Educación de San Juan</span>
  </div>

  <h2><span class="sec-num">1</span> Introducción y Perfil del Operador de Depósito</h2>

  <p>
    El <strong>Operador de Depósito</strong> cumple un rol fundamental en la custodia física, registración en tiempo real, conservación y descarte auditado de todos los suministros (insumos de limpieza, útiles pedagógicos, alimentos para comedores, mobiliario y tecnología) en los depósitos y almacenes dependientes del Ministerio de Educación de San Juan.
  </p>

  <div class="grid-2">
    <div class="card-mini" style="border-left: 3px solid #ff8200;">
      <strong>Misión Operativa</strong>
      <span>Asegurar el ingreso conforme de mercadería, su correcta clasificación en estanterías/pallets, el control de mermas/roturas y el equilibrio estricto de existencias físicas.</span>
    </div>
    <div class="card-mini" style="border-left: 3px solid #10b981;">
      <strong>Principio PEPS / FIFO</strong>
      <span>Primero en Entrar, Primero en Salir. Priorización estricta de rotación para alimentos y productos perecederos según su fecha de vencimiento más cercana.</span>
    </div>
  </div>

  <h3>1.1. Principios de Seguridad y Confidencialidad</h3>
  <ul>
    <li><strong>Confidencialidad Comercial:</strong> El perfil operador tiene acceso restringido: visualiza artículos, descripciones técnicas, marcas y cantidades físicas, pero <em>no visualiza montos monetarios, cotizaciones ni precios de licitación</em>.</li>
    <li><strong>Principio de Constancia Documental:</strong> No se admite ningún movimiento, traslado ni descarte físico que no esté debidamente respaldado por una transacción registrada en el sistema y un comprobante oficial.</li>
    <li><strong>Responsabilidad de Usuario:</strong> Las credenciales de acceso son personales e intransferibles. Cada movimiento registrado queda asentado con la firma digital y el ID del operador en la auditoría ministerial.</li>
  </ul>

  <h3>1.2. Matriz de Permisos del Rol Operador (RBAC)</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Módulo</th>
        <th style="width: 50%;">Acciones Habilitadas</th>
        <th style="width: 26%;">Límites y Restricciones</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Dashboard</strong></td>
        <td>Visualizar métricas globales, stock bajo, alertas de vencimiento (60 días) y actividad reciente.</td>
        <td>Modo solo lectura.</td>
      </tr>
      <tr>
        <td><strong>Catálogo Productos</strong></td>
        <td>Consulta maestro, búsqueda SKU/código de barras, alta de ítems, edición de stock mínimo y desglose de lotes.</td>
        <td>No puede borrar productos (restringido a Administrador).</td>
      </tr>
      <tr>
        <td><strong>Multidepósito</strong></td>
        <td>Conmutación entre almacenes, consulta por ubicación, registro de traslados y emisión de comprobantes oficiales.</td>
        <td>Cápsula de seguridad requiere autorización para egresos.</td>
      </tr>
      <tr>
        <td><strong>Movimientos</strong></td>
        <td>Registrar ingresos manuales/lote, egresos operativos, devoluciones y visualización de auditoría.</td>
        <td>No permite edición directa de registros históricos ya asentados.</td>
      </tr>
      <tr>
        <td><strong>Bajas / Scrap</strong></td>
        <td>Declaración de bienes rotos o vencidos con cálculo automático de unidades útiles y fotos de evidencia.</td>
        <td>Baja patrimonial final requiere firma de Compras.</td>
      </tr>
      <tr>
        <td><strong>Diagnóstico</strong></td>
        <td>Chequeo de integridad entre stock global y depósitos; ejecución de reconciliación atómica ante desvíos.</td>
        <td>Genera registro de auditoría ministerial por corrección.</td>
      </tr>
      <tr>
        <td><strong>Proveedores</strong></td>
        <td>Consulta de padrón, creación y edición de datos de contacto y rubros de proveedores.</td>
        <td>Sin acceso a cuentas corrientes ni libramientos de pago.</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== PÁGINA 3: CAPÍTULO 2 ==================== -->
  <div class="page-break"></div>
  <div class="header-doc">
    <span>Sistema DEPO &bull; Manual de Instrucciones para el Operador</span>
    <span>Capítulo 2: Acceso y Entorno de Trabajo</span>
  </div>

  <h2><span class="sec-num">2</span> Acceso al Sistema y Entorno de Trabajo</h2>

  <p>
    El Sistema DEPO es una plataforma web accesible desde cualquier navegador moderno (Google Chrome, Mozilla Firefox, Microsoft Edge) en computadoras de escritorio, terminales fijas o tablets en las zonas de racks.
  </p>

  <h3>2.1. Procedimiento de Inicio de Sesión (Login)</h3>
  <div class="step-box">
    <div class="step-header">
      <div class="step-number">1</div>
      <div class="step-title">Ingresar a la URL Oficial</div>
    </div>
    <p>Abra el navegador e ingrese a la dirección del servidor (en red local: <code>http://localhost:5173</code> o la dirección IP/dominio provisto por la Dirección de Informática).</p>
  </div>

  <div class="step-box">
    <div class="step-header">
      <div class="step-number">2</div>
      <div class="step-title">Ingreso de Credenciales</div>
    </div>
    <p>Ingrese su correo institucional asignado (ej. <code>operador@depo.local</code> o su correo oficial) y su contraseña. También puede utilizar su número de DNI si fue vinculado en su perfil.</p>
  </div>

  <div class="step-box">
    <div class="step-header">
      <div class="step-number">3</div>
      <div class="step-title">Verificación de Sesión</div>
    </div>
    <p>Presione <strong>"Iniciar Sesión"</strong>. El sistema validará sus credenciales mediante un token de seguridad JWT y abrirá el Dashboard Operativo. En el margen superior derecho observará su nombre y el rol <code>Operador</code>.</p>
  </div>

  <div class="callout callout-warning">
    <div class="callout-icon">⚠️</div>
    <div>
      <strong>Bloqueo por Intentos Fallidos:</strong> Si ingresa erróneamente su contraseña más de 5 veces consecutivas, el limitador de seguridad bloqueará temporalmente los intentos por 15 minutos. Si olvidó su clave, contacte al Administrador del Sistema para un reseteo de credenciales.
    </div>
  </div>

  <h3>2.2. Mapa de Navegación del Operador</h3>
  <p>
    La barra lateral izquierda (Sidebar) organiza las herramientas de trabajo actualmente activas:
  </p>

  <div class="grid-4">
    <div class="card-mini">
      <strong>📊 Inicio</strong>
      <span>Métricas generales, KPIs de inventario y alertas de vencimiento a 60 días.</span>
    </div>
    <div class="card-mini">
      <strong>📦 Productos</strong>
      <span>Catálogo maestro, stock consolidado, filtros por categoría y stock mínimo.</span>
    </div>
    <div class="card-mini">
      <strong>🏛️ Depósitos</strong>
      <span>Inventario por ubicación física, traslados entre almacenes y comprobantes.</span>
    </div>
    <div class="card-mini">
      <strong>⚡ Movimientos</strong>
      <span>Ingresos, egresos, devoluciones y seguimiento de transacciones.</span>
    </div>
  </div>

  <div class="grid-4">
    <div class="card-mini">
      <strong>🛡️ Bajas (Scrap)</strong>
      <span>Declaración de roturas, mercadería vencida y fotos de prueba.</span>
    </div>
    <div class="card-mini">
      <strong>🔍 Diagnóstico</strong>
      <span>Chequeo de integridad de stock y reconciliación atómica de diferencias.</span>
    </div>
    <div class="card-mini">
      <strong>🚚 Proveedores</strong>
      <span>Padrón de empresas proveedoras, CUIT, rubros y teléfonos de contacto.</span>
    </div>
    <div class="card-mini">
      <strong>👤 Mi Cuenta</strong>
      <span>Perfil del usuario operador y cambio periódico de contraseña.</span>
    </div>
  </div>

  <!-- ==================== PÁGINA 4: CAPÍTULOS 3 Y 4 ==================== -->
  <div class="page-break"></div>
  <div class="header-doc">
    <span>Sistema DEPO &bull; Manual de Instrucciones para el Operador</span>
    <span>Capítulos 3 y 4: Dashboard y Catálogo de Productos</span>
  </div>

  <h2><span class="sec-num">3</span> Panel de Control (Dashboard) y Monitoreo Operativo</h2>

  <p>
    Al iniciar la jornada de trabajo, la pantalla de <strong>Inicio</strong> ofrece una radiografía integral del estado del inventario y las prioridades de atención inmediata.
  </p>

  <h3>3.1. Indicadores Clave de Desempeño (KPIs)</h3>
  <ul>
    <li><strong>Total de Productos:</strong> Suma de artículos registrados en el catálogo oficial provincial.</li>
    <li><strong>Stock Bajo Mínimo:</strong> Destacado en color ámbar/rojo. Indica cuántos productos tienen un stock total inferior al umbral de seguridad configurado. Requiere emitir aviso para reposición.</li>
    <li><strong>Productos Sin Stock:</strong> Artículos cuyo saldo en estanterías es exactamente cero.</li>
    <li><strong>Movimientos del Mes:</strong> Cuadro interactivo que clasifica los registros del período: <em>Ingresos</em> (verde), <em>Egresos</em> (rojo), <em>Ajustes</em> (ámbar) y <em>Devoluciones</em> (azul). Al pulsar sobre cualquiera de ellos, se abre el listado detallado del mes.</li>
  </ul>

  <h3>3.2. Widget de Alertas Tempranas de Vencimiento</h3>
  <div class="callout callout-danger">
    <div class="callout-icon">🚨</div>
    <div>
      <strong>Protocolo ante Alertas de Vencimiento (Ventana 60 Días):</strong>
      <ol style="margin-top: 4px; margin-bottom: 0;">
        <li>Identificar en la tarjeta el nombre del producto, el depósito de alojamiento y los días restantes para expirar.</li>
        <li>Dirigirse a la estantería o pallet correspondiente y cotejar visualmente el lote y fecha impresa.</li>
        <li>Priorizar este lote para las próximas salidas operativas (principio PEPS/FIFO).</li>
        <li>Si el producto ya venció o presenta envases dañados, proceder a declarar la <strong>Baja en el Módulo de Scrap</strong>.</li>
      </ol>
    </div>
  </div>

  <h2><span class="sec-num">4</span> Gestión del Catálogo de Productos y Existencias</h2>

  <p>
    En la pestaña <strong>"Productos"</strong> el operador visualiza el listado maestro de bienes y consumibles con herramientas de control físico.
  </p>

  <h3>4.1. Visualización del Detalle de Stock por Depósito</h3>
  <p>
    Cada fila de la tabla incluye el botón de <strong>"Ojo / Detalle"</strong>. Al presionarlo se despliega la información física detallada:
  </p>
  <ul>
    <li><strong>Distribución por Almacenes:</strong> Desglose exacto de cuántas unidades existen en el <em>Depósito Central</em>, en el <em>Centro Cívico</em> o en la <em>Cápsula</em>.</li>
    <li><strong>Trazabilidad de Lotes y Vencimientos:</strong> Listado cronológico de las fechas de vencimiento registradas en cada remito de ingreso.</li>
  </ul>

  <h3>4.2. Funcionalidades Operativas del Catálogo</h3>
  <ul>
    <li><strong>Lector de Código de Barras (SKU):</strong> Captura directa desde pistolas lectoras; escanee el producto para abrir su ficha de forma automática.</li>
    <li><strong>Alta y Edición:</strong> Registro de nuevos productos con nombre, categoría, unidad de medida y stock mínimo sugerido.</li>
    <li><strong>Exportación a Planilla Excel:</strong> Descarga instantánea del catálogo para cotejar durante inventarios físicos periódicos.</li>
  </ul>

  <!-- ==================== PÁGINA 5: CAPÍTULO 5 ==================== -->
  <div class="page-break"></div>
  <div class="header-doc">
    <span>Sistema DEPO &bull; Manual de Instrucciones para el Operador</span>
    <span>Capítulo 5: Gestión Multidepósito y Traslados</span>
  </div>

  <h2><span class="sec-num">5</span> Gestión Multidepósito y Traslados Internos</h2>

  <p>
    El Ministerio de Educación cuenta con distintas dependencias de guarda de insumos. El sistema modela esta realidad mediante la pestaña <strong>"Depósitos"</strong>, permitiendo cambiar de contexto con solo pulsar sobre las pestañas superiores.
  </p>

  <h3>5.1. Clasificación de Depósitos Oficiales</h3>
  <table>
    <thead>
      <tr>
        <th>Depósito</th>
        <th>Tipo en Sistema</th>
        <th>Uso y Naturaleza Operativa</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Depósito Central</strong></td>
        <td><code>central</code></td>
        <td>Nave logística principal. Recepción de camiones de gran porte, almacenamiento en pallets y distribución masiva.</td>
      </tr>
      <tr>
        <td><strong>Centro Cívico</strong></td>
        <td><code>centro_civico</code></td>
        <td>Depósito satélite en edificio ministerial. Insumos de oficina, papelería y suministros de entrega rápida.</td>
      </tr>
      <tr>
        <td><strong>Cápsula de Seguridad</strong></td>
        <td><code>capsula</code></td>
        <td>Área de resguardo restringido para insumos de alto valor unitario (tecnología, notebooks, instrumental especializado).</td>
      </tr>
      <tr>
        <td><strong>Desguace (Scrap)</strong></td>
        <td><code>desguace</code></td>
        <td>Sector de aislamiento para bienes averiados, en desuso o dados de baja pendientes de disposición final.</td>
      </tr>
    </tbody>
  </table>

  <h3>5.2. Procedimiento de Traslado entre Depósitos</h3>
  <p>
    Cuando se requiere transferir mercadería desde el Depósito Central hacia el Centro Cívico (o viceversa), debe registrarse la transferencia para que el inventario se actualice en origen y destino de manera balanceada.
  </p>

  <div class="step-box">
    <div class="step-header">
      <div class="step-number">1</div>
      <div class="step-title">Seleccionar el Depósito de Origen</div>
    </div>
    <p>En la barra superior de pestañas de "Depósitos", pulse sobre el depósito desde donde saldrá la mercadería.</p>
  </div>

  <div class="step-box">
    <div class="step-header">
      <div class="step-number">2</div>
      <div class="step-title">Abrir Modal de Traslado</div>
    </div>
    <p>Haga clic en el botón <strong>"Traslado"</strong> (icono de flechas de recarga). Se desplegará el formulario correspondiente.</p>
  </div>

  <div class="step-box">
    <div class="step-header">
      <div class="step-number">3</div>
      <div class="step-title">Completar Datos y Destino</div>
    </div>
    <p>Seleccione el <strong>Producto</strong>, ingrese la <strong>Cantidad</strong> a trasladar, seleccione el <strong>Depósito Destino</strong> e indique el <strong>Motivo</strong> (ej. <em>"Reabastecimiento de insumos para entrega en sede central"</em>).</p>
  </div>

  <div class="step-box">
    <div class="step-header">
      <div class="step-number">4</div>
      <div class="step-title">Confirmar y Emitir Comprobante Oficial</div>
    </div>
    <p>Presione <strong>"Confirmar Traslado"</strong>. El sistema descontará el stock en origen, lo incrementará en destino y habilitará la impresión del <strong>Comprobante Oficial de Traslado</strong> con el logo del Gobierno de San Juan y los espacios para firma de quien entrega y quien recibe.</p>
  </div>

  <!-- ==================== PÁGINA 6: CAPÍTULO 6 (BAJAS / SCRAP) ==================== -->
  <div class="page-break"></div>
  <div class="header-doc">
    <span>Sistema DEPO &bull; Manual de Instrucciones para el Operador</span>
    <span>Capítulo 6: Bajas y Descartes de Mercadería</span>
  </div>

  <h2><span class="sec-num">6</span> Módulo de Bajas y Descartes de Mercadería (Scrap)</h2>

  <p>
    Durante el almacenamiento o la manipulación pueden suscitarse averías, roturas accidentales o expiración de fechas de consumo. Para resguardar la transparencia patrimonial del Estado, todo descarte debe registrarse formalmente en la pestaña <strong>"Bajas"</strong>.
  </p>

  <h3>6.1. Formulario Transaccional de Descarte</h3>
  <div class="step-box">
    <div class="step-header">
      <div class="step-number">1</div>
      <div class="step-title">Selección de Ubicación y Producto</div>
    </div>
    <p>Presione <strong>"Declarar Baja"</strong>. Elija el depósito de origen y el producto afectado del selector desplegable.</p>
  </div>

  <div class="step-box">
    <div class="step-header">
      <div class="step-number">2</div>
      <div class="step-title">Inspección de Unidades</div>
    </div>
    <p>Ingrese el <strong>Total de Unidades Inspeccionadas</strong> y las <strong>Unidades Dañadas</strong>. El sistema calcula automáticamente la diferencia: las unidades en buen estado se mantienen registradas en el inventario apto y las dañadas pasan al circuito de descarte.</p>
  </div>

  <div class="step-box">
    <div class="step-header">
      <div class="step-number">3</div>
      <div class="step-title">Motivo y Carga de Evidencia Fotográfica</div>
    </div>
    <p>Redacte con precisión la causa de la merma (ej. <em>"Rotura de envases por estiba deficiente en transporte"</em> o <em>"Vencimiento operado en depósito"</em>). Adjunte mediante el selector de archivos la <strong>fotografía clara del daño</strong> como prueba fehaciente.</p>
  </div>

  <div class="step-box">
    <div class="step-header">
      <div class="step-number">4</div>
      <div class="step-title">Historial y Autorización</div>
    </div>
    <p>La baja queda asentada en estado <code>pendiente</code>. Desde la tabla histórica, el operador puede consultar la foto en tamaño completo y monitorear cuándo la autoridad administrativa emite la autorización definitiva.</p>
  </div>

  <div class="callout callout-warning">
    <div class="callout-icon">📸</div>
    <div>
      <strong>Criterio Fotográfico Obligatorio:</strong> La fotografía debe mostrar con claridad el lote, el número de serie (en bienes tecnológicos) y la rotura o anomalía física. No se admitirán bajas sin evidencia visual.
    </div>
  </div>

  <!-- ==================== PÁGINA 7: CAPÍTULOS 7 Y 8 ==================== -->
  <div class="page-break"></div>
  <div class="header-doc">
    <span>Sistema DEPO &bull; Manual de Instrucciones para el Operador</span>
    <span>Capítulos 7 y 8: Diagnóstico, Buenas Prácticas y FAQ</span>
  </div>

  <h2><span class="sec-num">7</span> Diagnóstico y Reconciliación de Stock</h2>

  <p>
    En operaciones con alto volumen de ingresos y egresos diarios, pueden suscitarse desfasajes entre la suma de existencias en los depósitos y el stock del catálogo general. La herramienta <strong>"Diagnóstico de Stock"</strong> permite al operador fiscalizar la integridad de los datos.
  </p>

  <div class="grid-2">
    <div class="card-mini" style="border-left: 3px solid #10b981;">
      <strong>Semáforo Verde: Stock Consistente</strong>
      <span>El sistema confirma que todos los productos tienen exacta concordancia entre el inventario global y los depósitos.</span>
    </div>
    <div class="card-mini" style="border-left: 3px solid #ef4444;">
      <strong>Semáforo Rojo: Inconsistencia Detectada</strong>
      <span>Señala cuántos artículos presentan desvíos y lista el producto, el saldo global y la sumatoria física.</span>
    </div>
  </div>

  <p>
    En caso de diferencias, el operador dispone del botón <strong>"Reconciliar Stock"</strong>, que reescribe de manera atómica el stock general para igualarlo a las existencias físicas registradas en los almacenes, generando un asiento de auditoría formal.
  </p>

  <h2><span class="sec-num">8</span> Buenas Prácticas, Soporte y Preguntas Frecuentes</h2>

  <div class="callout callout-warning">
    <div class="callout-icon">📌</div>
    <div>
      <strong>Reglas de Oro del Operador de Depósito:</strong>
      <ul style="margin: 4px 0 0 16px;">
        <li><strong>Constancia Documental Obligatoria:</strong> Ningún bien o insumo ingresa, se traslada o se descarta sin comprobante firmado y registrado.</li>
        <li><strong>Rotación Bromatológica:</strong> Mantener siempre la política PEPS/FIFO para garantizar la calidad y aptitud de los insumos destinados a escuelas.</li>
        <li><strong>Verificación Periódica:</strong> Ejecutar el Diagnóstico de Stock al inicio y al cierre de cada semana operativa para prevenir discrepancias en auditorías.</li>
      </ul>
    </div>
  </div>

  <h3>Preguntas Frecuentes (FAQ)</h3>
  <p><strong>¿Qué hacer ante mercadería rota o dañada durante la estiba?</strong><br>
  No la ingrese como stock apto ni la descarte informalmente. Declare la baja en el módulo de Bajas cargando las unidades defectuosas y la fotografía de respaldo.</p>

  <p><strong>¿Qué hacer si un producto no aparece en el lector de código de barras?</strong><br>
  Utilice el buscador manual por nombre o categoría en el módulo de Productos. Si es un artículo nuevo, coordine su alta ingresando su código SKU oficial.</p>

  <p><strong>¿Quién autoriza los traslados hacia la Cápsula de Seguridad?</strong><br>
  Los bienes de alta custodia requieren previa autorización administrativa del Director de Área o Administrador del sistema antes de su almacenamiento definitivo.</p>

  <div style="margin-top: 25px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 8pt; color: #94a3b8;">
    Documento oficial aprobado por el Ministerio de Educación &bull; Gobierno de San Juan &bull; Sistema DEPO
  </div>

</body>
</html>`;

async function generatePdf() {
  console.log('Iniciando generación de PDF (7 páginas) con Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  const outputPath = path.join(__dirname, 'MANUAL_INSTRUCCIONES_OPERADOR.pdf');

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '12mm',
      right: '12mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 7.5pt; font-family: sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 14mm; color: #94a3b8;">
        <span>Sistema DEPO - Ministerio de Educación de San Juan</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `
  });

  await browser.close();
  console.log('PDF generado exitosamente en:', outputPath);

  const stats = fs.statSync(outputPath);
  console.log('Tamaño del archivo:', stats.size, 'bytes');
}

generatePdf().catch(err => {
  console.error('Error generando el PDF:', err);
  process.exit(1);
});
