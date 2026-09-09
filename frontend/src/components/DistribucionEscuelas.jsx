import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import ActionIcon from './ui/ActionIcon'

export default function DistribucionEscuelas() {
  const { token } = useAuth()
  const [vista, setVista] = useState('envios')
  const [zonas, setZonas] = useState([])
  const [detalleZona, setDetalleZona] = useState(null)
  const [departamentosEnvio, setDepartamentosEnvio] = useState([])
  const [detalleDepartamento, setDetalleDepartamento] = useState(null)
  const [seguimientoEnvio, setSeguimientoEnvio] = useState([])
  const [resumenSeguimiento, setResumenSeguimiento] = useState(null)
  const [detalleSeguimiento, setDetalleSeguimiento] = useState(null)
  const [depositos, setDepositos] = useState([])
  const [selectedDeposito, setSelectedDeposito] = useState('')
  const [entregas, setEntregas] = useState({})
  const [entregasEnvio, setEntregasEnvio] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadingEnvio, setLoadingEnvio] = useState(false)
  const [loadingSeguimiento, setLoadingSeguimiento] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingEnvio, setSavingEnvio] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const [tipoEnvio, setTipoEnvio] = useState('directo')
  const [selectedSede, setSelectedSede] = useState('')

  const [solicitudesSede, setSolicitudesSede] = useState([])
  const [loadingSedes, setLoadingSedes] = useState(false)
  const [loteImprimible, setLoteImprimible] = useState(null)
  const [valeImprimible, setValeImprimible] = useState(null)
  const [expandedSols, setExpandedSols] = useState({})

  // Modal de resultado de entrega (Exitosa / Rotura / Retorno)
  const [loteResultadoModal, setLoteResultadoModal] = useState(null)
  const [loteItemsResultado, setLoteItemsResultado] = useState([])
  const [resultadoTipo, setResultadoTipo] = useState('exitosa')
  const [itemsDanosMap, setItemsDanosMap] = useState({})
  const [observacionesResultado, setObservacionesResultado] = useState('')

  // Armado directo por operador
  const [todosDepartamentos, setTodosDepartamentos] = useState([])
  const [opDepartamento, setOpDepartamento] = useState('')
  const [opEscuelaBusqueda, setOpEscuelaBusqueda] = useState('')
  const [opFechaSalida, setOpFechaSalida] = useState(new Date().toISOString().split('T')[0])
  const [opDetalleDepto, setOpDetalleDepto] = useState(null)
  const [opEntregas, setOpEntregas] = useState({})
  const [loadingOp, setLoadingOp] = useState(false)
  const [savingOp, setSavingOp] = useState(false)

  // Modal para despacho con fecha real de salida del camión (Doble fecha)
  const [loteDespachoModal, setLoteDespachoModal] = useState(null)
  const [fechaDespachoReal, setFechaDespachoReal] = useState(new Date().toISOString().split('T')[0])
  const [obsDespacho, setObsDespacho] = useState('')

  const anioActual = new Date().getFullYear()

  const totalEscuelasConCarga = useMemo(() => {
    return Object.values(entregas).filter((items) => {
      return Object.values(items || {}).some((qty) => Number(qty) > 0)
    }).length
  }, [entregas])

  const totalSolicitudesConCarga = useMemo(() => {
    return Object.values(entregasEnvio).filter((items) => {
      return Object.values(items || {}).some((qty) => Number(qty) > 0)
    }).length
  }, [entregasEnvio])

  const escuelasSede = useMemo(() => {
    if (!detalleDepartamento?.solicitudes) return []
    const unique = new Map()
    for (const sol of detalleDepartamento.solicitudes) {
      if (sol.id_institucion && !unique.has(sol.id_institucion)) {
        unique.set(sol.id_institucion, {
          id_institucion: sol.id_institucion,
          nombre: sol.institucion_nombre,
          cue: sol.cue,
          establecimiento_cabecera: sol.establecimiento_cabecera
        })
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [detalleDepartamento])

  const resumenEgresos = useMemo(() => {
    const map = new Map()
    if (!detalleDepartamento?.solicitudes) return []
    for (const sol of detalleDepartamento.solicitudes) {
      for (const item of (sol.productos_pedido_anual || [])) {
        if (!item.en_solicitud || !item.cantidad_solicitada_solicitud) continue
        const qty = Number(item.cantidad_solicitada_solicitud)
        if (qty <= 0) continue
        const id = Number(item.producto_id)
        if (!map.has(id)) {
          map.set(id, {
            producto_id: id,
            producto_nombre: item.producto_nombre,
            unidad_medida: item.unidad_medida,
            cantidad: 0
          })
        }
        map.get(id).cantidad += qty
      }
    }
    return Array.from(map.values())
  }, [detalleDepartamento])

  const toggleSolicitudDetalle = (solicitudId) => {
    setExpandedSols(prev => ({
      ...prev,
      [solicitudId]: !prev[solicitudId]
    }))
  }

  const handlePrintLote = async (loteId) => {
    try {
      const res = await apiFetch(`/api/entregas/solicitudes-envio/seguimiento/${loteId}`, { token })
      if (!res.ok) {
        setMsg({ text: 'No se pudo cargar la información para imprimir el comprobante', type: 'error' })
        return
      }
      const data = await res.json()
      const { lote, instituciones } = data

      if (!lote) {
        setMsg({ text: 'Información del lote no encontrada', type: 'error' })
        return
      }

      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) return

      const fmtDate = v => v ? new Date(v).toLocaleDateString('es-AR') : '-'

      // Build resumen consolidado de productos
      const resumenMap = {}
      for (const inst of (instituciones || [])) {
        for (const item of (inst.items || [])) {
          const key = item.producto_nombre
          if (!resumenMap[key]) resumenMap[key] = { nombre: key, unidad: item.unidad_medida || 'unidad', total: 0 }
          resumenMap[key].total += Number(item.cantidad_planificada || 0)
        }
      }
      const resumenList = Object.values(resumenMap)
      let resumenHtml = resumenList.map(r =>
        '<tr>' +
        '<td style="border:1px solid #d1d5db;padding:6px 8px;font-weight:600">' + r.nombre + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;font-weight:bold;font-size:1.1rem;color:#ff8200">' + r.total + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;color:#555">' + r.unidad + '</td>' +
        '</tr>'
      ).join('')

      let itemsHtml = ''
      for (const inst of (instituciones || [])) {
        const rowsHtml = (inst.items || []).map(item =>
          '<tr>' +
          '<td style="border:1px solid #d1d5db;padding:6px 8px">' + item.producto_nombre + '</td>' +
          '<td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;font-weight:bold">' + item.cantidad_planificada + '</td>' +
          '<td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;color:#555">' + (item.unidad_medida || 'unidad') + '</td>' +
          '</tr>'
        ).join('')
        itemsHtml +=
          '<div style="margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;padding:12px;page-break-inside:avoid">' +
          '<div style="font-weight:bold;font-size:1.05rem;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px">' +
          inst.institucion_nombre + ' (CUE: ' + (inst.cue || '-') + ')' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse">' +
          '<thead><tr style="background:#f3f4f6">' +
          '<th style="border:1px solid #d1d5db;padding:6px 8px;text-align:left">Producto</th>' +
          '<th style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;width:120px">Cantidad</th>' +
          '<th style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;width:120px">Unidad</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
          '</table></div>'
      }

      const modalidad = lote.tipo_envio === 'escuela_sede' ? 'Agrupado en Escuela Sede' : 'Envío Directo a Escuelas'
      const operador = ((lote.usuario_nombre || '') + ' ' + (lote.usuario_apellido || '')).trim()
      const obsHtml = lote.observaciones
        ? '<div style="grid-column:1/-1"><strong>Observaciones:</strong> ' + lote.observaciones + '</div>'
        : ''

      const html =
        '<!DOCTYPE html><html><head>' +
        '<title>Comprobante Lote #' + lote.lote_id + '</title>' +
        '<style>' +
        '* { box-sizing: border-box; font-family: Arial, sans-serif; }' +
        'body { margin: 24px; color: #111827; font-size: 13px; }' +
        'table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }' +
        '@media print { .no-print { display:none; } body { margin: 12px; } }' +
        '</style></head><body>' +
        // Header
        '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #FF8200;padding-bottom:12px;margin-bottom:18px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<img src="/faviconmin.png" alt="Logo" style="height:44px;width:auto" />' +
        '<div><strong style="font-size:1.1rem;display:block">San Juan Gobierno</strong>' +
        '<span style="color:#666;font-size:0.85rem">Ministerio de Educación</span></div>' +
        '</div>' +
        '<div style="text-align:right">' +
        '<strong style="font-size:1.1rem;display:block">Comprobante de Egreso Consolidado</strong>' +
        '<span style="color:#666;font-size:0.9rem">Lote de Envío #' + lote.lote_id + '</span>' +
        '</div></div>' +
        // Datos del lote
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0">' +
        '<div><strong>Departamento Destino:</strong> ' + (lote.departamento || '-') + '</div>' +
        '<div><strong>Depósito de Origen:</strong> ' + (lote.deposito_nombre || '-') + '</div>' +
        '<div><strong>Fecha Emisión:</strong> ' + fmtDate(lote.created_at) + '</div>' +
        '<div><strong>Modalidad:</strong> ' + modalidad + '</div>' +
        '<div style="grid-column:1/-1"><strong>Operador Emisor:</strong> ' + operador + '</div>' +
        obsHtml +
        '</div>' +
        // Resumen consolidado
        '<h3 style="margin-top:20px;border-bottom:2px solid #FF8200;padding-bottom:6px;color:#ff8200">Resumen Total de Productos a Egresar</h3>' +
        '<table style="margin-bottom:20px">' +
        '<thead><tr style="background:#fff7ed">' +
        '<th style="border:1px solid #d1d5db;padding:6px 8px;text-align:left">Producto</th>' +
        '<th style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;width:120px">Total</th>' +
        '<th style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;width:120px">Unidad</th>' +
        '</tr></thead>' +
        '<tbody>' + resumenHtml + '</tbody>' +
        '</table>' +
        // Detalle por institución
        '<h3 style="margin-top:20px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;color:#ff8200">Detalle de Entregas por Institución</h3>' +
        itemsHtml +
        // Firmas
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:60px;page-break-inside:avoid">' +
        '<div style="border-top:1px solid #111827;padding-top:8px;text-align:center">Firma de Operador de Depósito</div>' +
        '<div style="border-top:1px solid #111827;padding-top:8px;text-align:center">Firma y Sello de Recepción</div>' +
        '</div>' +
        '</body></html>'

      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
    } catch {
      setMsg({ text: 'Error de conexión al cargar comprobante del lote', type: 'error' })
    }
  }

  const handlePrintVale = async (valeId) => {
    try {
      const res = await apiFetch(`/api/entregas/vales/${valeId}`, { token })
      if (!res.ok) {
        setMsg({ text: 'No se pudo cargar el vale de reposición', type: 'error' })
        return
      }
      const data = await res.json()
      const { vale, items } = data

      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) return

      const fmtDate = v => v ? new Date(v).toLocaleDateString('es-AR') : '-'

      const itemsHtml = (items || []).map(it =>
        '<tr>' +
        '<td style="border:1px solid #d1d5db;padding:8px 10px;font-weight:600">' + it.producto_nombre + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:8px 10px;text-align:center;font-weight:bold;color:#b91c1c;font-size:1.1rem">' + it.cantidad_danada + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:8px 10px;text-align:center;color:#555">' + (it.unidad_medida || 'unidad') + '</td>' +
        '</tr>'
      ).join('')

      const html =
        '<!DOCTYPE html><html><head>' +
        '<title>Vale de Reposición #' + vale.codigo_vale + '</title>' +
        '<style>' +
        '* { box-sizing: border-box; font-family: Arial, sans-serif; }' +
        'body { margin: 24px; color: #111827; font-size: 13px; }' +
        'table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }' +
        '@media print { .no-print { display:none; } body { margin: 12px; } }' +
        '</style></head><body>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #dc2626;padding-bottom:12px;margin-bottom:18px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<img src="/faviconmin.png" alt="Logo" style="height:44px;width:auto" />' +
        '<div><strong style="font-size:1.1rem;display:block">San Juan Gobierno</strong>' +
        '<span style="color:#666;font-size:0.85rem">Ministerio de Educación - Depósito Central</span></div>' +
        '</div>' +
        '<div style="text-align:right">' +
        '<strong style="font-size:1.1rem;display:block;color:#dc2626">VALE DE REPOSICIÓN POR DAÑO/ROTURA</strong>' +
        '<span style="color:#666;font-size:0.9rem;font-weight:bold">#' + vale.codigo_vale + '</span>' +
        '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;background:#fef2f2;padding:12px;border-radius:6px;border:1px solid #fca5a5">' +
        '<div><strong>Institución Destino:</strong> ' + (vale.institucion_nombre || '-') + '</div>' +
        '<div><strong>CUE:</strong> ' + (vale.cue || '-') + '</div>' +
        '<div><strong>Lote de Origen:</strong> #' + (vale.lote_id || '-') + '</div>' +
        '<div><strong>Depósito Emisor:</strong> ' + (vale.deposito_nombre || 'Depósito Central') + '</div>' +
        '<div><strong>Fecha Emisión:</strong> ' + fmtDate(vale.created_at) + '</div>' +
        '<div><strong>Emisor responsable:</strong> ' + (vale.usuario_nombre || '') + ' ' + (vale.usuario_apellido || '') + '</div>' +
        '<div style="grid-column:1/-1"><strong>Motivo del Vale:</strong> ' + (vale.motivo || 'Rotura / daño en transporte') + '</div>' +
        '</div>' +
        '<h3 style="margin-top:20px;border-bottom:2px solid #dc2626;padding-bottom:6px;color:#dc2626">Detalle de Mercadería Dañada a Reponer</h3>' +
        '<table style="margin-bottom:24px">' +
        '<thead><tr style="background:#fee2e2">' +
        '<th style="border:1px solid #d1d5db;padding:8px 10px;text-align:left">Producto</th>' +
        '<th style="border:1px solid #d1d5db;padding:8px 10px;text-align:center;width:120px">Cantidad Dañada</th>' +
        '<th style="border:1px solid #d1d5db;padding:8px 10px;text-align:center;width:120px">Unidad</th>' +
        '</tr></thead>' +
        '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:60px;page-break-inside:avoid">' +
        '<div style="border-top:1px solid #111827;padding-top:8px;text-align:center">Firma de Emisión Depósito Central</div>' +
        '<div style="border-top:1px solid #111827;padding-top:8px;text-align:center">Firma Transportista / Encargado</div>' +
        '</div>' +
        '</body></html>'

      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
    } catch {
      setMsg({ text: 'Error al imprimir vale de reposición', type: 'error' })
    }
  }

  const handleDespacharLote = async (loteId) => {
    if (!window.confirm(`¿Confirmar el despacho del camión para el Lote #${loteId}? El envío pasará a estado En Tránsito.`)) return
    setSavingEnvio(true)
    try {
      const res = await apiFetch(`/api/entregas/lote/${loteId}/despachar`, {
        method: 'PATCH',
        token
      })
      if (res.ok) {
        setMsg({ text: `Lote #${loteId} despachado exitosamente. Estado: En Tránsito (Despachado)`, type: 'success' })
        loadSeguimientoEnvio()
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudo despachar el lote', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al despachar lote', type: 'error' })
    } finally {
      setSavingEnvio(false)
    }
  }

  const abrirModalResultado = async (lote) => {
    try {
      const res = await apiFetch(`/api/entregas/solicitudes-envio/seguimiento/${lote.lote_id}`, { token })
      if (res.ok) {
        const data = await res.json()
        setLoteResultadoModal(data.lote)
        setLoteItemsResultado(data.instituciones || [])
        setResultadoTipo('exitosa')
        setObservacionesResultado('')

        const initialMap = {}
        for (const inst of (data.instituciones || [])) {
          for (const item of (inst.items || [])) {
            const key = `${inst.id_institucion}:${item.id_producto}`
            initialMap[key] = {
              id_institucion: inst.id_institucion,
              id_producto: item.id_producto,
              cantidad_planificada: item.cantidad_planificada,
              cantidad_recibida: item.cantidad_planificada,
              cantidad_danada: 0,
              motivo_danio: ''
            }
          }
        }
        setItemsDanosMap(initialMap)
      } else {
        setMsg({ text: 'No se pudo cargar el detalle del lote', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error al abrir panel de resultado', type: 'error' })
    }
  }

  const handleGuardarResultadoEntrega = async () => {
    if (!loteResultadoModal?.lote_id) return

    const payloadItems = Object.values(itemsDanosMap).map(item => ({
      id_institucion: item.id_institucion,
      id_producto: item.id_producto,
      cantidad_recibida: Number(item.cantidad_recibida || 0),
      cantidad_danada: Number(item.cantidad_danada || 0),
      motivo_danio: item.motivo_danio || ''
    }))

    setSavingEnvio(true)
    try {
      const res = await apiFetch(`/api/entregas/lote/${loteResultadoModal.lote_id}/registrar-resultado`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          resultado: resultadoTipo,
          observaciones: observacionesResultado,
          items: payloadItems
        })
      })

      if (res.ok) {
        const data = await res.json()
        setMsg({ text: data.message || 'Resultado de entrega registrado correctamente.', type: 'success' })
        if (data.vale_id) {
          setValeImprimible(data.vale_id)
        }
        setLoteResultadoModal(null)
        setLoteItemsResultado([])
        loadSeguimientoEnvio()
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'Error al registrar resultado', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al guardar resultado de entrega', type: 'error' })
    } finally {
      setSavingEnvio(false)
    }
  }

  const verDetalleDepartamentoOperador = async (dept) => {
    setLoadingOp(true)
    setOpEntregas({})
    try {
      const encoded = encodeURIComponent(dept)
      const res = await apiFetch(`/api/entregas/solicitudes-envio/departamentos/${encoded}/detalle?anio=${anioActual}`, { token })
      if (res.ok) {
        const data = await res.json()
        setOpDetalleDepto(data)
      } else {
        setMsg({ text: 'No se pudo cargar escuelas del departamento', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error al cargar departamento', type: 'error' })
    } finally {
      setLoadingOp(false)
    }
  }

  const handleConfirmarDespachoLote = async () => {
    if (!loteDespachoModal?.lote_id) return
    setSavingEnvio(true)
    try {
      const res = await apiFetch(`/api/entregas/lote/${loteDespachoModal.lote_id}/despachar`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          fecha_despacho_real: fechaDespachoReal,
          observaciones: obsDespacho
        })
      })
      if (res.ok) {
        setMsg({ text: `Lote #${loteDespachoModal.lote_id} despachado exitosamente. Fecha real de salida: ${fechaDespachoReal}`, type: 'success' })
        setLoteDespachoModal(null)
        loadSeguimientoEnvio()
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudo despachar el lote', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al despachar lote', type: 'error' })
    } finally {
      setSavingEnvio(false)
    }
  }

  const handleConfirmarEnvioOperadorDirecto = async () => {
    if (!selectedDeposito) {
      setMsg({ text: 'Seleccione un depósito de origen', type: 'error' })
      return
    }

    const payloadEntregas = Object.entries(opEntregas)
      .map(([idInstitucion, productos]) => {
        const items = Object.entries(productos || {})
          .filter(([, qty]) => Number(qty) > 0)
          .map(([idProducto, qty]) => ({ id_producto: Number(idProducto), cantidad: Number(qty) }))
        return { id_institucion: Number(idInstitucion), items }
      })
      .filter((row) => row.items.length > 0)

    if (payloadEntregas.length === 0) {
      setMsg({ text: 'Cargue al menos una cantidad para enviar a una escuela', type: 'error' })
      return
    }

    setSavingOp(true)
    try {
      const res = await apiFetch('/api/entregas/operador-directo', {
        token,
        method: 'POST',
        body: JSON.stringify({
          anio: anioActual,
          id_deposito: Number(selectedDeposito),
          departamento: opDepartamento || 'Varios',
          fecha_despacho_real: opFechaSalida,
          observaciones: `Envío directo armado por operador - ${opDepartamento || 'Escuelas seleccionadas'}`,
          entregas: payloadEntregas,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMsg({ text: `Envío de palet armado con éxito en Estado 1 (Armado). Lote #${data.lote_id}`, type: 'success' })
        setLoteImprimible(data.lote_id)
        setOpDetalleDepto(null)
        setOpEntregas({})
        loadSeguimientoEnvio()
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudo crear el envío directo', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al crear envío directo', type: 'error' })
    } finally {
      setSavingOp(false)
    }
  }

  const loadZonas = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/depositos/distribucion/zonas-pendientes?anio=${anioActual}`, { token })
      if (res.ok) {
        const data = await res.json()
        setZonas(data.zonas || [])
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudieron cargar zonas pendientes', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al cargar zonas pendientes', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadDepositos = async () => {
    const res = await apiFetch('/api/depositos', { token })
    if (res.ok) {
      const data = await res.json()
      const list = [...(data.depositos || [])]
      // Ordenar para que el Depósito Central quede primero por defecto
      list.sort((a, b) => {
        const nameA = String(a.nombre || '').toLowerCase()
        const nameB = String(b.nombre || '').toLowerCase()
        if (nameA.includes('central')) return -1
        if (nameB.includes('central')) return 1
        return a.id - b.id
      })
      setDepositos(list)
      if (list.length > 0) setSelectedDeposito(String(list[0].id))
    }
  }

  const loadTodosDepartamentos = async () => {
    try {
      const res = await apiFetch('/api/entregas/departamentos-todos', { token })
      if (res.ok) {
        const data = await res.json()
        setTodosDepartamentos(data.departamentos || [])
      }
    } catch (_) {}
  }

  const buscarEscuelasOperador = async (dept = opDepartamento, search = opEscuelaBusqueda) => {
    setLoadingOp(true)
    setOpEntregas({})
    try {
      const params = new URLSearchParams({ anio: String(anioActual) })
      if (dept) params.append('departamento', dept)
      if (search) params.append('search', search)

      const res = await apiFetch(`/api/entregas/escuelas-envio-directo?${params.toString()}`, { token })
      if (res.ok) {
        const data = await res.json()
        setOpDetalleDepto({ solicitudes: data.escuelas || [] })
      } else {
        setMsg({ text: 'No se pudieron cargar escuelas para envío directo', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error al cargar escuelas', type: 'error' })
    } finally {
      setLoadingOp(false)
    }
  }

  const loadDepartamentosEnvio = async () => {
    setLoadingEnvio(true)
    try {
      const res = await apiFetch(`/api/entregas/solicitudes-envio/departamentos?anio=${anioActual}`, { token })
      if (res.ok) {
        const data = await res.json()
        setDepartamentosEnvio(data.departamentos || [])
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudieron cargar departamentos con envíos pendientes', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al cargar envíos por departamento', type: 'error' })
    } finally {
      setLoadingEnvio(false)
    }
  }

  const loadSeguimientoEnvio = async () => {
    setLoadingSeguimiento(true)
    try {
      const res = await apiFetch(`/api/entregas/solicitudes-envio/seguimiento?anio=${anioActual}`, { token })
      if (res.ok) {
        const data = await res.json()
        setSeguimientoEnvio(data.lotes || [])
        setResumenSeguimiento(data.resumen || null)
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudo cargar seguimiento de envíos', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al cargar seguimiento de envíos', type: 'error' })
    } finally {
      setLoadingSeguimiento(false)
    }
  }

  const verDetalleSeguimiento = async (loteId) => {
    setLoadingSeguimiento(true)
    try {
      const res = await apiFetch(`/api/entregas/solicitudes-envio/seguimiento/${loteId}`, { token })
      if (res.ok) {
        const data = await res.json()
        setDetalleSeguimiento(data)
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudo cargar el detalle del lote', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al cargar detalle de seguimiento', type: 'error' })
    } finally {
      setLoadingSeguimiento(false)
    }
  }

  const loadSedes = async () => {
    setLoadingSedes(true)
    try {
      const res = await apiFetch(`/api/entregas/sedes/en-sede`, { token })
      if (res.ok) {
        const data = await res.json()
        setSolicitudesSede(data.solicitudes || [])
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudieron cargar las solicitudes en Sede', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al cargar solicitudes en Sede', type: 'error' })
    } finally {
      setLoadingSedes(false)
    }
  }

  useEffect(() => {
    if (vista === 'envios') {
      loadDepartamentosEnvio()
      loadSeguimientoEnvio()
    } else if (vista === 'operador') {
      loadTodosDepartamentos()
      loadSeguimientoEnvio()
      buscarEscuelasOperador('', '')
    } else if (vista === 'sedes') {
      loadSedes()
    } else {
      loadZonas()
    }
    loadDepositos()
  }, [vista])

  const verDetalleZona = async (zona) => {
    setLoading(true)
    setEntregas({})
    try {
      const res = await apiFetch(`/api/depositos/distribucion/zonas/${zona.zona_id}/detalle?anio=${anioActual}`, { token })
      if (res.ok) {
        const data = await res.json()
        setDetalleZona(data)
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudo cargar detalle zonal', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al cargar detalle zonal', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleQtyChange = (institucionId, productoId, value) => {
    setEntregas((prev) => ({
      ...prev,
      [institucionId]: {
        ...(prev[institucionId] || {}),
        [productoId]: value,
      },
    }))
  }

  const handleQtyChangeEnvio = (solicitudId, productoId, value) => {
    setEntregasEnvio((prev) => ({
      ...prev,
      [solicitudId]: {
        ...(prev[solicitudId] || {}),
        [productoId]: value,
      },
    }))
  }

  const handleConfirmarEgresoMultiple = async () => {
    if (!detalleZona?.zona?.id) {
      setMsg({ text: 'Seleccione una zona para distribuir', type: 'error' })
      return
    }
    if (!selectedDeposito) {
      setMsg({ text: 'Seleccione un depósito de origen', type: 'error' })
      return
    }

    const payloadEntregas = Object.entries(entregas)
      .map(([idInstitucion, productos]) => {
        const items = Object.entries(productos || {})
          .filter(([, qty]) => Number(qty) > 0)
          .map(([idProducto, qty]) => ({ id_producto: Number(idProducto), cantidad: Number(qty) }))
        return { id_institucion: Number(idInstitucion), items }
      })
      .filter((row) => row.items.length > 0)

    if (payloadEntregas.length === 0) {
      setMsg({ text: 'Cargue al menos una cantidad para una escuela de la zona', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const res = await apiFetch('/api/depositos/distribucion/egreso-multiple', {
        token,
        method: 'POST',
        body: JSON.stringify({
          zona_id: Number(detalleZona.zona.id),
          anio: anioActual,
          id_deposito: Number(selectedDeposito),
          observaciones: `Distribución zonal ${detalleZona.zona.nombre}`,
          entregas: payloadEntregas,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMsg({ text: `Egreso múltiple registrado. Lote #${data.lote_id}`, type: 'success' })
        setDetalleZona(null)
        setEntregas({})
        loadZonas()
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudo registrar el egreso múltiple', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al registrar egreso múltiple', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const verDetalleDepartamento = async (departamento) => {
    setLoadingEnvio(true)
    setEntregasEnvio({})
    try {
      const encoded = encodeURIComponent(departamento)
      const res = await apiFetch(`/api/entregas/solicitudes-envio/departamentos/${encoded}/detalle?anio=${anioActual}`, { token })
      if (res.ok) {
        const data = await res.json()
        setDetalleDepartamento(data)
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudo cargar el detalle de envíos por departamento', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al cargar el detalle del departamento', type: 'error' })
    } finally {
      setLoadingEnvio(false)
    }
  }

  const handleConfirmarEgresoDepartamento = async () => {
    if (!detalleDepartamento?.departamento) {
      setMsg({ text: 'Seleccione un departamento para distribuir', type: 'error' })
      return
    }
    if (!selectedDeposito) {
      setMsg({ text: 'Seleccione un depósito de origen', type: 'error' })
      return
    }
    if (tipoEnvio === 'escuela_sede' && !selectedSede) {
      setMsg({ text: 'Debe seleccionar una Escuela Sede cabecera', type: 'error' })
      return
    }

    // Armar payload directo desde los items solicitados (sin inputs del usuario)
    const payloadEntregas = (detalleDepartamento.solicitudes || [])
      .map((sol) => {
        const items = (sol.productos_pedido_anual || [])
          .filter(p => p.en_solicitud && Number(p.cantidad_solicitada_solicitud) > 0)
          .map(p => ({ id_producto: Number(p.producto_id), cantidad: Number(p.cantidad_solicitada_solicitud) }))
        return { id_solicitud: Number(sol.id), items }
      })
      .filter((row) => row.items.length > 0)

    if (payloadEntregas.length === 0) {
      setMsg({ text: 'No hay productos solicitados para egresar en este departamento', type: 'error' })
      return
    }

    setSavingEnvio(true)
    try {
      const res = await apiFetch('/api/entregas/solicitudes-envio/egreso-multiple', {
        token,
        method: 'POST',
        body: JSON.stringify({
          departamento: detalleDepartamento.departamento,
          id_deposito: Number(selectedDeposito),
          observaciones: `Distribución por envío - ${detalleDepartamento.departamento}`,
          entregas: payloadEntregas,
          tipo_envio: tipoEnvio,
          id_institucion_sede: tipoEnvio === 'escuela_sede' ? Number(selectedSede) : null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMsg({ text: `Egreso por departamento registrado. Lote: #${data.lote_id}`, type: 'success' })
        setLoteImprimible(data.lote_id)
        setDetalleDepartamento(null)
        setEntregasEnvio({})
        loadDepartamentosEnvio()
        loadSeguimientoEnvio()
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'No se pudo registrar el egreso por departamento', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión al registrar egreso por departamento', type: 'error' })
    } finally {
      setSavingEnvio(false)
    }
  }

  const renderZonas = () => {
    if (!detalleZona) {
      if (loading) return <div className="sv-empty-state">Buscando zonas con pendientes...</div>
      if (zonas.length === 0) return <div className="sv-empty-state">No hay zonas con distribución pendiente.</div>

      return (
        <table>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th>ZONA</th>
              <th style={{ textAlign: 'center' }}>ESCUELAS CON PENDIENTE</th>
              <th style={{ textAlign: 'center' }}>PRODUCTOS PENDIENTES</th>
              <th style={{ textAlign: 'center' }}>CANTIDAD TOTAL PENDIENTE</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {zonas.map((z) => (
              <tr key={z.zona_id}>
                <td style={{ fontWeight: 700 }}>{z.zona_nombre}</td>
                <td style={{ textAlign: 'center' }}>{z.escuelas_pendientes}</td>
                <td style={{ textAlign: 'center' }}>{z.productos_pendientes}</td>
                <td style={{ textAlign: 'center' }}>{z.cantidad_pendiente_total}</td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => verDetalleZona(z)}>Armar Egreso Múltiple</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    return (
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <button className="secondary" onClick={() => setDetalleZona(null)} disabled={saving}>Volver a zonas</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: '0.85rem' }}>Depósito de origen:</label>
            <select
              value={selectedDeposito}
              onChange={(e) => setSelectedDeposito(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, minWidth: 220 }}
            >
              {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
        </div>

        <h3 style={{ borderBottom: '2px solid var(--primary)', paddingBottom: 10, marginBottom: 10 }}>
          Zona: {detalleZona.zona?.nombre}
        </h3>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>
          Escuelas con carga actual: {totalEscuelasConCarga}. Año operativo: {detalleZona.anio || anioActual}.
        </p>

        {(detalleZona.escuelas || []).map((escuela) => (
          <div key={escuela.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{escuela.nombre}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>CUE: {escuela.cue || '-'} | Nivel: {escuela.nivel || '-'}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Ubicación: {escuela.ubicacion || '-'}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--muted)' }}>
                <div>Productos pendientes: {escuela.productos_pendientes}</div>
                <div>Cantidad pendiente total: {escuela.cantidad_pendiente_total}</div>
              </div>
            </div>

            <table style={{ marginBottom: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Producto</th>
                  <th style={{ textAlign: 'center' }}>Adjudicado</th>
                  <th style={{ textAlign: 'center' }}>Entregado</th>
                  <th style={{ textAlign: 'center' }}>Pendiente</th>
                  <th style={{ textAlign: 'center', width: 160 }}>Enviar Ahora</th>
                </tr>
              </thead>
              <tbody>
                {(escuela.items || []).map((item) => {
                  const pendiente = Number(item.cantidad_pendiente || 0)
                  return (
                    <tr key={`${escuela.id}-${item.id}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.producto}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{item.unidad_medida || '-'}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.cantidad_adjudicada}</td>
                      <td style={{ textAlign: 'center' }}>{item.cantidad_entregada}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{pendiente}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max={pendiente}
                          value={entregas[escuela.id]?.[item.id] || ''}
                          placeholder={`0-${pendiente}`}
                          onChange={(e) => handleQtyChange(escuela.id, item.id, e.target.value)}
                          style={{ width: 120, textAlign: 'center' }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="secondary" onClick={() => setDetalleZona(null)} disabled={saving}>Cancelar</button>
          <button className="primary" onClick={handleConfirmarEgresoMultiple} disabled={saving}>
            {saving ? 'Registrando...' : 'Confirmar Egreso Múltiple'}
          </button>
        </div>
      </section>
    )
  }

  const renderBadgeEstadoLote = (estado) => {
    const value = String(estado || '').toLowerCase()
    if (value === 'armado') return <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>📦 Armado</span>
    if (value === 'despachado' || value === 'en_transito') return <span className="badge" style={{ background: '#e0f2fe', color: '#0c4a6e', fontWeight: 600 }}>🚚 Despachado</span>
    if (value === 'entregado' || value === 'recibido_total') return <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontWeight: 600 }}>✅ Entregado</span>
    if (value === 'con_rotura' || value === 'con_reclamos') return <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>⚠️ Con Rotura</span>
    if (value === 'retorno_deposito' || value === 'devuelto') return <span className="badge" style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 600 }}>↩️ Retorno a Depósito</span>
    if (value === 'parcialmente_recibido') return <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Parcial</span>
    return <span className="badge" style={{ background: '#f8fafc', color: '#334155' }}>{estado}</span>
  }

  const renderPanelSeguimiento = () => (
    <section style={{ marginTop: 18, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
      <h4 style={{ margin: '0 0 8px 0' }}>Seguimiento y Acciones de Envíos</h4>
      <p style={{ marginTop: 0, color: 'var(--muted)' }}>
        Gestiona el ciclo de vida del envío: Armado 📦 → Despachado 🚚 → Entrega en Escuela 🏫 (Exitosa / Rotura / Retorno).
      </p>

      {resumenSeguimiento && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <span className="badge" style={{ background: '#f8fafc', color: '#334155' }}>Lotes: {resumenSeguimiento.total_lotes || 0}</span>
          <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Armados: {resumenSeguimiento.armados || 0}</span>
          <span className="badge" style={{ background: '#e0f2fe', color: '#0c4a6e' }}>Despachados / En tránsito: {resumenSeguimiento.despachados || 0}</span>
          <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>Entregados: {resumenSeguimiento.entregados || 0}</span>
          <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Con Rotura: {resumenSeguimiento.con_rotura || 0}</span>
          <span className="badge" style={{ background: '#f3e8ff', color: '#6b21a8' }}>Retorno a Depósito: {resumenSeguimiento.retorno_deposito || 0}</span>
        </div>
      )}

      {loadingSeguimiento ? (
        <div className="sv-empty-state">Cargando seguimiento...</div>
      ) : seguimientoEnvio.length === 0 ? (
        <div className="sv-empty-state">Todavía no hay lotes de envío registrados.</div>
      ) : (
        <table>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th>LOTE</th>
              <th>DEPARTAMENTO</th>
              <th>DEPÓSITO</th>
              <th style={{ textAlign: 'center' }}>SALIDA CAMIÓN / REGISTRO</th>
              <th style={{ textAlign: 'center' }}>INSTITUCIONES</th>
              <th style={{ textAlign: 'center' }}>PLANIFICADA</th>
              <th style={{ textAlign: 'center' }}>RECIBIDA</th>
              <th style={{ textAlign: 'center' }}>ESTADO</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {seguimientoEnvio.map((lote) => {
              const st = String(lote.estado_lote).toLowerCase()
              const fRealStr = lote.fecha_despacho_real ? new Date(lote.fecha_despacho_real + 'T00:00:00').toLocaleDateString('es-AR') : null
              const fRegStr = new Date(lote.created_at).toLocaleDateString('es-AR')

              return (
                <tr key={lote.lote_id}>
                  <td style={{ fontWeight: 700 }}>#{lote.lote_id}</td>
                  <td>{lote.departamento || 'SIN_DEPARTAMENTO'}</td>
                  <td>{lote.deposito_nombre || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {fRealStr ? (
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7' }}>
                        🚚 Salida: {fRealStr}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        🚚 Sin despachar
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      📝 Reg: {fRegStr}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{lote.total_instituciones || 0}</td>
                  <td style={{ textAlign: 'center' }}>{lote.cantidad_planificada_total || 0}</td>
                  <td style={{ textAlign: 'center' }}>{lote.cantidad_recibida_total || 0}</td>
                  <td style={{ textAlign: 'center' }}>{renderBadgeEstadoLote(lote.estado_lote)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button type="button" className="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => verDetalleSeguimiento(lote.lote_id)}>
                        Ver Detalle
                      </button>
                      
                      {st === 'armado' && (
                        <button type="button" className="primary" style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#0284c7', borderColor: '#0284c7' }} onClick={() => { setLoteDespachoModal(lote); setFechaDespachoReal(new Date().toISOString().split('T')[0]); setObsDespacho(''); }} disabled={savingEnvio}>
                          🚚 Despachar
                        </button>
                      )}

                      {(st === 'despachado' || st === 'en_transito') && (
                        <button type="button" className="primary" style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#16a34a', borderColor: '#16a34a' }} onClick={() => abrirModalResultado(lote)} disabled={savingEnvio}>
                          🏫 Registrar Entrega
                        </button>
                      )}

                      <button type="button" className="secondary" style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => handlePrintLote(lote.lote_id)}>
                        <ActionIcon name="imprimir" size={14} />
                        Comprobante
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {detalleSeguimiento?.lote && (
        <div style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <div>
              <strong>Lote #{detalleSeguimiento.lote.lote_id}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Departamento: {detalleSeguimiento.lote.departamento} | Depósito: {detalleSeguimiento.lote.deposito_nombre || '-'}
              </div>
            </div>
            <button className="secondary" type="button" onClick={() => setDetalleSeguimiento(null)}>Cerrar detalle</button>
          </div>

          {(detalleSeguimiento.instituciones || []).map((institucion) => (
            <div key={institucion.id_institucion} style={{ border: '1px solid #f1f5f9', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{institucion.institucion_nombre}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8 }}>CUE: {institucion.cue || '-'}</div>
              <table style={{ marginBottom: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Planificada</th>
                    <th style={{ textAlign: 'center' }}>Recibida</th>
                    <th style={{ textAlign: 'center' }}>Dañada</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(institucion.items || []).map((item) => (
                    <tr key={item.lote_item_id}>
                      <td>{item.producto_nombre}</td>
                      <td style={{ textAlign: 'center' }}>{item.cantidad_planificada}</td>
                      <td style={{ textAlign: 'center' }}>{item.cantidad_recibida}</td>
                      <td style={{ textAlign: 'center' }}>{item.cantidad_danada || 0}</td>
                      <td style={{ textAlign: 'center' }}>{renderBadgeEstadoLote(item.estado_recepcion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </section>
  )

  const renderEnviosDepartamento = () => {
    if (!detalleDepartamento) {
      if (loadingEnvio) return <div className="sv-empty-state">Buscando departamentos con envíos pendientes...</div>
      if (departamentosEnvio.length === 0) return <div className="sv-empty-state">No hay solicitudes con envío pendientes.</div>

      return (
        <>
          <table>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th>DEPARTAMENTO</th>
                <th style={{ textAlign: 'center' }}>SOLICITUDES</th>
                <th style={{ textAlign: 'center' }}>ESCUELAS</th>
                <th style={{ textAlign: 'center' }}>PRODUCTOS</th>
                <th style={{ textAlign: 'center' }}>CANTIDAD TOTAL PENDIENTE</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {departamentosEnvio.map((d) => (
                <tr key={d.departamento}>
                  <td style={{ fontWeight: 700 }}>{d.departamento}</td>
                  <td style={{ textAlign: 'center' }}>{d.cantidad_solicitudes}</td>
                  <td style={{ textAlign: 'center' }}>{d.cantidad_escuelas}</td>
                  <td style={{ textAlign: 'center' }}>{d.cantidad_productos}</td>
                  <td style={{ textAlign: 'center' }}>{d.cantidad_total_pendiente}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => verDetalleDepartamento(d.departamento)}>Ver Detalle y Armar Egreso</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ marginTop: 10, color: 'var(--muted)', fontSize: '0.88rem' }}>
            Para ver qué solicitó cada escuela y las instituciones faltantes por solicitar retiro, entrá al detalle del departamento.
          </p>

          {renderPanelSeguimiento()}
        </>
      )
    }

    return (
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <button className="secondary" onClick={() => setDetalleDepartamento(null)} disabled={savingEnvio}>Volver a departamentos</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: '0.85rem' }}>Depósito de origen:</label>
            <select
              value={selectedDeposito}
              onChange={(e) => setSelectedDeposito(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, minWidth: 220 }}
            >
              {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Metodología de Envío</label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="tipoEnvio" value="directo" checked={tipoEnvio === 'directo'} onChange={(e) => setTipoEnvio(e.target.value)} />
                <span>Envío Directo a Escuelas</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="tipoEnvio" value="escuela_sede" checked={tipoEnvio === 'escuela_sede'} onChange={(e) => setTipoEnvio(e.target.value)} />
                <span>Agrupado en Escuela Sede</span>
              </label>
            </div>
          </div>
          {tipoEnvio === 'escuela_sede' && (
            <div style={{ flex: 1, minWidth: 250 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Seleccionar Escuela Sede (Cabecera)</label>
              <select value={selectedSede} onChange={(e) => setSelectedSede(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, width: '100%', borderColor: '#cbd5e1' }}>
                <option value="">-- Seleccionar Institución Sede --</option>
                {(escuelasSede || []).map((inst) => (
                  <option key={inst.id_institucion} value={inst.id_institucion}>
                    {inst.nombre} {inst.cue ? `(CUE: ${inst.cue})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <h3 style={{ borderBottom: '2px solid var(--primary)', paddingBottom: 10, marginBottom: 10 }}>
          Departamento: {detalleDepartamento.departamento}
        </h3>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>
          Solicitudes con carga actual: {totalSolicitudesConCarga}. Año operativo: {detalleDepartamento.anio || anioActual}.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            Solicitudes: {detalleDepartamento.resumen?.total_solicitudes || 0}
          </div>
          <div className="badge" style={{ background: '#f0fdf4', color: '#166534' }}>
            Escuelas con solicitud: {detalleDepartamento.resumen?.total_escuelas || 0}
          </div>
          <div className="badge" style={{ background: '#fff7ed', color: '#9a3412' }}>
            Cantidad solicitada pendiente: {detalleDepartamento.resumen?.total_cantidad || 0}
          </div>
        </div>

        {resumenEgresos.length > 0 && (
          <div style={{ background: '#fff7ed', border: '2px solid #fb923c', borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#9a3412', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📦</span> Resumen consolidado de productos a egresar
            </h4>
            <table style={{ marginBottom: 0 }}>
              <thead>
                <tr style={{ background: '#ffedd5' }}>
                  <th style={{ textAlign: 'left' }}>Producto</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Total a enviar</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Unidad</th>
                </tr>
              </thead>
              <tbody>
                {resumenEgresos.map(p => (
                  <tr key={p.producto_id}>
                    <td style={{ fontWeight: 600 }}>{p.producto_nombre}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', color: '#c2410c' }}>{p.cantidad}</td>
                    <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{p.unidad_medida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(detalleDepartamento.solicitudes || []).map((solicitud) => {
          const isExpanded = !!expandedSols[solicitud.id]
          const productosSolicitados = (solicitud.productos_pedido_anual || []).filter(p => p.en_solicitud && Number(p.cantidad_solicitada_solicitud) > 0)
          const totalASolicitar = productosSolicitados.reduce((acc, p) => acc + Number(p.cantidad_solicitada_solicitud), 0)
          return (
            <div key={solicitud.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{solicitud.institucion_nombre}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 2 }}>
                    Solicitud #{solicitud.id} | CUE: {solicitud.cue || '-'} | Estado: {solicitud.estado}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>
                      A enviar: {totalASolicitar}
                    </span>
                    <span className="badge" style={{ background: '#f8fafc', color: '#334155' }}>
                      {productosSolicitados.length} producto{productosSolicitados.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary"
                  style={{ width: 'auto', margin: 0, fontSize: '0.85rem', padding: '5px 12px' }}
                  onClick={() => toggleSolicitudDetalle(solicitud.id)}
                >
                  {isExpanded ? '▲ Ocultar detalle' : '▼ Ver detalle de productos'}
                </button>
              </div>

              {isExpanded && (
                productosSolicitados.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '8px 0' }}>
                    No hay productos solicitados en esta solicitud.
                  </div>
                ) : (
                  <table style={{ marginBottom: 0 }}>
                    <thead>
                      <tr style={{ background: '#f0fdf4' }}>
                        <th>Producto</th>
                        <th style={{ textAlign: 'center' }}>Unidad</th>
                        <th style={{ textAlign: 'center', width: 140 }}>Cantidad a enviar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosSolicitados.map((item) => (
                        <tr key={solicitud.id + '-' + item.producto_id}>
                          <td style={{ fontWeight: 600 }}>{item.producto_nombre}</td>
                          <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{item.unidad_medida || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              background: '#dcfce7',
                              color: '#166534',
                              fontWeight: 700,
                              fontSize: '1rem',
                              borderRadius: 6,
                              padding: '4px 16px',
                              minWidth: 60
                            }}>
                              {item.cantidad_solicitada_solicitud}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {!isExpanded && (
                <div style={{ color: 'var(--muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                  {productosSolicitados.length} producto{productosSolicitados.length !== 1 ? 's' : ''} — expandí para ver el detalle
                </div>
              )}
            </div>
          )
        })}

        <div style={{ marginTop: 18, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Instituciones del departamento sin solicitud de retiro</h4>
          <p style={{ marginTop: 0, color: 'var(--muted)' }}>
            Información para gestión preventiva: escuelas con pedido anual aprobado y saldo pendiente que aún no iniciaron solicitud de retiro este año.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="badge" style={{ background: '#fef2f2', color: '#991b1b' }}>
              Instituciones faltantes: {detalleDepartamento.resumen_faltantes?.total_instituciones || 0}
            </div>
            <div className="badge" style={{ background: '#fffbeb', color: '#92400e' }}>
              Productos pendientes: {detalleDepartamento.resumen_faltantes?.total_productos_pendientes || 0}
            </div>
            <div className="badge" style={{ background: '#fff7ed', color: '#9a3412' }}>
              Cantidad pendiente total: {detalleDepartamento.resumen_faltantes?.total_cantidad_pendiente || 0}
            </div>
          </div>

          {(detalleDepartamento.faltantes_solicitud || []).length === 0 ? (
            <div className="sv-empty-state" style={{ marginTop: 8 }}>
              No hay instituciones faltantes por solicitar retiro en este departamento.
            </div>
          ) : (
            <table>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Institución</th>
                  <th>CUE</th>
                  <th style={{ textAlign: 'center' }}>Productos pendientes</th>
                  <th style={{ textAlign: 'center' }}>Cantidad pendiente total</th>
                </tr>
              </thead>
              <tbody>
                {(detalleDepartamento.faltantes_solicitud || []).map((inst) => (
                  <tr key={inst.id_institucion}>
                    <td style={{ fontWeight: 600 }}>{inst.institucion_nombre}</td>
                    <td>{inst.cue || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{inst.productos_pendientes}</td>
                    <td style={{ textAlign: 'center' }}>{inst.cantidad_pendiente_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="secondary" onClick={() => setDetalleDepartamento(null)} disabled={savingEnvio}>Cancelar</button>
          <button className="primary" onClick={handleConfirmarEgresoDepartamento} disabled={savingEnvio}>
            {savingEnvio ? 'Registrando...' : 'Confirmar Egreso por Departamento'}
          </button>
        </div>

        {renderPanelSeguimiento()}
      </section>
    )
  }

  const handleEntregarSede = async (solicitudId) => {
    if (!window.confirm('¿Confirmar la entrega final de esta solicitud desde la Sede?')) return
    setSavingEnvio(true)
    try {
      const res = await apiFetch(`/api/entregas/sedes/${solicitudId}/entregar`, {
        method: 'POST',
        token
      })
      if (res.ok) {
        setMsg({ text: 'Entrega confirmada correctamente.', type: 'success' })
        loadSedes()
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg({ text: data.error || 'Error al confirmar la entrega', type: 'error' })
      }
    } catch {
      setMsg({ text: 'Error de conexión', type: 'error' })
    } finally {
      setSavingEnvio(false)
    }
  }

  const renderSedes = () => {
    return (
      <section>
        <div style={{ marginBottom: 16 }}>
          <h3>Solicitudes en Escuela Sede</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Estas solicitudes se encuentran físicamente en un Sub-depósito Sede. Haz clic en "Confirmar Entrega" cuando el responsable de la escuela periférica retire su pedido.
          </p>
        </div>

        {loadingSedes ? (
          <div className="spinner" style={{ margin: '40px auto' }}></div>
        ) : solicitudesSede.length === 0 ? (
          <div className="sv-empty-state">No hay solicitudes actualmente en estado "En Sede".</div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Solicitud #</th>
                  <th>Institución Destino</th>
                  <th>Sede Cabecera</th>
                  <th>Fecha En Sede</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesSede.map((sol) => (
                  <tr key={sol.id}>
                    <td>#{sol.id}</td>
                    <td><strong style={{ display: 'block' }}>{sol.institucion_nombre}</strong></td>
                    <td>{sol.sede_nombre}</td>
                    <td>{new Date(sol.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="primary" onClick={() => handleEntregarSede(sol.id)} disabled={savingEnvio}>
                        Confirmar Entrega
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  const renderArmadoOperadorDirecto = () => {
    return (
      <section>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Armar Envío Directo por Operador</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Selecciona un Departamento o busca una Escuela para armar el envío directamente respetando el saldo disponible de su asignación anual.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Departamento:</label>
              <select
                value={opDepartamento}
                onChange={(e) => {
                  const val = e.target.value
                  setOpDepartamento(val)
                  buscarEscuelasOperador(val, opEscuelaBusqueda)
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8 }}
              >
                <option value="">-- Todos los Departamentos --</option>
                {todosDepartamentos.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Buscar Escuela (Nombre o CUE):</label>
              <input
                type="text"
                placeholder="Ej: Escuela Normal, CUE 700..."
                value={opEscuelaBusqueda}
                onChange={(e) => setOpEscuelaBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') buscarEscuelasOperador(opDepartamento, opEscuelaBusqueda)
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8 }}
              />
            </div>

            <button
              type="button"
              className="primary"
              onClick={() => buscarEscuelasOperador(opDepartamento, opEscuelaBusqueda)}
              style={{ alignSelf: 'flex-end', height: 38, width: 'auto', margin: 0 }}
            >
              🔍 Buscar Escuelas
            </button>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Depósito Origen:</label>
              <select
                value={selectedDeposito}
                onChange={(e) => setSelectedDeposito(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, minWidth: 220 }}
              >
                {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Salida del Camión:</label>
              <input
                type="date"
                value={opFechaSalida}
                onChange={(e) => setOpFechaSalida(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {loadingOp ? (
          <div className="sv-empty-state">Buscando escuelas...</div>
        ) : !opDetalleDepto?.solicitudes || opDetalleDepto.solicitudes.length === 0 ? (
          <div className="sv-empty-state">No se encontraron escuelas con asignación anual aprobada disponible.</div>
        ) : (
          <>
            {(opDetalleDepto.solicitudes || []).map((sol) => (
              <div key={sol.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <div>
                    <strong style={{ fontSize: '1rem' }}>{sol.institucion_nombre}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      CUE: {sol.cue || '-'} | Depto: {sol.departamento} | Asignación Anual Aprobada
                    </div>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center' }}>Adjudicado Anual</th>
                      <th style={{ textAlign: 'center' }}>Entregado Previo</th>
                      <th style={{ textAlign: 'center' }}>Saldo Disponible</th>
                      <th style={{ textAlign: 'center', width: 160 }}>Cargar en Palet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sol.productos_pedido_anual || []).map((item) => {
                      const cantAnual = Number(item.cantidad_anual || 0)
                      const entregado = Number(item.cantidad_entregada_total || 0)
                      const saldo = Math.max(0, cantAnual - entregado)
                      const valCurrent = opEntregas[sol.id_institucion]?.[item.producto_id] || ''

                      return (
                        <tr key={`${sol.id_institucion}-${item.producto_id}`}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.producto_nombre}</div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{item.unidad_medida || '-'}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>{cantAnual}</td>
                          <td style={{ textAlign: 'center' }}>{entregado}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: saldo > 0 ? '#15803d' : '#991b1b' }}>{saldo}</td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max={saldo}
                              value={valCurrent}
                              placeholder={`0-${saldo}`}
                              disabled={saldo <= 0}
                              onChange={(e) => {
                                const val = e.target.value
                                setOpEntregas(prev => ({
                                  ...prev,
                                  [sol.id_institucion]: {
                                    ...(prev[sol.id_institucion] || {}),
                                    [item.producto_id]: val
                                  }
                                }))
                              }}
                              style={{ width: 110, textAlign: 'center' }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button className="secondary" onClick={() => setOpDetalleDepto(null)} disabled={savingOp}>
                Limpiar Selección
              </button>
              <button className="primary" onClick={handleConfirmarEnvioOperadorDirecto} disabled={savingOp}>
                {savingOp ? 'Guardando Palet...' : '📦 Confirmar Armado de Palet'}
              </button>
            </div>

            {renderPanelSeguimiento()}
          </>
        )}
      </section>
    )
  }

  const renderModalDespacho = () => {
    if (!loteDespachoModal) return null
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20
      }}>
        <div style={{
          background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520,
          padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, borderBottom: '2px solid #0284c7', paddingBottom: 10, color: '#0284c7' }}>
            🚚 Confirmar Despacho de Camión - Lote #{loteDespachoModal.lote_id}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            Ingresa la fecha real en que salió el camión del depósito (permite indicar fechas anteriores como un domingo).
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Fecha Real de Salida del Camión:</label>
            <input
              type="date"
              value={fechaDespachoReal}
              onChange={(e) => setFechaDespachoReal(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginTop: 4 }}>
              📅 Fecha de registro en sistema: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Observaciones de Despacho (Opcional):</label>
            <textarea
              rows={3}
              value={obsDespacho}
              onChange={(e) => setObsDespacho(e.target.value)}
              placeholder="Ej: Chofer Juan Pérez, Patente AA123BB..."
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="secondary" onClick={() => setLoteDespachoModal(null)} disabled={savingEnvio}>
              Cancelar
            </button>
            <button type="button" className="primary" style={{ background: '#0284c7', borderColor: '#0284c7' }} onClick={handleConfirmarDespachoLote} disabled={savingEnvio}>
              {savingEnvio ? 'Despachando...' : '🚚 Confirmar Despacho'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderModalResultado = () => {
    if (!loteResultadoModal) return null
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20
      }}>
        <div style={{
          background: '#fff', borderRadius: 12, width: '100%', maxWidth: 780,
          maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, borderBottom: '2px solid var(--primary)', paddingBottom: 10 }}>
            Registrar Resultado de Entrega en Escuela - Lote #{loteResultadoModal.lote_id}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            Departamento: {loteResultadoModal.departamento} | Depósito: {loteResultadoModal.deposito_nombre || '-'}
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Resultado final del viaje:</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 8,
                border: '2px solid ' + (resultadoTipo === 'exitosa' ? '#16a34a' : '#e2e8f0'),
                background: resultadoTipo === 'exitosa' ? '#f0fdf4' : '#fff', cursor: 'pointer'
              }}>
                <input type="radio" name="resTipo" value="exitosa" checked={resultadoTipo === 'exitosa'} onChange={(e) => setResultadoTipo(e.target.value)} />
                <span style={{ fontWeight: 600, color: '#15803d' }}>🟢 Entrega Exitosa (Sin Problemas)</span>
              </label>

              <label style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 8,
                border: '2px solid ' + (resultadoTipo === 'rotura' ? '#dc2626' : '#e2e8f0'),
                background: resultadoTipo === 'rotura' ? '#fef2f2' : '#fff', cursor: 'pointer'
              }}>
                <input type="radio" name="resTipo" value="rotura" checked={resultadoTipo === 'rotura'} onChange={(e) => setResultadoTipo(e.target.value)} />
                <span style={{ fontWeight: 600, color: '#b91c1c' }}>🟡 Entrega con Roturas (Generar Vale)</span>
              </label>

              <label style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 8,
                border: '2px solid ' + (resultadoTipo === 'retorno_deposito' ? '#9333ea' : '#e2e8f0'),
                background: resultadoTipo === 'retorno_deposito' ? '#faf5ff' : '#fff', cursor: 'pointer'
              }}>
                <input type="radio" name="resTipo" value="retorno_deposito" checked={resultadoTipo === 'retorno_deposito'} onChange={(e) => setResultadoTipo(e.target.value)} />
                <span style={{ fontWeight: 600, color: '#7e22ce' }}>🔴 Sin Recepción (Retorno a Depósito)</span>
              </label>
            </div>
          </div>

          {resultadoTipo === 'retorno_deposito' && (
            <div style={{ background: '#faf5ff', border: '1px solid #c084fc', padding: 12, borderRadius: 8, color: '#6b21a8', marginBottom: 16 }}>
              <strong>ℹ️ Retorno al depósito:</strong> Al confirmar esta opción, la totalidad de la mercadería retornará al stock central del depósito de origen y la cuota asignada a la escuela se mantendrá intacta para un próximo envío.
            </div>
          )}

          {resultadoTipo === 'rotura' && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: '#b91c1c', marginBottom: 8 }}>Detalle de productos y mercadería dañada</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 0 }}>
                Indica las cantidades recibidas efectivamente por la escuela y las cantidades dañadas en el camino. Se generará un Vale de Reposición por los daños.
              </p>

              {loteItemsResultado.map(inst => (
                <div key={inst.id_institucion} style={{ border: '1px solid #fee2e2', borderRadius: 8, padding: 12, marginBottom: 12, background: '#fff5f5' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{inst.institucion_nombre}</strong>
                  <table style={{ marginTop: 8, marginBottom: 0 }}>
                    <thead>
                      <tr style={{ background: '#fee2e2' }}>
                        <th>Producto</th>
                        <th style={{ textAlign: 'center', width: 90 }}>Planificada</th>
                        <th style={{ textAlign: 'center', width: 110 }}>Recibida OK</th>
                        <th style={{ textAlign: 'center', width: 110 }}>Dañada</th>
                        <th>Motivo de daño</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inst.items || []).map(item => {
                        const key = `${inst.id_institucion}:${item.id_producto}`
                        const currentData = itemsDanosMap[key] || {}
                        return (
                          <tr key={key}>
                            <td style={{ fontWeight: 600 }}>{item.producto_nombre}</td>
                            <td style={{ textAlign: 'center' }}>{item.cantidad_planificada}</td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max={item.cantidad_planificada}
                                value={currentData.cantidad_recibida ?? item.cantidad_planificada}
                                onChange={(e) => {
                                  const rec = Number(e.target.value)
                                  const dan = Math.max(0, item.cantidad_planificada - rec)
                                  setItemsDanosMap(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], cantidad_recibida: rec, cantidad_danada: dan }
                                  }))
                                }}
                                style={{ width: 80, textAlign: 'center', padding: '4px 6px' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max={item.cantidad_planificada}
                                value={currentData.cantidad_danada ?? 0}
                                onChange={(e) => {
                                  const dan = Number(e.target.value)
                                  const rec = Math.max(0, item.cantidad_planificada - dan)
                                  setItemsDanosMap(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], cantidad_danada: dan, cantidad_recibida: rec }
                                  }))
                                }}
                                style={{ width: 80, textAlign: 'center', padding: '4px 6px', color: '#b91c1c', fontWeight: 700 }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                placeholder="Ej: Embalaje roto / Moja..."
                                value={currentData.motivo_danio || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setItemsDanosMap(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], motivo_danio: val }
                                  }))
                                }}
                                style={{ width: '100%', padding: '4px 8px', fontSize: '0.85rem' }}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Observaciones generales / Justificación:</label>
            <textarea
              rows={3}
              value={observacionesResultado}
              onChange={(e) => setObservacionesResultado(e.target.value)}
              placeholder="Escriba cualquier detalle u observación relevante sobre la entrega..."
              style={{ width: '100%', padding: 10, borderRadius: 8, borderColor: '#cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="secondary" onClick={() => setLoteResultadoModal(null)} disabled={savingEnvio}>
              Cancelar
            </button>
            <button type="button" className="primary" onClick={handleGuardarResultadoEntrega} disabled={savingEnvio}>
              {savingEnvio ? 'Guardando...' : 'Confirmar y Finalizar Entrega'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 24, minHeight: 'auto' }}>
      <h2 style={{ marginTop: 0 }}>Distribución por Zonas (Egreso Múltiple)</h2>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Gestiona entregas por zona o por solicitudes de envío agrupadas por departamento.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={vista === 'envios' ? 'primary' : 'secondary'}
          onClick={() => setVista('envios')}
          style={{ width: 'auto', margin: 0 }}
        >
          Envíos por Departamento
        </button>
        <button
          type="button"
          className={vista === 'operador' ? 'primary' : 'secondary'}
          onClick={() => setVista('operador')}
          style={{ width: 'auto', margin: 0 }}
        >
          📦 Armar Envío Directo (Operador)
        </button>
        <button
          type="button"
          className={vista === 'zonas' ? 'primary' : 'secondary'}
          onClick={() => setVista('zonas')}
          style={{ width: 'auto', margin: 0 }}
        >
          Distribución por Zonas
        </button>
        <button
          type="button"
          className={vista === 'sedes' ? 'primary' : 'secondary'}
          onClick={() => setVista('sedes')}
          style={{ width: 'auto', margin: 0 }}
        >
          Entregas desde Sede
        </button>
      </div>

      {msg.text && (
        <div className={`msg show ${msg.type === 'success' ? 'msg-success' : 'msg-error'}`} style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>{msg.text}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {msg.type === 'success' && loteImprimible && (
              <button
                type="button"
                className="secondary"
                onClick={() => handlePrintLote(loteImprimible)}
                style={{ width: 'auto', margin: 0, padding: '6px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ActionIcon name="imprimir" size={15} />
                Comprobante de Lote
              </button>
            )}
            {msg.type === 'success' && valeImprimible && (
              <button
                type="button"
                className="primary"
                onClick={() => handlePrintVale(valeImprimible)}
                style={{ width: 'auto', margin: 0, padding: '6px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap', background: '#dc2626', borderColor: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ActionIcon name="imprimir" size={15} />
                Imprimir Vale de Reposición
              </button>
            )}
          </div>
        </div>
      )}

      {vista === 'zonas' && renderZonas()}
      {vista === 'envios' && renderEnviosDepartamento()}
      {vista === 'operador' && renderArmadoOperadorDirecto()}
      {vista === 'sedes' && renderSedes()}
      {renderModalDespacho()}
      {renderModalResultado()}
    </div>
  )
}
