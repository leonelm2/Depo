# Guía de Roles y Funciones: Sistema de Gestión Depo

Este documento detalla las capacidades y flujos de trabajo para cada rol dentro del sistema, ideal para capacitación y exposición del proyecto.

---

## 1. Directivo (Nivel Escuela)
**Objetivo**: Gestionar las necesidades de insumos de su institución.

*   **Solicitud Anual**: Generar el pedido de suministros para todo el ciclo lectivo basado en el Kit asignado a su tipo de escuela.
*   **Solicitud de Refuerzos**: Realizar pedidos extraordinarios de productos específicos cuando el stock anual sea insuficiente.
*   **Modalidad de Entrega**:
    *   Puede generar solicitud para **retiro presencial**.
    *   Puede marcar **solicitar envio** para que el operador procese su entrega dentro del flujo por departamento.
*   **Seguimiento Logístico**: 
    *   Visualizar el estado de su pedido en tiempo real (Pendiente, Autorizado, Licitación, En Depósito Central).
    *   Verificar cantidades recibidas vs. cantidades solicitadas.
*   **Descarga de Comprobantes**: Imprimir comprobantes de retiro una vez que la mercadería está lista para ser buscada o entregada.

---

## 2. Supervisor (Gestión Intermedia)
**Objetivo**: Validar la pertinencia de los pedidos de su zona.

*   **Bandeja de Aprobación**: Revisar los pedidos (Anuales y Refuerzos) de las escuelas bajo su jurisdicción.
*   **Gestión de Excepciones**:
    *   **Aprobar**: Pasa el pedido al siguiente nivel (Director de Área).
    *   **Rechazar**: Cancela el pedido indicando un motivo.
    *   **Pedir Aclaración**: Devuelve el pedido al Directivo para que corrija o justifique datos, sin cancelarlo.
*   **Patrimonio Escolar**: Gestionar tickets de mobiliario y activos fijos de sus escuelas.

---

## 3. Director de Área (Planificación y Control)
**Objetivo**: Consolidar la demanda y gestionar la estructura del sistema.

*   **Autorización Final**: Último paso de aprobación antes de que los pedidos pasen a ser licitados.
*   **Consolidación de Planilla Anual**: Visualizar el "Listado Final a Licitar", que agrupa todos los pedidos de todas las escuelas para negociar volúmenes con proveedores.
*   **Configuración de Kits**: Definir qué productos y en qué cantidades componen los Kits (ej: Kit Comedor, Kit Albergue, Kit Copa de Leche).
*   **Gestión de Zonas**: Asignar escuelas a supervisores y organizar la estructura territorial.

---

## 4. Área de Compras (Gestión Comercial y Adjudicación)
**Objetivo**: Transformar pedidos en mercadería real al mejor costo y volumen optimizado.

*   **Gestión de Proveedores**: Mantener la base de datos de proveedores (CUIT, Razón Social, Rubro, Contacto).
*   **Listado Final a Licitar**:
    *   Visualizar el consolidado total de productos requeridos por todas las escuelas.
    *   Consultar el **Stock Actual** del depósito como referencia visual para decidir la cantidad final a comprar.
    *   Editar las cantidades finales a licitar y **Cerrar Licitación** para bloquear la edición y habilitar la adjudicación.
*   **Licitación y Adjudicación**: 
    *   Cargar precios de proveedores y adjudicar productos (mejor oferta).
    *   *Unificación*: Los productos con el mismo nombre se muestran agrupados para facilitar la adjudicación masiva.
    *   *Flexibilidad*: Permite regresar al paso anterior (reabrir listado) si se necesita corregir cantidades antes de finalizar la adjudicación.
*   **Gestión de Entregas**: "Enviar a Depósito" la información de las licitaciones cerradas para que el operador sepa qué debe recibir y de qué proveedor.
*   **Auditoría de Precios**: Único rol (junto al Admin) con acceso a los costos y comparativas económicas.


---

## 5. Operador de Depósito (Logística y Stock)
**Objetivo**: Control físico de la mercadería, trazabilidad de existencias y distribución territorial a las instituciones educativas.

