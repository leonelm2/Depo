import { useState, useEffect, useRef } from 'react'
import Modal from './ui/Modal'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import PrintButton from './PrintButton'
import ActionIcon from './ui/ActionIcon'
import SupervisorSolicitudes from './supervisor/SupervisorSolicitudes'
import SolicitudesRetiro from './SolicitudesRetiro'

function normalizeLabelText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatUnidad(unidad) {
  const value = String(unidad || '').trim().toLowerCase()
  if (!value || value === 'unidad') return 'Unidades'
  if (value === 'kg') return 'Kilogramos'
  if (value === 'l' || value === 'lt' || value === 'litro') return 'Litros'
  return normalizeLabelText(unidad)
}

function formatProductoOptionLabel(producto) {
  const nombre = normalizeLabelText(producto?.nombre) || 'Producto sin nombre'
  const marca = producto?.marca ? ` - ${producto.marca}` : ''
  const unidad = formatUnidad(producto?.unidad_medida)
  return `${nombre}${marca} (${unidad})`
}



// ============================================================
// Vista Supervisor: Bandeja de aprobación de pedidos
// ============================================================
function SupervisorPedidos() {
  const { token, user } = useAuth()
  const printRef = useRef(null)

  const [instituciones, setInstituciones] = useState([])
  const [pedidosPendientes, setPedidosPendientes] = useState([])
  const [procesados, setProcesados] = useState([])
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [rechazandoId, setRechazandoId] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [historialVisible, setHistorialVisible] = useState(null)
  const [historialData, setHistorialData] = useState([])
  const [historialConsumoVisible, setHistorialConsumoVisible] = useState(null)
  const [historialConsumoData, setHistorialConsumoData] = useState(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const loadData = async () => {
    try {
      const [instRes, pedRes] = await Promise.all([
        apiFetch(`/api/supervisor/instituciones`, { token }),
        apiFetch(`/api/supervisor/pedidos-pendientes`, { token }),
      ])
      if (instRes.ok) {
        const instData = await instRes.json()
        const nextInst = instData.instituciones || []
        setInstituciones(prev => JSON.stringify(prev) === JSON.stringify(nextInst) ? prev : nextInst)
      }
      if (pedRes.ok) {
        const pedData = await pedRes.json()
        const nextPed = pedData.pedidos || []
        setPedidosPendientes(prev => JSON.stringify(prev) === JSON.stringify(nextPed) ? prev : nextPed)
      }
    } catch (err) {
      console.error('Error cargando datos del supervisor:', err)
    }
  }

  useEffect(() => {
    let isMounted = true
    loadData()

    const interval = setInterval(() => {
      if (isMounted && document.visibilityState === 'visible') {
        loadData()
      }
    }, 3000)

    const onFocus = () => {
      if (isMounted) loadData()
    }
    const onVisibility = () => {
      if (isMounted && document.visibilityState === 'visible') loadData()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [token])

  const handleAprobar = async (pedidoId) => {
    try {
      const res = await apiFetch(`/api/pedidos/${pedidoId}/estado`, { token, method: 'PATCH', body: JSON.stringify({ estado: 'aprobado' }) })
      if (!res.ok) {
        const err = await res.json()
        setMsg({ text: err.error || 'Error al aprobar pedido', type: 'error' })
        setTimeout(() => setMsg({ text: '', type: '' }), 3000)
        return
      }
      const pedido = pedidosPendientes.find(p => p.id === pedidoId)
      setPedidosPendientes(prev => prev.filter(p => p.id !== pedidoId))
      setProcesados(prev => [...prev, { ...pedido, estado: 'aprobado', fechaProcesado: new Date().toISOString() }])
      setMsg({ text: `Pedido #${pedidoId} aprobado correctamente`, type: 'success' })
    } catch (err) {
      setMsg({ text: 'Error de conexión al aprobar pedido', type: 'error' })
    }
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  const iniciarRechazo = (id) => { setRechazandoId(id); setMotivoRechazo('') }
  const cancelarRechazo = () => { setRechazandoId(null); setMotivoRechazo('') }

  const confirmarRechazo = async (pedidoId) => {
    if (!motivoRechazo.trim()) {
      setMsg({ text: 'Debe ingresar un motivo de rechazo', type: 'error' })
      setTimeout(() => setMsg({ text: '', type: '' }), 3000)
      return
    }
    try {
      const res = await apiFetch(`/api/pedidos/${pedidoId}/estado`, { token, method: 'PATCH', body: JSON.stringify({ estado: 'rechazado', motivo: motivoRechazo.trim() }) })
      if (!res.ok) {
        const err = await res.json()
        setMsg({ text: err.error || 'Error al rechazar pedido', type: 'error' })
        setTimeout(() => setMsg({ text: '', type: '' }), 3000)
        return
      }
      const pedido = pedidosPendientes.find(p => p.id === pedidoId)
      setPedidosPendientes(prev => prev.filter(p => p.id !== pedidoId))
      setProcesados(prev => [...prev, { ...pedido, estado: 'rechazado', motivo: motivoRechazo.trim(), fechaProcesado: new Date().toISOString() }])
      setMsg({ text: `Pedido #${pedidoId} rechazado`, type: 'success' })
    } catch (err) {
      setMsg({ text: 'Error de conexión al rechazar pedido', type: 'error' })
    }
    setRechazandoId(null); setMotivoRechazo('')
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  const verHistorial = async (institucionId, institucionNombre) => {
    if (historialConsumoVisible === institucionId) {
      setHistorialConsumoVisible(null)
      setHistorialConsumoData(null)
      return
    }
    setLoadingHistorial(true)
    try {
      const res = await apiFetch(`/api/supervisor/instituciones/${institucionId}/historial-consumo`, { token })
      if (res.ok) {
        const data = await res.json()
        setHistorialConsumoData({ ...data, institucionNombre })
      } else {
        setHistorialConsumoData(null)
      }
    } catch {
      setHistorialConsumoData(null)
    }
    setLoadingHistorial(false)
    setHistorialConsumoVisible(institucionId)
  }

  const pedidosFiltrados = busqueda.trim()
    ? pedidosPendientes.filter(p => p.institucion.toLowerCase().includes(busqueda.toLowerCase()) || p.producto.toLowerCase().includes(busqueda.toLowerCase()))
    : pedidosPendientes

  return (
    <div className="supervisor-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2>Pedidos — Supervisor</h2>
        <PrintButton targetRef={printRef} title="Reporte Pedidos Supervisor" />
      </div>

      <div className="sv-jurisdiction-banner">
        <span className="sv-jurisdiction-dot"></span>
        <span>Nivel Educativo: <strong>{user?.nivel_educativo || '-'}</strong></span>
        <span className="sv-jurisdiction-count">{instituciones.length} escuelas</span>
      </div>

      {msg.text && <div className={`msg show ${msg.type === 'success' ? 'msg-success' : 'msg-error'}`}>{msg.text}</div>}

      <div ref={printRef}>
        <h3>Pedidos Pendientes de Aprobación</h3>

        <div style={{ marginBottom: 16, maxWidth: 400 }}>
          <input type="text" placeholder="Buscar por institución o producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ marginBottom: 0 }} />
        </div>

        {pedidosFiltrados.length === 0 ? (
          <div className="sv-empty-state">No hay pedidos pendientes en tu jurisdicción</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Institución</th>
                <th>Fecha</th>
                <th>Pedido</th>
                <th>Cantidad</th>
                <th>Solicitante</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map(pedido => (
                <tr key={pedido.id}>
                  <td><strong>{pedido.institucion}</strong></td>
                  <td>{new Date(pedido.fecha).toLocaleDateString('es-AR')}</td>
                  <td>{pedido.producto}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{pedido.cantidad}</td>
                  <td>{pedido.solicitante}</td>
                  <td>{pedido.notas || '-'}</td>
                  <td>
                    {rechazandoId === pedido.id ? (
                      <div className="sv-rechazo-box">
                        <textarea className="sv-rechazo-input" placeholder="Motivo del rechazo..." value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} rows={2} />
                        <div className="inline-actions" style={{ marginTop: 6 }}>
                          <button onClick={() => confirmarRechazo(pedido.id)} className="sv-btn-confirmar-rechazo">Confirmar</button>
                          <button onClick={cancelarRechazo} className="secondary" style={{ margin: 0, minHeight: 'auto', padding: '6px 12px', fontSize: '0.75rem' }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-actions">
                        <button onClick={() => handleAprobar(pedido.id)}>Aprobar</button>
                        <button onClick={() => iniciarRechazo(pedido.id)} className="sv-btn-rechazar">Rechazar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {procesados.length > 0 && (
          <>
            <h3>Procesados en esta sesión</h3>
            <table>
              <thead><tr><th>Institución</th><th>Producto</th><th>Cantidad</th><th>Estado</th><th>Motivo</th></tr></thead>
              <tbody>
                {procesados.map(p => (
                  <tr key={p.id}>
                    <td>{p.institucion}</td>
                    <td>{p.producto}</td>
                    <td style={{ textAlign: 'center' }}>{p.cantidad}</td>
                    <td><span className={`badge badge-estado-${p.estado}`}>{p.estado}</span></td>
                    <td>{p.motivo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h3>Escuelas de la Jurisdicción</h3>
        <div className="sv-instituciones-grid">
          {instituciones.map(inst => (
            <div key={inst.id} className="sv-inst-card">
              <div className="sv-inst-header">
                <span className="badge sv-badge-tipo-escuela">Escuela</span>
                <span className="sv-inst-cue">CUE: {inst.cue}</span>
              </div>
              <div className="sv-inst-nombre">{inst.nombre}</div>
              <button 
                className="secondary sv-btn-historial" 
                onClick={() => verHistorial(inst.id, inst.nombre)}
              >
                {historialConsumoVisible === inst.id ? 'Ocultar historial' : 'Ver historial de consumo'}
              </button>
              {historialConsumoVisible === inst.id && (
                <div className="sv-historial-panel" style={{ padding: 0, margin: '12px 0 0 0' }}>
                  {loadingHistorial ? (
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '16px 0', textAlign: 'center' }}>Cargando historial...</p>
                  ) : historialConsumoData ? (
                    <div style={{ marginTop: 8 }}>
                      {/* Resumen */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                        <div style={{ background: '#f0f9ff', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0369a1' }}>
                            {historialConsumoData.resumen?.pedidos_anuales?.total || 0}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#0369a1' }}>Pedidos Anuales</div>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
                            {historialConsumoData.resumen?.pedidos_refuerzo?.total || 0}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#166534' }}>Pedidos Refuerzo</div>
                        </div>
                      </div>
                      
                      {/* Consumo por producto */}
                      {historialConsumoData.consumo_por_producto && historialConsumoData.consumo_por_producto.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Consumo por Producto:</div>
                          <table className="sv-historial-table" style={{ fontSize: '0.8rem' }}>
                            <thead>
                              <tr>
                                <th style={{ fontSize: '0.75rem' }}>Producto</th>
                                <th style={{ fontSize: '0.75rem' }}>Total</th>
                                <th style={{ fontSize: '0.75rem' }}>Entregas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historialConsumoData.consumo_por_producto.slice(0, 5).map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.producto}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.total_consumido}</td>
                                  <td style={{ textAlign: 'center' }}>{item.cantidad_movimientos}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Últimos movimientos */}
                      {historialConsumoData.movimientos && historialConsumoData.movimientos.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Últimas Entregas:</div>
                          <table className="sv-historial-table" style={{ fontSize: '0.8rem' }}>
                            <thead>
                              <tr>
                                <th style={{ fontSize: '0.75rem' }}>Fecha</th>
                                <th style={{ fontSize: '0.75rem' }}>Producto</th>
                                <th style={{ fontSize: '0.75rem' }}>Cant.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historialConsumoData.movimientos.slice(0, 5).map((h, idx) => (
                                <tr key={idx}>
                                  <td>{new Date(h.fecha).toLocaleDateString('es-AR')}</td>
                                  <td>{h.producto}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{h.cantidad}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {(!historialConsumoData.consumo_por_producto || historialConsumoData.consumo_por_producto.length === 0) && 
                       (!historialConsumoData.movimientos || historialConsumoData.movimientos.length === 0) && (
                        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '8px 0' }}>Sin registros de consumo</p>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '8px 0' }}>Error al cargar historial</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Vista Depósito: Gestión de pedidos (admin, operador, directivo)
// ============================================================
function DepositoPedidos() {
  const { token, user, hasPermission } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [productos, setProductos] = useState([])
  const [kits, setKits] = useState([])
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [form, setForm] = useState({ producto_id: '', cantidad: '', notas: '' })
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewingPedido, setViewingPedido] = useState(null)
  const [pedidoACancelar, setPedidoACancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)

  const handleImprimirPedido = (pedido) => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido #${pedido.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header-left { font-weight: bold; font-size: 1.2rem; }
            .header-right { text-align: right; font-size: 0.9rem; color: #666; }
            .title { text-align: center; font-size: 1.8rem; font-weight: bold; margin: 30px 0; letter-spacing: 2px; text-decoration: underline; }
            .date { text-align: right; margin-bottom: 30px; font-style: italic; }
            .content { margin-bottom: 30px; line-height: 1.6; }
            .content p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
            .text-center { text-align: center; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.8rem; color: #aaa; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left" style="display: flex; align-items: center; gap: 12px;">
              <img src="/faviconmin.png" alt="Logo San Juan" style="height: 45px; width: auto; object-fit: contain;" />
              <div>
                <div style="font-weight: bold; font-size: 1.1rem;">San Juan Gobierno</div>
                <div style="font-size: 0.9rem; color: #666;">Ministerio de Educación</div>
              </div>
            </div>
            <div class="header-right">Pedido #${pedido.id}</div>
          </div>
          
          <div class="title">PEDIDO</div>
          
          <div class="date">San Juan, ${new Date(pedido.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          
          <div class="content">
            <p><b>Institución:</b> ${pedido.institucion || '-'}</p>
            <p><b>Solicitado por:</b> ${pedido.usuario_nombre || '-'}</p>
            <p><b>Estado:</b> ${pedido.estado}</p>
            <p><b>Notas:</b> ${pedido.notas || '-'}</p>
          </div>
          
          <p>Sírvase remitir a éste Ministerio, lo siguiente:</p>
          
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">Reng</th>
                <th class="text-center" style="width: 80px;">Cant.</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center">1</td>
                <td class="text-center">${pedido.cantidad}</td>
                <td>${pedido.producto_nombre || '-'}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            Documento generado por el sistema Depo.
          </div>
          
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const loadProductos = async () => {
    try {
      const res = await apiFetch('/api/productos', { token })
      if (res.ok) {
        const data = await res.json()
        setProductos(data.productos || [])
      }
    } catch { /* ignore */ }
  }

  const loadPedidos = async () => {
    try {
      const res = await apiFetch('/api/pedidos', { token })
      if (res.ok) {
        const data = await res.json()
        const nextPedidos = data.pedidos || []
        setPedidos(prev => JSON.stringify(prev) === JSON.stringify(nextPedidos) ? prev : nextPedidos)
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    let isMounted = true
    loadProductos()
    loadPedidos()

    const interval = setInterval(() => {
      if (isMounted && document.visibilityState === 'visible') {
        loadPedidos()
      }
    }, 3000)

    const onFocus = () => {
      if (isMounted) loadPedidos()
    }
    const onVisibility = () => {
      if (isMounted && document.visibilityState === 'visible') loadPedidos()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [token])

  const handleCreate = async (e) => {
    e.preventDefault()
    setMsg({ text: '', type: '' })

    const payload = {
      producto_id: parseInt(form.producto_id, 10),
      cantidad: parseInt(form.cantidad, 10),
      notas: form.notas.trim() || null
    }

    const res = await apiFetch('/api/pedidos', {
      token,
      method: 'POST',
      body: JSON.stringify(payload)
    })

    const data = await res.json().catch(() => ({ }))
    if (!res.ok) {
      setMsg({ text: data.error || 'No se pudo crear el pedido', type: 'error' })
      return
    }

    setForm({ producto_id: '', cantidad: '', notas: '' })
    setCreateModalOpen(false)
    setMsg({ text: 'Pedido creado correctamente', type: 'success' })
    loadPedidos()
  }

  const handleAction = async (id, action) => {
    setMsg({ text: '', type: '' })

    let url = null
    let options = null

    if (action === 'cancelar') {
      url = `/api/pedidos/${id}/cancelar`
      options = { token, method: 'PATCH' }
    }
    if (action === 'aprobar') {
      url = `/api/pedidos/${id}/estado`
      options = { token, method: 'PATCH', body: JSON.stringify({ estado: 'aprobado' }) }
    }
    if (action === 'rechazar') {
      url = `/api/pedidos/${id}/estado`
      options = { token, method: 'PATCH', body: JSON.stringify({ estado: 'rechazado' }) }
    }
    if (action === 'entregar') {
      url = `/api/pedidos/${id}/estado`
      options = { token, method: 'PATCH', body: JSON.stringify({ estado: 'entregado' }) }
    }

    if (!url || !options) return

    const res = await apiFetch(url, options)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMsg({ text: data.error || 'No se pudo actualizar el pedido', type: 'error' })
      return
    }

    loadPedidos()
    loadProductos()
  }

  const canCreatePedido = hasPermission('pedidos.create') && user?.role === 'directivo'
  const canManage = hasPermission('pedidos.manage')
  const canSupervisorDecision = canManage && user?.role === 'supervisor'
  const canEntregar = canManage && user?.role !== 'supervisor' && user?.role !== 'director_area'
  const productosOrdenados = [...productos].sort((a, b) =>
    String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' })
  )

  const printRef = useRef(null)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>{user?.role === 'director_area' ? 'Historial Pedidos' : 'Gestión de Pedidos'}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {canCreatePedido && (
            <button
              type="button"
              className="mov-action-btn"
              style={{ width: 'auto', margin: 0, padding: '14px 22px', fontSize: '1rem' }}
              onClick={() => {
                setCreateModalOpen(true)
                setMsg({ text: '', type: '' })
              }}
            >
              <span aria-hidden="true" style={{ marginRight: 8, fontSize: '1.2rem' }}>📝</span>
              Crear pedido
            </button>
          )}
          <PrintButton targetRef={printRef} title="Reporte de Pedidos" />
        </div>
      </div>

      {canCreatePedido && createModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setCreateModalOpen(false)
            }
          }}
        >
          <div style={{ background: '#f9fafb', padding: 24, borderRadius: 10, width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Nuevo pedido</h3>
            <form onSubmit={handleCreate} className="grid">
              <div>
                <label>Kit</label>
                <select value={form.kit_id} onChange={e => setForm({ ...form, kit_id: e.target.value, producto_id: e.target.value })} required>
                  <option value="">Seleccionar kit...</option>
                  {productosOrdenados.map(p => (
                    <option key={p.id} value={p.id}>{formatProductoOptionLabel(p)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Cantidad de kits</label>
                <input type="number" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} placeholder="0" min="1" required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Notas</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  placeholder="Observaciones del pedido"
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setCreateModalOpen(false)
                    setForm({ producto_id: '', cantidad: '', notas: '' })
                  }}
                >
                  Cancelar
                </button>
                <button type="submit">Crear pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingPedido && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setViewingPedido(null)
            }
          }}
        >
          <div style={{ background: '#f9fafb', padding: 24, borderRadius: 10, width: 'min(500px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Detalle del Pedido #{viewingPedido.id}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><b>Institución:</b> {viewingPedido.institucion || '-'}</div>
              <div><b>Producto:</b> {viewingPedido.producto_nombre || '-'}</div>
              <div><b>Cantidad:</b> {viewingPedido.cantidad}</div>
              <div><b>Estado:</b> <span className={`badge badge-estado-\${viewingPedido.estado}`}>{viewingPedido.estado}</span></div>
              <div><b>Solicitado por:</b> {viewingPedido.usuario_nombre || '-'}</div>
              <div><b>Fecha:</b> \${new Date(viewingPedido.created_at).toLocaleDateString()}</div>
              <div><b>Notas:</b> {viewingPedido.notas || '-'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="secondary" onClick={() => setViewingPedido(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para cancelar pedido */}
      <Modal
        isOpen={Boolean(pedidoACancelar)}
        onClose={() => {
          if (!cancelando) setPedidoACancelar(null)
        }}
        title="Confirmar cancelación de pedido"
        maxWidth={480}
      >
        {pedidoACancelar && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  fontSize: '1.5rem',
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                ⚠️
              </div>
              <div>
                <p style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 600, color: '#111827' }}>
                  ¿Está seguro que desea cancelar este pedido?
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', lineHeight: 1.45 }}>
                  Esta acción anulará el pedido.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div><strong>Nº de Pedido:</strong> #{pedidoACancelar.id}</div>
              <div><strong>Producto:</strong> {pedidoACancelar.producto_nombre || '-'}</div>
              <div><strong>Cantidad:</strong> {pedidoACancelar.cantidad}</div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary"
                disabled={cancelando}
                onClick={() => setPedidoACancelar(null)}
                style={{ margin: 0 }}
              >
                No, mantener pedido
              </button>
              <button
                type="button"
                className="sv-btn-rechazar"
                disabled={cancelando}
                onClick={async () => {
                  setCancelando(true)
                  try {
                    await handleAction(pedidoACancelar.id, 'cancelar')
                    setPedidoACancelar(null)
                  } finally {
                    setCancelando(false)
                  }
                }}
                style={{
                  margin: 0,
                  padding: '9px 18px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: cancelando ? 'not-allowed' : 'pointer',
                  opacity: cancelando ? 0.7 : 1
                }}
              >
                {cancelando ? 'Cancelando...' : 'Sí, cancelar pedido'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {msg.text && (
        <div className={`msg show ${msg.type === 'success' ? 'msg-success' : 'msg-error'}`}>{msg.text}</div>
      )}

      <div ref={printRef}>

      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            {canManage && <th>Stock Actual</th>}
            <th>Institución</th>
            <th>Estado</th>
            <th>Solicitado por</th>
            <th>Notas</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map(pedido => {
            const stockActual = Number(pedido.stock_actual || 0)
            const stockSuficiente = stockActual >= Number(pedido.cantidad || 0)
            const canCancel = hasPermission('pedidos.create') && pedido.estado === 'pendiente' && !canManage

            return (
              <tr key={pedido.id}>
                <td>{pedido.producto_nombre || '-'}</td>
                <td>{pedido.cantidad}</td>
                {canManage && <td>{stockActual}</td>}
                <td>{pedido.institucion || '-'}</td>
                <td><span className={`badge badge-estado-${pedido.estado}`}>{pedido.estado}</span></td>
                <td>{pedido.usuario_nombre || '-'}</td>
                <td>{pedido.notas || '-'}</td>
                <td>{new Date(pedido.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="inline-actions">
                    {canSupervisorDecision && pedido.estado === 'pendiente' && (
                      <>
                        <button onClick={() => handleAction(pedido.id, 'aprobar')} disabled={!stockSuficiente} title={!stockSuficiente ? 'Stock insuficiente para aprobar' : ''}>Aprobar</button>
                        <button onClick={() => handleAction(pedido.id, 'rechazar')}>Rechazar</button>
                      </>
                    )}
                    {canEntregar && pedido.estado !== 'entregado' && pedido.estado !== 'rechazado' && pedido.estado !== 'cancelado' && (
                      <button onClick={() => handleAction(pedido.id, 'entregar')}>Entregar</button>
                    )}
                    {canCancel && (
                      <button type="button" onClick={() => setPedidoACancelar(pedido)}>Cancelar</button>
                    )}
                    {user?.role === 'director_area' && (
                      <>
                        <button onClick={() => setViewingPedido(pedido)} style={{ color: 'white', backgroundColor: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <ActionIcon name="verdetalle" size={14} />
                          Ver
                        </button>
                        <button onClick={() => handleImprimirPedido(pedido)} style={{ color: 'white', backgroundColor: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <ActionIcon name="imprimir" size={14} />
                          Imprimir
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

// ============================================================
// Vista Directivo: Solicitud Anual y Solicitud de Refuerzos
// ============================================================
function DirectivoPedidos() {
  const { token } = useAuth()
  const [tab, setTab] = useState('anual')
  const [pedidos, setPedidos] = useState([])
  const [kits, setKits] = useState([])
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [form, setForm] = useState({ kit_id: '', cantidad: '1', notas: '', items: {} })
  const [modalOpen, setModalOpen] = useState(false)
  const [pedidoACancelar, setPedidoACancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const printRef = useRef(null)

  const loadKits = async () => {
    try {
      const res = await apiFetch('/api/pedidos/kits', { token })
      if (res.ok) {
        const data = await res.json()
        setKits(data.kits || [])
      }
    } catch { /* ignore */ }
  }

  const loadPedidos = async () => {
    try {
      const res = await apiFetch('/api/pedidos', { token })
      if (res.ok) {
        const data = await res.json()
        const nextPedidos = data.pedidos || []
        setPedidos(prev => JSON.stringify(prev) === JSON.stringify(nextPedidos) ? prev : nextPedidos)
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    let isMounted = true
    loadKits()
    loadPedidos()

    const interval = setInterval(() => {
      if (isMounted && document.visibilityState === 'visible') {
        loadPedidos()
      }
    }, 3000)

    const onFocus = () => {
      if (isMounted) loadPedidos()
    }
    const onVisibility = () => {
      if (isMounted && document.visibilityState === 'visible') loadPedidos()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [token])

  const handleCreate = async (e) => {
    e.preventDefault()
    setMsg({ text: '', type: '' })

    let payload = {
      notas: form.notas.trim() || null,
      tipo: tab,
    }

    if (tab === 'refuerzo') {
      const items = Object.entries(form.items || {})
        .map(([productoId, cantidad]) => ({
          producto_id: parseInt(productoId, 10),
          cantidad: Number(cantidad)
        }))
        .filter((item) => Number.isInteger(item.producto_id) && item.producto_id > 0 && item.cantidad > 0)

      if (items.length === 0) {
        setMsg({ text: 'Debés indicar cantidad para al menos un producto', type: 'error' })
        return
      }

      payload = {
        ...payload,
        items
      }
    } else {
      payload = {
        ...payload,
        kit_id: parseInt(form.kit_id, 10),
        cantidad: parseInt(form.cantidad, 10),
      }
    }

    const res = await apiFetch('/api/pedidos', { token, method: 'POST', body: JSON.stringify(payload) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMsg({ text: data.error || 'No se pudo crear el pedido', type: 'error' })
      return
    }
    setForm({ kit_id: '', cantidad: '1', notas: '', items: {} })
    setModalOpen(false)
    const mensajeCreacion = tab === 'refuerzo'
      ? (data.requiere_licitacion
          ? 'Solicitud creada. Los productos sin stock quedarán derivados a Licitaciones Refuerzos cuando se apruebe.'
          : 'Solicitud creada. El refuerzo podrá atenderse con stock disponible.')
      : 'Pedido creado correctamente'
    setMsg({ text: mensajeCreacion, type: 'success' })
    loadPedidos()
  }

  const handleCancelar = (pedido) => {
    setPedidoACancelar(pedido)
  }

  const confirmarCancelar = async () => {
    if (!pedidoACancelar) return
    setCancelando(true)
    setMsg({ text: '', type: '' })
    try {
      const res = await apiFetch(`/api/pedidos/${pedidoACancelar.id}/cancelar`, { token, method: 'PATCH' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ text: data.error || 'No se pudo cancelar el pedido', type: 'error' })
        return
      }
      setMsg({ text: `Pedido #${pedidoACancelar.id} cancelado correctamente`, type: 'success' })
      setPedidoACancelar(null)
      loadPedidos()
    } catch {
      setMsg({ text: 'Error de conexión al cancelar el pedido', type: 'error' })
    } finally {
      setCancelando(false)
    }
  }

  const getEstadoVisiblePedido = (pedido) => {
    if (pedido.estado === 'pendiente' && pedido.respuesta_supervisor_tipo === 'aclaracion') {
      return 'aclaracion'
    }
    return pedido.estado
  }

  const ApprovalStepper = ({ pedido }) => {
    const { estado, logistica } = pedido
    
    // Para pedidos de tipo 'refuerzo' no mostramos el paso de Director Área
    const isAnual = (pedido.tipo || 'anual') === 'anual'
    const tieneLicitacionFormalActiva = isAnual && logistica?.estado_licitacion && ['publicada', 'adjudicada'].includes(logistica.estado_licitacion)

    let steps = []
    if (!isAnual) {
      steps = [
        { id: 'pendiente', label: 'Supervisor' },
        { id: 'aprobado', label: 'Habilitado Retiro' },
        { id: 'entregado', label: 'Entregado' }
      ]
    } else if (tieneLicitacionFormalActiva) {
      steps = [
        { id: 'pendiente', label: 'Supervisor' },
        { id: 'pendiente_director', label: 'Director Área' },
        { id: 'licitacion', label: 'Licitación' },
        { id: 'en_deposito', label: 'En Depósito' },
        { id: 'entregado', label: 'Entregado' }
      ]
    } else {
      steps = [
        { id: 'pendiente', label: 'Supervisor' },
        { id: 'pendiente_director', label: 'Director Área' },
        { id: 'aprobado', label: 'Habilitado Retiro' },
        { id: 'entregado', label: 'Entregado' }
      ]
    }

    const getStepStatus = (stepId, currentEstado, log) => {
      const order = tieneLicitacionFormalActiva
        ? ['pendiente', 'pendiente_director', 'licitacion', 'en_deposito', 'entregado']
        : (isAnual
            ? ['pendiente', 'pendiente_director', 'aprobado', 'entregado']
            : ['pendiente', 'aprobado', 'entregado'])
      let logicalEstado = currentEstado

      if (isAnual && tieneLicitacionFormalActiva && log && currentEstado === 'aprobado') {
        if (log.porcentaje_entrega >= 100) logicalEstado = 'entregado'
        else if (log.total_entregada > 0) logicalEstado = 'en_deposito'
        else if (log.estado_licitacion === 'en_deposito') logicalEstado = 'en_deposito'
        else if (log.estado_licitacion === 'adjudicada') logicalEstado = 'licitacion'
      } else if (currentEstado === 'aprobado') {
        if (log?.porcentaje_entrega >= 100) logicalEstado = 'entregado'
      }

      const currentIndex = order.indexOf(logicalEstado)
      const stepIndex = order.indexOf(stepId)

      if (currentEstado === 'rechazado' || currentEstado === 'cancelado') return 'error'
      if (stepIndex < currentIndex || logicalEstado === 'entregado') return 'completed'
      if (stepIndex === currentIndex) return 'active'
      return 'pending'
    }

    return (
      <div className="approval-stepper">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id, estado, logistica)
          return (
            <div key={step.id} className={`step ${status}`}>
              <div className="step-circle">
                {status === 'completed' ? '✓' : idx + 1}
              </div>
              <div className="step-label">{step.label}</div>
            </div>
          )
        })}
      </div>
    )
  }

  const formatEstadoPedido = (pedido) => {
    const { estado, logistica } = pedido
    if (estado === 'aclaracion') return 'Aclaración solicitada'
    if (estado === 'pendiente_director') return 'Aprob. Supervisor (En revisión Director)'

    if ((pedido.tipo || 'anual') === 'refuerzo' && estado === 'aprobado') {
      if (pedido.requiere_licitacion || pedido.estado_abastecimiento === 'requiere_licitacion') {
        return 'Aprobado - Derivado a compra'
      }
      return 'Habilitada para retiro'
    }
    
    if (estado === 'aprobado') {
      if (logistica?.porcentaje_entrega >= 100) return 'Entregado (100%)'
      if (logistica?.total_entregada > 0) return `Entrega Parcial (${logistica.porcentaje_entrega}%)`
      if (logistica?.estado_licitacion === 'en_deposito') return 'En Depósito Central'
      if (logistica?.estado_licitacion === 'adjudicada') return 'Licitación Adjudicada'
      if (logistica?.estado_licitacion === 'publicada') return 'En Proceso de Licitación'
      return 'Habilitada para retiro'
    }

    if (estado === 'entregado') return 'Entregado'
    if (estado === 'rechazado') return 'Rechazado'
    if (estado === 'cancelado') return 'Cancelado'
    return 'Pendiente de Supervisor'
  }

  const pedidosFiltrados = pedidos.filter(p => (p.tipo || 'anual') === tab)
  const tieneKits = kits.length > 0
  const kitSeleccionado = kits.find((kit) => Number(kit.id) === Number(form.kit_id))
  const cantidadKits = Math.max(1, parseInt(form.cantidad, 10) || 1)
  const cargandoCupos = false
  const tieneProductosKit = tieneKits
  const pedidoActivoBloqueante = pedidos.find((pedido) => {
    const estadoVisible = getEstadoVisiblePedido(pedido)
    return estadoVisible === 'pendiente' || estadoVisible === 'aclaracion'
  }) || null
  const puedeCrearAnual = tieneKits && !pedidoActivoBloqueante
  const puedeCrearRefuerzo = tieneKits && !pedidoActivoBloqueante
  const kitAsignado = kits.length === 1 ? kits[0] : kitSeleccionado
  const productosKitOrdenados = kits.map((kit) => ({
    id: kit.id,
    nombre: kit.nombre,
    unidad_medida: kit.tipo_escuela_label
  }))
  const textoBloqueoSolicitud = pedidoActivoBloqueante
    ? `Ya tenes la solicitud #${pedidoActivoBloqueante.id} en revision. Vas a poder generar otra cuando sea aprobada o rechazada.`
    : ''

  const badgeTab = (tipo) => {
    const count = pedidos.filter(p => (p.tipo || 'anual') === tipo && getEstadoVisiblePedido(p) === 'pendiente').length
    return count > 0 ? <span style={{ marginLeft: 6, background: '#ef4444', color: '#fff', borderRadius: 99, fontSize: '0.7rem', padding: '1px 7px' }}>{count}</span> : null
  }

  const pedidoAnualVigente = pedidos.find(p => (p.tipo || 'anual') === 'anual' && p.estado !== 'cancelado') || null
  const tieneRetiroDisponible = pedidos.some(p => p.estado === 'aprobado' && p.habilitado_retiro !== false)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.85rem', color: '#0f172a', fontWeight: 800 }}>Mis Pedidos</h2>
          <p style={{ margin: '4px 0 0 0', color: '#475569', fontSize: '1.02rem', fontWeight: 500 }}>
            Consultá el estado de los pedidos de tu escuela y gestioná el retiro de tus insumos escolares.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {((tab === 'refuerzo' && tieneKits) || (tab === 'anual' && tieneKits)) && (
            <button
              type="button"
              className="mov-action-btn"
              disabled={(tab === 'anual' && !puedeCrearAnual) || (tab === 'refuerzo' && !puedeCrearRefuerzo)}
              title={pedidoActivoBloqueante ? textoBloqueoSolicitud : undefined}
              style={{
                width: 'auto',
                margin: 0,
                padding: '12px 24px',
                fontSize: '1.05rem',
                fontWeight: 700,
                borderRadius: 12,
                opacity: pedidoActivoBloqueante ? 0.6 : 1,
                cursor: pedidoActivoBloqueante ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 10px rgba(234, 88, 12, 0.25)'
              }}
              onClick={() => {
                if (pedidoActivoBloqueante) return
                setModalOpen(true)
                setMsg({ text: '', type: '' })
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>📝</span>
              Nueva solicitud
            </button>
          )}
          <PrintButton targetRef={printRef} title="Reporte de Pedidos" />
        </div>
      </div>

      {/* Pestañas Accesibles con Alto Contraste (Estilo Carpeta) */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginTop: 20,
        padding: '6px',
        background: '#f8fafc',
        borderRadius: 14,
        border: '1.5px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'anual', icon: '📋', label: '1. Pedido Anual', desc: 'Kit oficial del año' },
          { key: 'retiro', icon: '📦', label: '2. Retirar Mercadería', desc: 'Gestionar retiro en depósito' },
          { key: 'refuerzo', icon: '➕', label: '3. Pedir Refuerzo', desc: 'Insumos extra por urgencia' }
        ].map(({ key, icon, label, desc }) => {
          const isActive = tab === key
          const isRetiroListo = key === 'retiro' && tieneRetiroDisponible
          const countPendientes = pedidos.filter(p => (p.tipo || 'anual') === key && getEstadoVisiblePedido(p) === 'pendiente').length

          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              style={{
                flex: '1 1 210px',
                minHeight: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                borderRadius: 10,
                border: isActive ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                background: isActive ? '#1d4ed8' : '#ffffff',
                color: isActive ? '#ffffff' : '#1e293b',
                fontWeight: isActive ? 800 : 600,
                fontSize: '1.02rem',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 14px -2px rgba(29, 78, 216, 0.35)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                <div>
                  <div style={{ lineHeight: 1.2 }}>{label}</div>
                  <div style={{ fontSize: '0.8rem', color: isActive ? '#bfdbfe' : '#64748b', fontWeight: 500, marginTop: 2 }}>
                    {desc}
                  </div>
                </div>
              </div>
              <div>
                {isRetiroListo && !isActive && (
                  <span style={{ background: '#16a34a', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 9px', borderRadius: 99, boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)' }}>
                    ● Listo para retirar
                  </span>
                )}
                {countPendientes > 0 && !isRetiroListo && (
                  <span style={{ background: isActive ? '#f97316' : '#ef4444', color: '#fff', fontSize: '0.78rem', fontWeight: 800, padding: '3px 8px', borderRadius: 99 }}>
                    {countPendientes}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {tab === 'retiro' && (
        <SolicitudesRetiro embedded />
      )}

      {tab !== 'retiro' && pedidoActivoBloqueante && (
        <div className="msg show msg-error" style={{ fontSize: '1rem', padding: '14px 18px', marginTop: 14 }}>
          {textoBloqueoSolicitud}
        </div>
      )}

      {!cargandoCupos && !tieneProductosKit && (
        <div className="msg show msg-error" style={{ fontSize: '1rem', padding: '14px 18px', marginTop: 14 }}>
          Tu escuela no tiene kits asignados. Contactá al director de área o al administrador para configurarlos.
        </div>
      )}

      {msg.text && (
        <div className={`msg show ${msg.type === 'success' ? 'msg-success' : 'msg-error'}`} style={{ fontSize: '1rem', padding: '14px 18px', marginTop: 14 }}>
          {msg.text}
        </div>
      )}

      {/* Hero Card del Pedido Anual Vigente */}
      {tab === 'anual' && (
        <div>
          {!pedidoAnualVigente ? (
            <div style={{
              marginTop: 20,
              padding: '32px 28px',
              background: '#ffffff',
              border: '2px dashed #93c5fd',
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 10 }}>📦</div>
              <h3 style={{ fontSize: '1.35rem', color: '#1e3a8a', margin: '0 0 8px 0', fontWeight: 800 }}>
                Aún no enviaste la Solicitud Anual para tu escuela
              </h3>
              <p style={{ color: '#475569', fontSize: '1rem', margin: '0 auto 20px', maxWidth: 600, lineHeight: 1.5 }}>
                Tu escuela tiene asignado el <strong>{kitAsignado?.nombre || 'Kit Escolar Oficial'}</strong> con la provisión de insumos para todo el ciclo lectivo.
              </p>
              {puedeCrearAnual && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 28px',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <span>📝</span> Iniciar Solicitud Anual ➔
                </button>
              )}
            </div>
          ) : (
            <div className="fade-in" style={{
              marginTop: 20,
              padding: '26px 30px',
              background: pedidoAnualVigente.estado === 'aprobado' ? '#f0fdf4' : (pedidoAnualVigente.estado === 'pendiente_director' ? '#eff6ff' : '#ffffff'),
              border: `2px solid ${pedidoAnualVigente.estado === 'aprobado' ? '#86efac' : (pedidoAnualVigente.estado === 'pendiente_director' ? '#bfdbfe' : '#fed7aa')}`,
              borderRadius: 18,
              boxShadow: '0 6px 16px rgba(0,0,0,0.04)'
            }}>
              {/* Header de la Tarjeta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 18 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{
                      background: pedidoAnualVigente.estado === 'aprobado' ? '#166534' : (pedidoAnualVigente.estado === 'pendiente_director' ? '#1e40af' : '#c2410c'),
                      color: '#ffffff',
                      padding: '5px 12px',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      letterSpacing: '0.5px'
                    }}>
                      SOLICITUD ANUAL #{pedidoAnualVigente.id}
                    </span>
                    <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 600 }}>
                      Fecha: {new Date(pedidoAnualVigente.created_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                  <h3 style={{ margin: '10px 0 4px 0', fontSize: '1.45rem', color: '#0f172a', fontWeight: 800 }}>
                    {pedidoAnualVigente.kit_nombre || 'Kit Anual Asignado'}
                  </h3>
                  <p style={{ margin: 0, color: '#475569', fontSize: '1rem', fontWeight: 500 }}>
                    {pedidoAnualVigente.estado === 'aprobado' && 'Tu solicitud completó todas las firmas oficiales. Ya podés retirar tus insumos en el depósito central.'}
                    {pedidoAnualVigente.estado === 'pendiente_director' && 'El Supervisor Zonal ya aprobó la solicitud. Actualmente se encuentra a la firma del Director de Área.'}
                    {pedidoAnualVigente.estado === 'pendiente' && 'Tu solicitud está en revisión por el supervisor zonal asignado a tu escuela.'}
                  </p>
                </div>

                <div>
                  {pedidoAnualVigente.estado === 'aprobado' ? (
                    <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', padding: '10px 18px', borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado Oficial</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#166534' }}>✓ HABILITADA PARA RETIRO</div>
                    </div>
                  ) : pedidoAnualVigente.estado === 'pendiente_director' ? (
                    <div style={{ background: '#dbeafe', border: '1.5px solid #93c5fd', padding: '10px 18px', borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado Oficial</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e40af' }}>⏳ EN FIRMA DIRECTOR DE ÁREA</div>
                    </div>
                  ) : (
                    <div style={{ background: '#ffedd5', border: '1.5px solid #fdba74', padding: '10px 18px', borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado Oficial</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c2410c' }}>⏳ EN REVISIÓN SUPERVISOR</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stepper Amplio y Accesible */}
              <div style={{ margin: '22px 0 16px 0' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                  Circuito de Aprobación y Entrega:
                </div>
                <div className="approval-stepper-hero">
                  {[
                    { id: 'enviado', label: '1. Solicitud Enviada', sub: 'Por la escuela', status: 'completed' },
                    {
                      id: 'supervisor',
                      label: '2. Firma Supervisor',
                      sub: pedidoAnualVigente.estado === 'pendiente' ? 'En revisión actual' : 'Aprobado ✓',
                      status: pedidoAnualVigente.estado === 'pendiente' ? 'active' : 'completed'
                    },
                    {
                      id: 'director',
                      label: '3. Director de Área',
                      sub: pedidoAnualVigente.estado === 'aprobado' ? 'Aprobado ✓' : (pedidoAnualVigente.estado === 'pendiente_director' ? 'En revisión actual' : 'Próximo paso'),
                      status: pedidoAnualVigente.estado === 'aprobado' ? 'completed' : (pedidoAnualVigente.estado === 'pendiente_director' ? 'active' : 'pending')
                    },
                    {
                      id: 'retiro',
                      label: '4. Habilitado Retiro',
                      sub: pedidoAnualVigente.estado === 'aprobado' ? '¡Listo para retirar!' : 'Paso final',
                      status: pedidoAnualVigente.estado === 'aprobado' ? 'completed' : 'pending'
                    }
                  ].map((st) => (
                    <div key={st.id} className={`step-hero ${st.status}`}>
                      <div className="step-hero-circle">
                        {st.status === 'completed' ? '✓' : st.status === 'active' ? '⏳' : '•'}
                      </div>
                      <div className="step-hero-label">{st.label}</div>
                      <div className="step-hero-sublabel">{st.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call to Action Box si está Aprobado */}
              {pedidoAnualVigente.estado === 'aprobado' && (
                <div style={{
                  background: '#ffffff',
                  border: '2px solid #22c55e',
                  borderRadius: 14,
                  padding: '20px 24px',
                  margin: '22px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.18)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.7rem' }}>📦</span>
                      <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#15803d', fontWeight: 800 }}>
                        ¡Tus insumos están disponibles para retiro!
                      </h4>
                    </div>
                    <p style={{ margin: '6px 0 0 0', color: '#334155', fontSize: '0.98rem' }}>
                      Coordiná la fecha de retiro o registrá a la persona autorizada con su DNI haciendo clic aquí:
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTab('retiro')}
                    style={{
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 12,
                      padding: '14px 24px',
                      fontSize: '1.08rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      boxShadow: '0 4px 10px rgba(21, 128, 61, 0.3)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <span>📦</span> Solicitar Retiro de Mercadería ➔
                  </button>
                </div>
              )}

              {/* Insumos asignados */}
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                  Insumos asignados a tu escuela en este pedido:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                  {(pedidoAnualVigente.items || []).map((it, idx) => (
                    <div key={idx} style={{
                      background: '#ffffff',
                      padding: '16px 18px',
                      borderRadius: 12,
                      border: '1.5px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.02rem', lineHeight: 1.3 }}>
                          {it.producto_nombre}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 3 }}>
                          {it.unidad_medida || 'unidades'}
                        </div>
                      </div>
                      <div style={{
                        background: '#dcfce7',
                        color: '#166534',
                        fontSize: '1.35rem',
                        fontWeight: 900,
                        padding: '6px 14px',
                        borderRadius: 10,
                        flexShrink: 0
                      }}>
                        {it.cantidad}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal nuevo pedido */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div style={{ background: '#f9fafb', padding: 24, borderRadius: 10, width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>
              Nueva {tab === 'anual' ? 'Solicitud Anual' : 'Solicitud de Refuerzos'}
            </h3>
            <form onSubmit={handleCreate} className="grid">
              {tab === 'anual' ? (
                <>
                  <div>
                    <label>Kit</label>
                    <select value={form.kit_id} onChange={e => setForm({ ...form, kit_id: e.target.value })} required>
                      <option value="">Seleccionar kit...</option>
                      {kits.map(k => (
                        <option key={k.id} value={k.id}>{k.nombre}</option>
                      ))}
                    </select>
                  </div>
                  {kitSeleccionado && (
                    <div className="msg show" style={{ gridColumn: '1 / -1', marginBottom: 0, background: '#eff6ff', color: '#1e3a8a', border: '1px solid #93c5fd' }}>
                      <strong>{kitSeleccionado.nombre}</strong>
                      <div style={{ marginTop: 8 }}>
                        <b>Detalle de productos del kit:</b>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {(kitSeleccionado.items || []).map((item) => (
                            <li key={`${kitSeleccionado.id}-${item.producto_id}`}>
                              {item.producto_nombre}: {Number(item.cantidad) * cantidadKits} {item.unidad_medida || 'unidad'}
                            </li>
                          ))}
                        </ul>
                        {kitSeleccionado.cantidad_alumnos && (
                          <div style={{ marginTop: 6 }}>
                            <b>Cantidad de alumnos para este kit:</b> {kitSeleccionado.cantidad_alumnos}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <label>Cantidad de kits</label>
                    <input type="number" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} placeholder="0" min="1" required />
                  </div>
                </>
              ) : (
                <>
                  <div className="msg show" style={{ gridColumn: '1 / -1', marginBottom: 0, background: '#ecfeff', color: '#155e75', border: '1px solid #67e8f9' }}>
                    Vas a solicitar <b>productos individuales</b> del kit asignado a tu escuela.
                  </div>

                  {!kitAsignado ? (
                    <div className="msg show msg-error" style={{ gridColumn: '1 / -1' }}>
                      Tu escuela no tiene kit asignado. Contactá al director de área.
                    </div>
                  ) : (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>{kitAsignado.nombre}</div>
                      {(kitAsignado.items || []).length === 0 ? (
                        <div className="msg show msg-error">
                          El kit asignado no tiene productos configurados.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10 }}>
                          {(kitAsignado.items || []).map((item) => (
                            <div key={`${kitAsignado.id}-${item.producto_id}`} style={{ display: 'contents' }}>
                              <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}>
                                <div style={{ fontWeight: 600 }}>{item.producto_nombre}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                                  Unidad: {item.unidad_medida || 'unidad'}
                                </div>
                              </div>
                              <div>
                                <label style={{ display: 'block' }}>Cantidad</label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={form.items?.[String(item.producto_id)] ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setForm((prev) => ({
                                      ...prev,
                                      items: {
                                        ...(prev.items || {}),
                                        [String(item.producto_id)]: value
                                      }
                                    }))
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Notas</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  placeholder="Observaciones del pedido"
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="secondary" onClick={() => { setModalOpen(false); setForm({ kit_id: '', cantidad: '1', notas: '', items: {} }) }}>
                  Cancelar
                </button>
                <button type="submit">Crear solicitud</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para cancelar pedido (Doble check) */}
      <Modal
        isOpen={Boolean(pedidoACancelar)}
        onClose={() => {
          if (!cancelando) setPedidoACancelar(null)
        }}
        title="Confirmar cancelación de pedido"
        maxWidth={480}
      >
        {pedidoACancelar && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  fontSize: '1.5rem',
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                ⚠️
              </div>
              <div>
                <p style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 600, color: '#111827' }}>
                  ¿Está seguro que desea cancelar este pedido?
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', lineHeight: 1.45 }}>
                  Esta acción anulará la solicitud y no podrá ser procesada por el supervisor.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div><strong>Nº de Solicitud:</strong> #{pedidoACancelar.id}</div>
              <div><strong>Tipo:</strong> {(pedidoACancelar.tipo || 'anual') === 'refuerzo' ? 'Solicitud de Refuerzo' : 'Solicitud Anual'}</div>
              <div><strong>Producto / Kit:</strong> {pedidoACancelar.producto_nombre || '-'}</div>
              <div><strong>Cantidad:</strong> {pedidoACancelar.cantidad}</div>
              {pedidoACancelar.notas && (
                <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                  <strong>Notas:</strong> "{pedidoACancelar.notas}"
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary"
                disabled={cancelando}
                onClick={() => setPedidoACancelar(null)}
                style={{ margin: 0 }}
              >
                No, mantener pedido
              </button>
              <button
                type="button"
                className="sv-btn-rechazar"
                disabled={cancelando}
                onClick={confirmarCancelar}
                style={{
                  margin: 0,
                  padding: '9px 18px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: cancelando ? 'not-allowed' : 'pointer',
                  opacity: cancelando ? 0.7 : 1
                }}
              >
                {cancelando ? 'Cancelando...' : 'Sí, cancelar pedido'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {tab !== 'retiro' && (
      <div ref={printRef} style={{ marginTop: 28 }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>
          {tab === 'anual' ? '📋 Historial de Solicitudes Anuales' : '📋 Solicitudes de Refuerzo Registradas'}
        </h4>
        {pedidosFiltrados.length === 0 ? (
          <div className="sv-empty-state" style={{ padding: '32px 20px', fontSize: '1.05rem' }}>
            No hay {tab === 'anual' ? 'solicitudes anuales' : 'solicitudes de refuerzos'} registradas.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: 14, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#334155', textAlign: 'left' }}># Solicitud</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#334155', textAlign: 'left' }}>Kit / Insumo</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#334155', textAlign: 'center' }}>Cantidad</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#334155', textAlign: 'left' }}>Estado Oficial</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#334155', textAlign: 'left' }}>Fecha</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#334155', textAlign: 'center', minWidth: 240 }}>Seguimiento</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#334155', textAlign: 'left' }}>Insumos Incluidos</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#334155', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map(pedido => {
                  const estadoVisible = getEstadoVisiblePedido(pedido)
                  return (
                    <tr key={pedido.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#1e293b', fontSize: '0.98rem' }}>
                        #{pedido.id}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a', fontSize: '0.98rem' }}>
                        {pedido.producto_nombre || '-'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                        {pedido.cantidad}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge-premium badge-${estadoVisible}`}>
                          {formatEstadoPedido(pedido)}
                        </span>
                        {pedido.motivo_supervisor && (
                          <div style={{ marginTop: 6, fontSize: '0.85rem', color: estadoVisible === 'aclaracion' ? '#1d4ed8' : '#991b1b', fontWeight: 600 }}>
                            {estadoVisible === 'aclaracion' ? 'Réplica:' : 'Motivo:'} {pedido.motivo_supervisor}
                          </div>
                        )}
                        {(pedido.tipo || 'anual') === 'refuerzo' && pedido.estado === 'aprobado' && (
                          <div style={{ marginTop: 6, fontSize: '0.82rem', color: pedido.requiere_licitacion ? '#92400e' : '#166534', fontWeight: 600 }}>
                            {pedido.requiere_licitacion ? '● Derivado a Licitación' : '● Cubierto con stock'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.95rem', fontWeight: 600 }}>
                        {new Date(pedido.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td style={{ padding: '10px 16px', minWidth: 240 }}>
                        <ApprovalStepper pedido={pedido} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {Array.isArray(pedido.items) && pedido.items.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 380 }}>
                            {pedido.items.map((it, idx) => (
                              <span key={idx} style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: 8,
                                padding: '3px 9px',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                color: '#1e293b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <span>{it.producto_nombre}</span>
                                <strong style={{ color: '#0f172a', background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>x{it.cantidad}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{pedido.resumen_items || '-'}</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {pedido.estado === 'pendiente' ? (
                          <button
                            type="button"
                            className="sv-btn-rechazar"
                            style={{ margin: 0, padding: '8px 14px', fontSize: '0.88rem', fontWeight: 700 }}
                            onClick={() => handleCancelar(pedido)}
                          >
                            Cancelar
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  )
}

// ============================================================
// Export: muestra la vista correcta según el rol
// ============================================================
export default function Pedidos() {
  const { user } = useAuth()

  if (user?.role === 'supervisor') {
    return <SupervisorSolicitudes />
  }

  if (user?.role === 'directivo') {
    return <DirectivoPedidos />
  }

  if (user?.role === 'operador') {
    return <SolicitudesRetiro />
  }

  return <DepositoPedidos />
}
