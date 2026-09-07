import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'

const CATEGORIAS_CONSUMO = [
  'Uso en aula',
  'Limpieza y desinfección',
  'Uso administrativo',
  'Pérdida / rotura',
  'Donación',
  'Devolución',
  'Otro',
]

function formatDate(value, withTime = false) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

function ProgressBar({ value, total, color, showText = true }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  const barColor = color || (pct >= 100 ? '#16a34a' : '#0284c7')

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        width: '100%',
        height: 6,
        background: '#e2e8f0',
        borderRadius: 999,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: barColor,
          borderRadius: 999,
          transition: 'width 0.3s ease'
        }} />
      </div>
      {showText && (
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
          <span>{pct}%</span>
          <span>{value} / {total}</span>
        </div>
      )}
    </div>
  )
}

export default function MiStock() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('resumen') // 'resumen' | 'kit' | 'stock' | 'consumo' | 'historial'
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)

  // Datos del Kit
  const [kit, setKit] = useState(null)
  const [itemsKit, setItemsKit] = useState([])

  // Datos de Depósito Físico
  const [institucion, setInstitucion] = useState(null)
  const [depositoItems, setDepositoItems] = useState([])

  // Historiales
  const [historialRetiros, setHistorialRetiros] = useState([])
  const [historialConsumos, setHistorialConsumos] = useState([])
  const [historialDistribuciones, setHistorialDistribuciones] = useState([])
  const [historialFilter, setHistorialFilter] = useState('todos') // 'todos' | 'retiro' | 'distribucion' | 'consumo'

  // Búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [stockStatusFilter, setStockStatusFilter] = useState('todos') // 'todos' | 'con_stock' | 'sin_stock'

  // Formulario de consumo
  const [consumos, setConsumos] = useState({})
  const [savingConsumo, setSavingConsumo] = useState(false)

  // Carga unificada de datos
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [stockRes, depoRes, retirosRes, consumosRes, distRes] = await Promise.allSettled([
        apiFetch('/api/directivo/mi-stock', { token }),
        apiFetch('/api/directivo/deposito', { token }),
        apiFetch('/api/directivo/historial-retiros', { token }),
        apiFetch('/api/directivo/deposito/historial?limit=100', { token }),
        apiFetch('/api/directivo/distribuciones/historial', { token }),
      ])

      // 1. Kit
      if (stockRes.status === 'fulfilled' && stockRes.value.ok) {
        const data = await stockRes.value.json()
        setKit(data.kit || null)
        setItemsKit(data.items || [])
      } else {
        setKit(null)
        setItemsKit([])
      }

      // 2. Depósito
      if (depoRes.status === 'fulfilled' && depoRes.value.ok) {
        const data = await depoRes.value.json()
        setInstitucion(data.institucion || null)
        const items = data.items || []
        setDepositoItems(items)

        // Inicializar form de consumo
        setConsumos((prev) => {
          const init = {}
          for (const item of items) {
            init[item.producto_id] = prev[item.producto_id] || { cantidad: '', categoria: '', motivo: '' }
          }
          return init
        })
      } else {
        setDepositoItems([])
      }

      // 3. Retiros
      if (retirosRes.status === 'fulfilled' && retirosRes.value.ok) {
        const data = await retirosRes.value.json()
        setHistorialRetiros(data.historial || [])
      } else {
        setHistorialRetiros([])
      }

      // 4. Consumos
      if (consumosRes.status === 'fulfilled' && consumosRes.value.ok) {
        const data = await consumosRes.value.json()
        setHistorialConsumos(data.historial || [])
      } else {
        setHistorialConsumos([])
      }

      // 5. Distribuciones recibidas
      if (distRes.status === 'fulfilled' && distRes.value.ok) {
        const data = await distRes.value.json()
        setHistorialDistribuciones(data.lotes || [])
      } else {
        setHistorialDistribuciones([])
      }
    } catch {
      setError('Error al comunicar con el servidor.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Métricas calculadas
  const totalStockActual = useMemo(() => {
    return depositoItems.reduce((acc, item) => acc + Number(item.stock_actual || 0), 0)
  }, [depositoItems])

  const totalConsumido = useMemo(() => {
    return depositoItems.reduce((acc, item) => acc + Number(item.total_consumido || 0), 0)
  }, [depositoItems])

  const totalRecibido = useMemo(() => {
    return depositoItems.reduce((acc, item) => acc + Number(item.total_recibido || 0), 0)
  }, [depositoItems])

  const productosConStock = useMemo(() => {
    return depositoItems.filter((i) => Number(i.stock_actual || 0) > 0).length
  }, [depositoItems])

  const totalPendienteRetirar = useMemo(() => {
    if (!kit || itemsKit.length === 0) return 0
    return itemsKit.reduce((sum, it) => sum + Number(it.restante || 0), 0)
  }, [kit, itemsKit])

  // Desglose del kit
  const anualItems = useMemo(() => {
    return itemsKit.map((it) => ({
      ...it,
      asignado: Number(it.cantidad_por_kit || 0),
      retirado: Number(it.retirado_anual || 0),
      pendiente: Math.max(0, Number(it.cantidad_por_kit || 0) - Number(it.retirado_anual || 0)),
    }))
  }, [itemsKit])

  const refuerzoItems = useMemo(() => {
    return itemsKit
      .filter((it) => Number(it.pedido_refuerzo || 0) > 0 || Number(it.retirado_refuerzo || 0) > 0)
      .map((it) => ({
        ...it,
        asignado: Number(it.pedido_refuerzo || 0),
        retirado: Number(it.retirado_refuerzo || 0),
        pendiente: Math.max(0, Number(it.pedido_refuerzo || 0) - Number(it.retirado_refuerzo || 0)),
      }))
  }, [itemsKit])

  const productosPendientesDeRetiro = useMemo(() => {
    return itemsKit.filter((it) => Number(it.restante || 0) > 0)
  }, [itemsKit])

  // Acción rápida: consumir un producto puntual
  const handleQuickConsumir = (productoId) => {
    setActiveTab('consumo')
    setConsumos((prev) => ({
      ...prev,
      [productoId]: {
        ...(prev[productoId] || { categoria: '', motivo: '' }),
        cantidad: prev[productoId]?.cantidad || '1',
      }
    }))
  }

  // Guardar consumo
  const handleGuardarConsumo = async () => {
    const itemsPayload = Object.entries(consumos)
      .filter(([, v]) => Number(v.cantidad) > 0)
      .map(([pid, v]) => ({
        id_producto: Number(pid),
        cantidad: Number(v.cantidad),
        categoria: v.categoria || null,
        motivo: v.motivo || null,
      }))

    if (itemsPayload.length === 0) {
      setMsg({ type: 'error', text: 'Ingresá al menos una cantidad mayor a 0 para registrar.' })
      return
    }

    setSavingConsumo(true)
    setMsg(null)

    try {
      const res = await apiFetch('/api/directivo/deposito/consumo', {
        token,
        method: 'POST',
        body: JSON.stringify({ items: itemsPayload }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setMsg({
          type: 'success',
          text: `Consumo registrado para ${data.registrados} producto${data.registrados !== 1 ? 's' : ''}. Stock actualizado.`,
        })
        const reset = {}
        for (const item of depositoItems) {
          reset[item.producto_id] = { cantidad: '', categoria: '', motivo: '' }
        }
        setConsumos(reset)
        await loadData(true)
      } else {
        setMsg({ type: 'error', text: data.error || 'No se pudo registrar el consumo.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Error de conexión al registrar consumo.' })
    } finally {
      setSavingConsumo(false)
    }
  }

  // Flujo consolidado para Historial
  const timelineFlujos = useMemo(() => {
    const list = []

    for (const r of historialRetiros) {
      list.push({
        id: `retiro-${r.id}`,
        tipo: 'retiro',
        titulo: `Retiro de Kit #${r.id_pedido || r.id}`,
        subtitulo: r.tipo_pedido === 'refuerzo' ? 'Pedido extraordinario (refuerzo)' : 'Kit anual ordinario',
        fecha: r.fecha_entrega || r.fecha_retiro,
        tipoLabel: 'Retiro de Kit',
        items: (r.items || []).map((i) => ({
          nombre: i.producto_nombre,
          cantidad: i.cantidad_entregada || i.cantidad_solicitada,
          unidad: i.unidad_medida || 'u.',
        })),
        detalles: r.cargo_retira ? `Retirado por: ${r.cargo_retira}` : null,
      })
    }

    for (const d of historialDistribuciones) {
      list.push({
        id: `dist-${d.lote_id}`,
        tipo: 'distribucion',
        titulo: `Recepción de Lote #${d.lote_id}`,
        subtitulo: `${d.deposito_nombre || 'Depósito'} · Zona ${d.zona_nombre || '-'}`,
        fecha: d.recibido_at || d.created_at,
        tipoLabel: 'Recepción en Escuela',
        items: (d.items || []).map((i) => ({
          nombre: i.producto_nombre,
          cantidad: i.cantidad_recibida,
          unidad: i.unidad_medida || 'u.',
          danado: i.cantidad_danada,
        })),
        detalles: d.lote_estado === 'con_reclamos' ? 'Recepción con observaciones' : 'Recepción confirmada',
      })
    }

    for (const c of historialConsumos) {
      list.push({
        id: `consumo-${c.id}`,
        tipo: 'consumo',
        titulo: `Consumo: ${c.producto_nombre}`,
        subtitulo: c.categoria ? `Área: ${c.categoria}` : 'Uso interno',
        fecha: c.fecha,
        tipoLabel: 'Consumo Interno',
        items: [
          {
            nombre: c.producto_nombre,
            cantidad: `-${c.cantidad}`,
            unidad: c.unidad_medida || 'u.',
          },
        ],
        detalles: c.motivo ? `"${c.motivo}" (${c.usuario || 'Directivo'})` : (c.usuario || 'Directivo'),
      })
    }

    list.sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())

    if (historialFilter === 'todos') return list
    return list.filter((item) => item.tipo === historialFilter)
  }, [historialRetiros, historialDistribuciones, historialConsumos, historialFilter])

  // Filtrado de stock
  const filteredStockItems = useMemo(() => {
    return depositoItems.filter((it) => {
      const matchQuery = !searchQuery || it.producto_nombre?.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchQuery) return false

      if (stockStatusFilter === 'con_stock') return Number(it.stock_actual) > 0
      if (stockStatusFilter === 'sin_stock') return Number(it.stock_actual) <= 0
      return true
    })
  }, [depositoItems, searchQuery, stockStatusFilter])

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #e2e8f0',
          borderTopColor: '#0f172a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>Cargando información de stock y depósito...</p>
      </div>
    )
  }

  const nivelStr = institucion?.nivel_educativo || user?.nivel_educativo || user?.institucion?.nivel_educativo || ''
  const nivelBadge = nivelStr ? (nivelStr.toLowerCase().startsWith('nivel') ? nivelStr : `Nivel ${nivelStr}`) : ''

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ── CABECERA PRINCIPAL (Sobria, limpia, sin emojis) ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '18px 22px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 14,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
              Mi Stock y Depósito
            </h2>
            {nivelBadge && (
              <span style={{
                background: '#f1f5f9',
                color: '#334155',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
              }}>
                {nivelBadge}
              </span>
            )}
            {kit ? (
              <span style={{
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
              }}>
                Kit: {kit.nombre} {kit.cantidad_alumnos ? `(${kit.cantidad_alumnos} alumnos)` : ''}
              </span>
            ) : (
              <span style={{
                background: '#f8fafc',
                color: '#64748b',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
              }}>
                Sin kit asignado
              </span>
            )}
          </div>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            {institucion?.nombre || user?.institucion?.nombre || 'Institución Escolar'}
            {institucion?.cue ? ` · CUE: ${institucion.cue}` : ''} — Control de existencias, kits asignados y consumos internos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => { setActiveTab('consumo'); setMsg(null) }}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Registrar Consumo
          </button>
        </div>
      </div>

      {/* ── TARJETAS MÉTRICAS (Balanceadas, fondo blanco neutro, tipografía sobria) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 12,
      }}>
        {/* 1. Stock disponible en escuela */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '14px 18px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Stock en Escuela
          </div>
          <div style={{ margin: '6px 0 2px', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {totalStockActual}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {productosConStock} producto{productosConStock !== 1 ? 's' : ''} con existencias
          </div>
        </div>

        {/* 2. Por retirar del Kit */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '14px 18px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            cursor: kit ? 'pointer' : 'default',
          }}
          onClick={() => { if (kit) setActiveTab('kit') }}
          title={kit ? 'Click para ver detalle del kit' : ''}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Por Retirar del Kit
          </div>
          <div style={{ margin: '6px 0 2px', fontSize: '1.75rem', fontWeight: 800, color: totalPendienteRetirar > 0 ? '#0369a1' : '#0f172a', lineHeight: 1.1 }}>
            {kit ? totalPendienteRetirar : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {kit ? (totalPendienteRetirar > 0 ? `${productosPendientesDeRetiro.length} productos pendientes` : 'Retiro completado') : 'Sin kit asignado'}
          </div>
        </div>

        {/* 3. Consumido */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '14px 18px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Consumo Acumulado
          </div>
          <div style={{ margin: '6px 0 2px', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {totalConsumido}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Unidades utilizadas
          </div>
        </div>

        {/* 4. Total Recibido */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '14px 18px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Total Recibido
          </div>
          <div style={{ margin: '6px 0 2px', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {totalRecibido}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Histórico ingresado
          </div>
        </div>
      </div>

      {/* Alertas informativas discretas */}
      {error && <div className="msg show msg-error" style={{ margin: 0 }}>{error}</div>}
      {msg && <div className={`msg show msg-${msg.type}`} style={{ margin: 0 }}>{msg.text}</div>}

      {/* ── NAVEGACIÓN POR PESTAÑAS (Sobria, limpia, sin emojis) ── */}
      <div style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid #cbd5e1',
        overflowX: 'auto',
      }}>
        {[
          { key: 'resumen', label: 'Resumen' },
          { key: 'kit', label: 'Kit y Pendientes' },
          { key: 'stock', label: 'Stock en Escuela' },
          { key: 'consumo', label: 'Registrar Consumo' },
          { key: 'historial', label: 'Historial' },
        ].map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setMsg(null) }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 16px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0f172a' : '#64748b',
                borderBottom: isActive ? '2px solid #0f172a' : '2px solid transparent',
                marginBottom: -1,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. PESTAÑA: RESUMEN                                        */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {/* Panel Izquierdo: Saldo del Kit */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '14px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                    Productos por retirar del Kit
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {kit ? `${kit.nombre}` : 'Kit asignado a la escuela'}
                  </span>
                </div>
                {kit && (
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: totalPendienteRetirar > 0 ? '#f1f5f9' : '#f0fdf4',
                    color: totalPendienteRetirar > 0 ? '#334155' : '#166534',
                    border: '1px solid #e2e8f0',
                  }}>
                    {totalPendienteRetirar > 0 ? `${totalPendienteRetirar} pendientes` : 'Completo'}
                  </span>
                )}
              </div>

              <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {!kit ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 16px',
                    margin: 'auto 0',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#1e293b', fontWeight: 700 }}>
                      No tiene productos aún asignados
                    </h4>
                    <p style={{ margin: '0 auto 12px', maxWidth: 360, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                      Tu institución no cuenta con un kit escolar previamente aprobado o asignado. Cuando tu supervisión escolar cargue la asignación, aquí podrás consultar las cantidades aprobadas.
                    </p>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Contactá a tu supervisor escolar si necesitás gestionar la asignación.
                    </span>
                  </div>
                ) : productosPendientesDeRetiro.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', margin: 'auto 0' }}>
                    <h4 style={{ margin: '0 0 4px', color: '#15803d', fontWeight: 700, fontSize: '0.98rem' }}>
                      Todo el kit ha sido retirado
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      No quedan unidades pendientes de retiro en el depósito central.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                      {productosPendientesDeRetiro.slice(0, 5).map((it) => {
                        const asignado = Number(it.cantidad_por_kit || 0) + Number(it.pedido_refuerzo || 0)
                        const retirado = Number(it.total_retirado || 0)
                        return (
                          <div key={it.producto_id} style={{
                            padding: '10px 12px',
                            background: '#f8fafc',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{it.producto_nombre}</span>
                              <span style={{
                                fontWeight: 700,
                                color: '#0f172a',
                                fontSize: '0.82rem',
                              }}>
                                Restan {it.restante} {it.unidad_medida || 'u.'}
                              </span>
                            </div>
                            <ProgressBar value={retirado} total={asignado} showText={false} />
                          </div>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setActiveTab('kit')}
                      style={{ marginTop: 14, width: '100%', fontSize: '0.85rem' }}
                    >
                      Ver detalle del kit ({itemsKit.length} rubros)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Panel Derecho: Stock Físico en Escuela */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '14px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                    Stock disponible en la escuela
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Existencias físicas listas para usar
                  </span>
                </div>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: totalStockActual > 0 ? '#f0fdf4' : '#f8fafc',
                  color: totalStockActual > 0 ? '#166534' : '#64748b',
                  border: '1px solid #e2e8f0',
                }}>
                  {totalStockActual} u. disponibles
                </span>
              </div>

              <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {depositoItems.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 16px',
                    margin: 'auto 0',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#1e293b', fontWeight: 700 }}>
                      No hay mercadería recibida aún
                    </h4>
                    <p style={{ margin: '0 auto', maxWidth: 360, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                      El stock físico aparecerá cuando confirmes entregas en <strong>Recepción de Mercadería</strong> o retires insumos de tu kit.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                      {depositoItems
                        .filter((i) => i.stock_actual > 0)
                        .slice(0, 5)
                        .map((item) => (
                          <div key={item.producto_id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                                {item.producto_nombre}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Recibido: {item.total_recibido} · Consumido: {item.total_consumido}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: '#0f172a',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                padding: '2px 8px',
                                borderRadius: 6,
                              }}>
                                {item.stock_actual} {item.unidad_medida || 'u.'}
                              </span>
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => handleQuickConsumir(item.producto_id)}
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                              >
                                Usar
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>

                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setActiveTab('stock')}
                      style={{ marginTop: 14, width: '100%', fontSize: '0.85rem' }}
                    >
                      Ver inventario completo ({depositoItems.length} rubros)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Fila Inferior: Actividad Reciente */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                  Movimientos recientes
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Últimas operaciones de kit, recepciones y consumos
                </span>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setActiveTab('historial')}
                style={{ fontSize: '0.82rem', padding: '5px 12px' }}
              >
                Ver historial completo
              </button>
            </div>

            {timelineFlujos.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', textAlign: 'center', padding: '16px 0' }}>
                No hay movimientos registrados.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {timelineFlujos.slice(0, 3).map((f) => (
                  <div key={f.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        {f.tipoLabel}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>{f.titulo}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{f.subtitulo}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {formatDate(f.fecha, true)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. PESTAÑA: KIT Y SALDO POR RETIRAR                        */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'kit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!kit ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '40px 20px',
              textAlign: 'center',
            }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                No tiene productos aún asignados
              </h3>
              <p style={{ margin: '0 auto 14px', maxWidth: 420, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                Tu institución educativa no cuenta actualmente con un kit escolar previamente aprobado o asignado.
              </p>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 16px',
                maxWidth: 460,
                margin: '0 auto',
                fontSize: '0.82rem',
                color: '#475569',
              }}>
                La asignación es coordinada por la Supervisión Escolar. Cuando se registre el kit correspondiente, aparecerá aquí detallado.
              </div>
            </div>
          ) : (
            <>
              {/* Encabezado Kit */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {kit.nombre}
                  </h3>
                  <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Alumnos asignados: <strong>{kit.cantidad_alumnos || '-'}</strong> · Modalidad: <strong>{kit.tipo_escuela || '-'}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '6px 14px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Asignado</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {itemsKit.reduce((sum, it) => sum + Number(it.cantidad_por_kit || 0), 0)} u.
                    </div>
                  </div>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '6px 14px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pendiente Retiro</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: totalPendienteRetirar > 0 ? '#0369a1' : '#15803d' }}>
                      {totalPendienteRetirar} u.
                    </div>
                  </div>
                </div>
              </div>

              {/* Tablas: Pedido Anual y Refuerzos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
                {/* Pedido Anual */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                        Pedido Anual (Base)
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: anualItems.some((i) => i.pendiente > 0) ? '#f1f5f9' : '#f0fdf4',
                      color: anualItems.some((i) => i.pendiente > 0) ? '#334155' : '#166534',
                      border: '1px solid #e2e8f0',
                    }}>
                      {anualItems.some((i) => i.pendiente > 0) ? 'Con saldo pendiente' : 'Completo'}
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th>Producto</th>
                          <th style={{ textAlign: 'center', width: 85 }}>Asignado</th>
                          <th style={{ textAlign: 'center', width: 85 }}>Retirado</th>
                          <th style={{ textAlign: 'center', width: 90 }}>Pendiente</th>
                          <th style={{ width: 110 }}>Progreso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anualItems.map((it) => {
                          const pct = it.asignado > 0 ? Math.round((it.retirado / it.asignado) * 100) : 0
                          return (
                            <tr key={`anual-${it.producto_id}`}>
                              <td>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>{it.producto_nombre}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.unidad_medida || 'u.'}</div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.asignado}</td>
                              <td style={{ textAlign: 'center', color: '#64748b' }}>{it.retirado}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: it.pendiente > 0 ? '#0f172a' : '#15803d' }}>
                                {it.pendiente}
                              </td>
                              <td>
                                <ProgressBar value={it.retirado} total={it.asignado} showText={false} />
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{pct}%</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Refuerzos Aprobados */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                        Refuerzos Extraordinarios
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                    }}>
                      {refuerzoItems.length === 0 ? 'Sin registros' : refuerzoItems.some((i) => i.pendiente > 0) ? 'Pendiente' : 'Completo'}
                    </span>
                  </div>

                  {refuerzoItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                      <p style={{ margin: 0, fontSize: '0.88rem' }}>No hay refuerzos extraordinarios aprobados para esta escuela.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th>Producto</th>
                            <th style={{ textAlign: 'center', width: 85 }}>Autorizado</th>
                            <th style={{ textAlign: 'center', width: 85 }}>Retirado</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Pendiente</th>
                            <th style={{ width: 110 }}>Progreso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {refuerzoItems.map((it) => {
                            const pct = it.asignado > 0 ? Math.round((it.retirado / it.asignado) * 100) : 0
                            return (
                              <tr key={`refuerzo-${it.producto_id}`}>
                                <td>
                                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>{it.producto_nombre}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.unidad_medida || 'u.'}</div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.asignado}</td>
                                <td style={{ textAlign: 'center', color: '#64748b' }}>{it.retirado}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: it.pendiente > 0 ? '#0f172a' : '#15803d' }}>
                                  {it.pendiente}
                                </td>
                                <td>
                                  <ProgressBar value={it.retirado} total={it.asignado} showText={false} />
                                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{pct}%</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. PESTAÑA: STOCK EN ESCUELA                               */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Filtros */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', maxWidth: 320, padding: '7px 10px', fontSize: '0.88rem' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSearchQuery('')}
                  style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                >
                  Limpiar
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'con_stock', label: 'En stock' },
                { key: 'sin_stock', label: 'Sin stock' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStockStatusFilter(f.key)}
                  style={{
                    background: stockStatusFilter === f.key ? '#0f172a' : '#f1f5f9',
                    color: stockStatusFilter === f.key ? '#ffffff' : '#475569',
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                className="primary"
                onClick={() => setActiveTab('consumo')}
                style={{ padding: '6px 14px', fontSize: '0.82rem', marginLeft: 4 }}
              >
                Registrar consumo
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {filteredStockItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {depositoItems.length === 0
                    ? 'No hay mercadería recibida en la escuela aún.'
                    : 'No se encontraron productos con el filtro aplicado.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center', width: 100 }}>Recibido</th>
                      <th style={{ textAlign: 'center', width: 100 }}>Consumido</th>
                      <th style={{ textAlign: 'center', width: 120 }}>En Stock</th>
                      <th style={{ width: 140 }}>Uso</th>
                      <th style={{ textAlign: 'center', width: 90 }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockItems.map((item) => {
                      const pct = item.total_recibido > 0 ? Math.round((item.total_consumido / item.total_recibido) * 100) : 0
                      const sinStock = Number(item.stock_actual) <= 0
                      const stockBajo = !sinStock && Number(item.stock_actual) < Number(item.total_recibido) * 0.25

                      return (
                        <tr key={item.producto_id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                              {item.producto_nombre}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {item.unidad_medida || 'u.'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', color: '#475569' }}>
                            {item.total_recibido}
                          </td>
                          <td style={{ textAlign: 'center', color: '#475569' }}>
                            {item.total_consumido}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.98rem',
                              color: sinStock ? '#991b1b' : '#0f172a',
                            }}>
                              {item.stock_actual}
                            </span>
                            {stockBajo && (
                              <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>
                                Stock bajo
                              </div>
                            )}
                          </td>
                          <td>
                            <ProgressBar value={item.total_consumido} total={item.total_recibido} showText={false} />
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                              {pct}%
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="secondary"
                              disabled={sinStock}
                              onClick={() => handleQuickConsumir(item.producto_id)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.78rem',
                                opacity: sinStock ? 0.4 : 1,
                              }}
                            >
                              Usar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. PESTAÑA: REGISTRAR CONSUMO                              */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'consumo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: '0.85rem',
            color: '#475569',
          }}>
            Ingresá las cantidades utilizadas en aulas o tareas de la escuela. Las cantidades se descontarán del stock físico actual.
          </div>

          {depositoItems.filter((i) => Number(i.stock_actual) > 0).length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '40px 20px',
              textAlign: 'center',
            }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#0f172a' }}>No hay stock físico disponible</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                Tu escuela no tiene productos con existencias para registrar consumos en este momento.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {depositoItems
                  .filter((i) => Number(i.stock_actual) > 0)
                  .map((item) => {
                    const val = consumos[item.producto_id] || { cantidad: '', categoria: '', motivo: '' }
                    const setField = (f, v) => {
                      setConsumos((prev) => ({
                        ...prev,
                        [item.producto_id]: { ...(prev[item.producto_id] || {}), [f]: v },
                      }))
                    }
                    const cantNum = Number(val.cantidad || 0)
                    const excede = cantNum > Number(item.stock_actual)

                    return (
                      <div
                        key={item.producto_id}
                        style={{
                          background: '#ffffff',
                          border: `1px solid ${cantNum > 0 ? (excede ? '#ef4444' : '#0f172a') : '#e2e8f0'}`,
                          borderRadius: 8,
                          padding: '14px 18px',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                              {item.producto_nombre}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              Disponible: <strong>{item.stock_actual} {item.unidad_medida || 'u.'}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                              Cantidad a usar:
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={item.stock_actual}
                              value={val.cantidad}
                              onChange={(e) => setField('cantidad', e.target.value)}
                              placeholder="0"
                              style={{
                                width: 80,
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '1rem',
                                borderColor: excede ? '#ef4444' : '#cbd5e1',
                              }}
                            />
                          </div>
                        </div>

                        {excede && (
                          <div style={{ color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, marginTop: 6 }}>
                            La cantidad supera el stock disponible ({item.stock_actual})
                          </div>
                        )}

                        {cantNum > 0 && !excede && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                            <div style={{ flex: 1, minWidth: 180 }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }}>
                                Destino / Área
                              </label>
                              <select
                                value={val.categoria}
                                onChange={(e) => setField('categoria', e.target.value)}
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.85rem' }}
                              >
                                <option value="">— Seleccionar —</option>
                                {CATEGORIAS_CONSUMO.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ flex: 2, minWidth: 220 }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }}>
                                Motivo / Detalle (opcional)
                              </label>
                              <input
                                type="text"
                                value={val.motivo}
                                onChange={(e) => setField('motivo', e.target.value)}
                                placeholder="Ej: Sala de 5 años, limpieza semanal..."
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.85rem' }}
                                maxLength={200}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>

              {/* Resumen */}
              {Object.values(consumos).some((v) => Number(v.cantidad) > 0) && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '12px 16px',
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    Resumen del consumo:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {Object.entries(consumos)
                      .filter(([, v]) => Number(v.cantidad) > 0)
                      .map(([pid, v]) => {
                        const item = depositoItems.find((i) => i.producto_id === Number(pid))
                        return (
                          <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span>{item?.producto_nombre} {v.categoria ? `(${v.categoria})` : ''}</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              -{v.cantidad} {item?.unidad_medida || 'u.'}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="primary"
                  onClick={handleGuardarConsumo}
                  disabled={
                    savingConsumo ||
                    Object.values(consumos).every((v) => Number(v.cantidad) <= 0) ||
                    Object.entries(consumos).some(([pid, v]) => {
                      const item = depositoItems.find((i) => i.producto_id === Number(pid))
                      return Number(v.cantidad) > Number(item?.stock_actual || 0)
                    })
                  }
                  style={{ flex: 1, padding: '10px 16px', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  {savingConsumo ? 'Guardando...' : 'Confirmar Consumo'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    const reset = {}
                    for (const item of depositoItems) reset[item.producto_id] = { cantidad: '', categoria: '', motivo: '' }
                    setConsumos(reset)
                  }}
                  style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                >
                  Limpiar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. PESTAÑA: HISTORIAL DE FLUJOS                            */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'historial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Filtros */}
          <div style={{
            display: 'flex',
            gap: 6,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '8px 10px',
            overflowX: 'auto',
          }}>
            {[
              { key: 'todos', label: 'Todos', count: timelineFlujos.length },
              { key: 'retiro', label: 'Retiros de Kit', count: historialRetiros.length },
              { key: 'distribucion', label: 'Recepciones', count: historialDistribuciones.length },
              { key: 'consumo', label: 'Consumos', count: historialConsumos.length },
            ].map((f) => {
              const isSelected = historialFilter === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setHistorialFilter(f.key)}
                  style={{
                    background: isSelected ? '#0f172a' : 'transparent',
                    color: isSelected ? '#ffffff' : '#475569',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{f.label}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : '#64748b',
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: 999,
                    fontWeight: 600,
                  }}>
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Listado */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {timelineFlujos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>No hay registros en este flujo.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {timelineFlujos.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px 18px',
                      borderBottom: idx === timelineFlujos.length - 1 ? 'none' : '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{item.titulo}</strong>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid #e2e8f0',
                        }}>
                          {item.tipoLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                        {item.subtitulo}
                      </div>

                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {(item.items || []).map((prod, i) => (
                          <div key={i} style={{ fontSize: '0.82rem', color: '#334155' }}>
                            • {prod.nombre}: <strong>{prod.cantidad} {prod.unidad}</strong>
                          </div>
                        ))}
                      </div>

                      {item.detalles && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                          {item.detalles}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(item.fecha, true)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