*   **Recepción de Licitación**: 
    *   Registrar el ingreso físico de camiones de proveedores tras adjudicación de Compras.
    *   Cargar números de remito, fechas de vencimiento y cantidades recibidas (totales o parciales).
    *   *Consolidación*: Los productos se muestran agrupados por nombre y tipo para agilizar la verificación en rampa de descarga.
    *   *Seguridad*: El operador no ve precios ni datos comerciales; solo cantidades físicas, especificaciones y productos.
*   **Distribución a Escuelas y Envíos por Departamento**: 
    *   **Retiro Presencial**: Atención en depósito a directivos o personal escolar autorizado mediante el modal transaccional de entrega con control de remanentes y stock disponible.
    *   **Envíos por Departamento (Consolidados)**: Tablero de control territorial que agrupa automáticamente las solicitudes de escuelas con modalidad de envío.
    *   Pantalla de detalle por departamento con desglose tripartito por solicitud: solicitado, ya entregado y pendiente de despacho.
    *   Gestión preventiva de alertas: sección de instituciones que aún no han tramitado su solicitud de retiro.
    *   Confirmación de egreso múltiple por departamento seleccionando el depósito origen (con validaciones de negocio `400` estructuradas en caso de stock insuficiente).
    *   **Armado Directo por Operador**: Posibilidad de confeccionar un envío directo a una o más escuelas seleccionadas sin depender de una solicitud previa del directivo.
*   **Gestión Multidepósito y Traslados**: 
    *   Visualizar y conmutar el inventario físico por ubicación: *Depósito Central*, *Centro Cívico*, *Cápsula de Seguridad* y *Desguace (Scrap)*.
    *   Registrar traslados entre depósitos con generación e impresión del comprobante oficial de traslado firmado por ambas partes.
*   **Control de Inventario y Productos**: 
    *   Consulta del catálogo maestro, control de stock mínimo y código de barras/SKU.
    *   **Detalle de Stock por Depósito**: Modal interactivo que desglosa existencias por almacén y lote de vencimiento.
    *   Gestión de movimientos manuales (ingresos, egresos y devoluciones con opción de conservar reserva).
*   **Módulo de Bajas y Descartes (Scrap)**:
    *   Registro de mercadería dañada o vencida con especificación del total inspeccionado vs. unidades defectuosas (cálculo automático de unidades en buen estado).
    *   Carga de justificación técnica y evidencia fotográfica obligatoria para bienes patrimoniales o dañados.
    *   Trazabilidad mediante historial de estados hasta la autorización definitiva.
*   **Diagnóstico y Reconciliación de Stock**:
    *   Herramienta de integridad para detectar desviaciones entre el stock global del catálogo (`stock_actual`) y la suma desagregada por depósito.
    *   Ejecución de reconciliación atómica de inventario con generación automática de registros de auditoría.
*   **Alertas Tempranas y Dashboard**:
    *   Monitoreo preventivo de la ventana de vencimientos próximos (60 días) para evitar pérdidas de insumos perecederos y alimentos escolares.
    *   Seguimiento de KPIs operativos mensuales (ingresos, egresos, ajustes y stock bajo mínimos).

---

## 6. Administrador (Gestión de Plataforma)
**Objetivo**: Garantizar la operatividad técnica del sistema.

*   **Gestión de Usuarios**: Crear cuentas, resetear contraseñas y asignar roles.
*   **Auditoría Total**: Acceso a todos los módulos para corrección de errores o soporte técnico.
*   **Configuración de Productos**: Mantener el catálogo maestro de productos y unidades de medida.

---

### Flujo Crítico de un Pedido Anual (Resumen):
1. **Directivo** pide → 2. **Supervisor** valida → 3. **Director Área** autoriza → 4. **Compras** licita y adjudica → 5. **Operador** recibe del proveedor → 6. **Operador** entrega a la escuela.

### Flujo de Retiro/Envío (Post Adjudicación)
1. **Directivo** crea solicitud de retiro.
2. Si marca **solicitar envío**, la solicitud entra al tablero de **Envíos por Departamento**.
3. **Operador** abre detalle del departamento y arma cantidades a despachar.
4. **Operador** confirma egreso múltiple.
5. El sistema actualiza movimientos, cantidades entregadas y estado de solicitud.
