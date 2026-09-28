# GOBIERNO DE SAN JUAN
## Ministerio de Educación — Secretaría Administrativa y Financiera
### Sistema DEPO Stock &bull; Versión 1.7.0

---

# MANUAL DE INSTRUCCIONES DE FUNCIONAMIENTO
## ROL OPERADOR DE DEPÓSITO

**Guía de procedimientos técnicos, almacenamiento multidepósito, trazabilidad de existencias por lote, control de vencimientos y gestión de bajas y descartes (scrap).**

- **Documento:** `MAN-OP-2026-V2`
- **Fecha de Emisión:** Septiembre 2026
- **Estado:** VIGENTE / OPERATIVO
- **Archivo PDF Oficial:** [`MANUAL_INSTRUCCIONES_OPERADOR.pdf`](file:///c:/Users/Docente/Depo/MANUAL_INSTRUCCIONES_OPERADOR.pdf)

---

## 1. Introducción y Perfil del Operador de Depósito

El **Operador de Depósito** cumple un rol fundamental en la custodia física, registración en tiempo real, conservación y descarte auditado de todos los suministros (insumos de limpieza, útiles pedagógicos, alimentos para comedores, mobiliario y tecnología) en los depósitos y almacenes dependientes del Ministerio de Educación de San Juan.

### 1.1. Principios Rectores
1. **Misión Operativa:** Asegurar el ingreso conforme de mercadería provista por proveedores, su correcta clasificación en estanterías/pallets, el control de mermas/roturas y el equilibrio estricto de existencias físicas.
2. **Principio PEPS / FIFO:** *Primero en Entrar, Primero en Salir*. Priorización estricta de rotación para alimentos y productos perecederos según su fecha de vencimiento más cercana.
3. **Confidencialidad Comercial:** El perfil operador tiene acceso restringido: visualiza artículos, descripciones técnicas, marcas y cantidades físicas, pero **no visualiza montos monetarios, cotizaciones ni precios de licitación**.
4. **Constancia Documental:** No se admite ningún movimiento, traslado ni descarte físico que no esté respaldado por una transacción registrada en el sistema y un comprobante oficial con firma y sello.
5. **Responsabilidad de Usuario:** Las credenciales de acceso son personales e intransferibles. Cada movimiento registrado queda asentado con la firma digital y el ID del operador en la auditoría ministerial.

### 1.2. Matriz de Permisos del Rol Operador (RBAC)

| Módulo | Acciones Habilitadas | Límites y Restricciones |
|---|---|---|
| **Dashboard** | Visualizar métricas globales, stock bajo, alertas de vencimiento (60 días) y actividad reciente. | Modo solo lectura. |
| **Catálogo Productos** | Consulta maestro, búsqueda SKU/código de barras, alta de ítems, edición de stock mínimo y desglose de lotes. | No puede borrar productos (restringido a Administrador). |
| **Multidepósito** | Conmutación entre almacenes, consulta por ubicación, registro de traslados y emisión de comprobantes oficiales. | Cápsula de seguridad requiere autorización para egresos. |
| **Movimientos** | Registrar ingresos manuales/lote, egresos operativos, devoluciones y visualización de auditoría. | No permite edición directa de registros históricos ya asentados. |
| **Bajas / Scrap** | Declaración de bienes rotos o vencidos con cálculo automático de unidades útiles y fotos de evidencia. | Baja patrimonial final requiere firma de Compras. |
| **Diagnóstico** | Chequeo de integridad entre stock global y depósitos; ejecución de reconciliación atómica ante desvíos. | Genera registro de auditoría ministerial por corrección. |
| **Proveedores** | Consulta de padrón, creación y edición de datos de contacto y rubros de proveedores. | Sin acceso a cuentas corrientes ni libramientos de pago. |

---

## 2. Acceso al Sistema y Entorno de Trabajo

El Sistema DEPO es una plataforma web accesible desde cualquier navegador moderno (Google Chrome, Mozilla Firefox, Microsoft Edge) en computadoras de escritorio, terminales fijas o tablets en las zonas de racks.

### 2.1. Procedimiento de Inicio de Sesión (Login)
1. **Ingresar a la URL Oficial:** Abra el navegador e ingrese a `http://localhost:5173` (o la dirección IP/dominio provisto por Informática).
2. **Ingreso de Credenciales:** Ingrese su correo institucional asignado (ej. `operador@depo.local` o su correo oficial) y su contraseña personal. También puede utilizar su número de DNI si fue vinculado.
3. **Verificación de Sesión:** Presione **"Iniciar Sesión"**. El sistema validará sus credenciales mediante un token JWT y abrirá el Dashboard Operativo con el distintivo **Operador**.

> [!WARNING]
> **Bloqueo por Intentos Fallidos:** Si ingresa erróneamente su contraseña más de 5 veces consecutivas, el limitador de seguridad bloqueará temporalmente los intentos por 15 minutos. Si olvidó su clave, contacte al Administrador del Sistema para un reseteo de credenciales.

### 2.2. Mapa de Navegación del Operador (Sidebar)
- **Inicio:** Métricas generales, KPIs de inventario y alertas de vencimiento a 60 días.
- **Productos:** Catálogo maestro, stock consolidado, filtros por categoría y stock mínimo.
- **Depósitos:** Inventario por ubicación física, traslados entre almacenes y comprobantes oficiales.
- **Movimientos:** Ingresos, egresos, devoluciones y seguimiento de transacciones.
- **Bajas (Scrap):** Declaración de roturas, mercadería vencida y fotos de prueba.
- **Diagnóstico:** Chequeo de integridad de stock y reconciliación atómica de diferencias.
- **Proveedores:** Padrón de empresas proveedoras, CUIT, rubros y teléfonos de contacto.
- **Mi Cuenta:** Perfil del usuario operador y cambio periódico de contraseña.

---

## 3. Panel de Control (Dashboard) y Monitoreo Operativo

### 3.1. Indicadores Clave de Desempeño (KPIs)
- **Total de Productos:** Suma de artículos registrados en el catálogo oficial provincial.
- **Stock Bajo Mínimo:** Destacado en color ámbar/rojo. Indica cuántos productos tienen un stock total inferior al umbral de seguridad configurado. Requiere emitir aviso para reposición.
- **Productos Sin Stock:** Artículos cuyo saldo en estanterías es exactamente cero.
- **Movimientos del Mes:** Cuadro interactivo que clasifica los registros del período: *Ingresos* (verde), *Egresos* (rojo), *Ajustes* (ámbar) y *Devoluciones* (azul). Al pulsar sobre cualquiera de ellos, se abre el listado detallado del mes.

### 3.2. Widget de Alertas Tempranas de Vencimiento
> [!CAUTION]
> **Protocolo ante Alertas de Vencimiento (Ventana 60 Días):**
> 1. Identificar en la tarjeta el nombre del producto, el depósito de alojamiento y los días restantes para expirar.
> 2. Dirigirse a la estantería o pallet correspondiente y cotejar visualmente el lote y fecha impresa.
> 3. Priorizar este lote para las próximas salidas operativas (principio PEPS/FIFO).
> 4. Si el producto ya venció o presenta envases dañados, proceder a declarar la **Baja en el Módulo de Scrap**.

---

## 4. Gestión del Catálogo de Productos y Existencias

### 4.1. Visualización del Detalle de Stock por Depósito
Pulsando el icono de **"Ojo / Detalle"** en cualquier producto del catálogo, se visualiza:
- **Distribución por Almacenes:** Desglose exacto de cuántas unidades existen en el *Depósito Central*, en el *Centro Cívico* o en la *Cápsula*.
- **Trazabilidad de Lotes y Vencimientos:** Listado cronológico de las fechas de vencimiento registradas en cada remito de ingreso.

### 4.2. Funcionalidades Operativas del Catálogo
- **Lector de Código de Barras (SKU):** Captura directa desde pistolas lectoras; escanee el producto para abrir su ficha de forma automática.
- **Alta y Edición:** Registro de nuevos productos con nombre, categoría, unidad de medida y stock mínimo sugerido.
- **Exportación a Planilla Excel:** Descarga instantánea del catálogo para cotejar durante inventarios físicos periódicos.

---

## 5. Gestión Multidepósito y Traslados Internos

### 5.1. Clasificación de Depósitos Oficiales
- **Depósito Central (`central`):** Nave logística principal. Recepción de camiones de gran porte, almacenamiento en pallets y distribución masiva.
- **Centro Cívico (`centro_civico`):** Depósito satélite en edificio ministerial. Insumos de oficina, papelería y suministros de entrega rápida.
- **Cápsula de Seguridad (`capsula`):** Área de resguardo restringido para insumos de alto valor unitario (tecnología, notebooks, instrumental especializado).
- **Desguace / Scrap (`desguace`):** Sector de aislamiento para bienes averiados, en desuso o dados de baja pendientes de disposición final.

### 5.2. Procedimiento de Traslado entre Depósitos
1. **Seleccionar el Depósito de Origen:** En la barra superior de pestañas de "Depósitos", pulse sobre el depósito desde donde saldrá la mercadería.
2. **Abrir Modal de Traslado:** Haga clic en el botón **"Traslado"** (icono de flechas de recarga). Se desplegará el formulario correspondiente.
3. **Completar Datos y Destino:** Seleccione el Producto, ingrese la Cantidad a trasladar, seleccione el Depósito Destino e indique el Motivo (ej. *"Reabastecimiento de insumos para entrega en sede central"*).
4. **Confirmar y Emitir Comprobante Oficial:** Presione **"Confirmar Traslado"**. El sistema descontará el stock en origen, lo incrementará en destino y habilitará la impresión del **Comprobante Oficial de Traslado** con el logo del Gobierno de San Juan y los espacios para firma de quien entrega y quien recibe.

---

## 6. Módulo de Bajas y Descartes de Mercadería (Scrap)

Durante el almacenamiento o la manipulación pueden suscitarse averías, roturas accidentales o expiración de fechas de consumo. Para resguardar la transparencia patrimonial del Estado, todo descarte debe registrarse formalmente en la pestaña **"Bajas"**.

### 6.1. Formulario Transaccional de Descarte
1. **Selección de Ubicación y Producto:** Presione **"Declarar Baja"**. Elija el depósito de origen y el producto afectado del selector desplegable.
2. **Inspección de Unidades:** Ingrese el **Total de Unidades Inspeccionadas** y las **Unidades Dañadas**. El sistema calcula automáticamente la diferencia: las unidades en buen estado se mantienen registradas en el inventario apto y las dañadas pasan al circuito de descarte.
3. **Motivo y Carga de Evidencia Fotográfica:** Redacte con precisión la causa de la merma (ej. *"Rotura de envases por estiba deficiente en transporte"* o *"Vencimiento operado en depósito"*). Adjunte mediante el selector de archivos la **fotografía clara del daño** como prueba fehaciente.
4. **Historial y Autorización:** La baja queda asentada en estado `pendiente`. Desde la tabla histórica, el operador puede consultar la foto en tamaño completo y monitorear cuándo la autoridad administrativa emite la autorización definitiva.

> [!WARNING]
> **Criterio Fotográfico Obligatorio:** La fotografía debe mostrar con claridad el lote, el número de serie (en bienes tecnológicos) y la rotura o anomalía física. No se admitirán bajas sin evidencia visual.

---

## 7. Diagnóstico y Reconciliación de Stock

En operaciones con alto volumen de ingresos y egresos diarios, pueden suscitarse desfasajes entre la suma de existencias en los depósitos y el stock del catálogo general. La herramienta **"Diagnóstico de Stock"** permite al operador fiscalizar la integridad de los datos.

- **Semáforo Verde (Stock Consistente):** El sistema confirma que todos los productos tienen exacta concordancia entre el inventario global y los depósitos.
- **Semáforo Rojo (Inconsistencia Detectada):** Señala cuántos artículos presentan desvíos y lista el producto, el saldo global y la sumatoria física.
- **Reconciliación Atómica:** En caso de diferencias, el operador dispone del botón **"Reconciliar Stock"**, que reescribe de manera atómica el stock general para igualarlo a las existencias físicas registradas en los almacenes, generando un asiento de auditoría formal.

---

## 8. Buenas Prácticas, Soporte y Preguntas Frecuentes

> [!IMPORTANT]
> **Reglas de Oro del Operador de Depósito:**
> - **Constancia Documental Obligatoria:** Ningún bien o insumo ingresa, se traslada o se descarta sin comprobante firmado y registrado.
> - **Rotación Bromatológica:** Mantener siempre la política PEPS/FIFO para garantizar la calidad y aptitud de los insumos destinados a escuelas.
> - **Verificación Periódica:** Ejecutar el Diagnóstico de Stock al inicio y al cierre de cada semana operativa para prevenir discrepancias en auditorías.

### Preguntas Frecuentes (FAQ)
- **¿Qué hacer ante mercadería rota o dañada durante la estiba?**<br>
  No la ingrese como stock apto ni la descarte informalmente. Declare la baja en el módulo de Bajas cargando las unidades defectuosas y la fotografía de respaldo.
- **¿Qué hacer si un producto no aparece en el lector de código de barras?**<br>
  Utilice el buscador manual por nombre o categoría en el módulo de Productos. Si es un artículo nuevo, coordine su alta ingresando su código SKU oficial.
- **¿Quién autoriza los traslados hacia la Cápsula de Seguridad?**<br>
  Los bienes de alta custodia requieren previa autorización administrativa del Director de Área o Administrador del sistema antes de su almacenamiento definitivo.

---
*Documento oficial aprobado por el Ministerio de Educación &bull; Gobierno de San Juan &bull; Sistema DEPO*
