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
  const barColor = color || (pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b')

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        width: '100%',
        height: 8,
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
          transition: 'width 0.4s ease'
        }} />
      </div>
      {showText && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
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

  // Historiales de los distintos flujos
  const [historialRetiros, setHistorialRetiros] = useState([])
  const [historialConsumos, setHistorialConsumos] = useState([])
  const [historialDistribuciones, setHistorialDistribuciones] = useState([])
  const [historialFilter, setHistorialFilter] = useState('todos') // 'todos' | 'retiros' | 'distribuciones' | 'consumos'

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
      setMsg({ type: 'error', text: 'Ingresá al menos una cantidad válida mayor a 0 para registrar.' })
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
          text: `✓ Se registró correctamente el consumo para ${data.registrados} producto${data.registrados !== 1 ? 's' : ''}. El stock se ha actualizado.`,
        })
        // Limpiar form
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

  // Flujo consolidado para la pestaña de Historial
  const timelineFlujos = useMemo(() => {
    const list = []

    // 1. Retiros entregados de Kit
    for (const r of historialRetiros) {
      list.push({
        id: `retiro-${r.id}`,
        tipo: 'retiro',
        titulo: `Retiro de Kit #${r.id_pedido || r.id}`,
        subtitulo: r.tipo_pedido === 'refuerzo' ? 'Pedido Extraordinario / Refuerzo' : 'Kit Anual Ordinario',
        fecha: r.fecha_entrega || r.fecha_retiro,
        badgeColor: '#2563eb',
        badgeBg: '#eff6ff',
        badgeText: '🚚 Retiro de Kit',
        icono: '🚚',
        items: (r.items || []).map((i) => ({
          nombre: i.producto_nombre,
          cantidad: i.cantidad_entregada || i.cantidad_solicitada,
          unidad: i.unidad_medida || 'u.',
        })),
        detalles: r.cargo_retira ? `Retirado por cargo: ${r.cargo_retira}` : null,
      })
    }

    // 2. Recepciones por distribución en la escuela
    for (const d of historialDistribuciones) {
      list.push({
        id: `dist-${d.lote_id}`,
        tipo: 'distribucion',
        titulo: `Lote de Distribución #${d.lote_id}`,
        subtitulo: `${d.deposito_nombre || 'Depósito Central'} · Zona ${d.zona_nombre || '-'}`,
        fecha: d.recibido_at || d.created_at,
        badgeColor: '#059669',
        badgeBg: '#ecfdf5',
        badgeText: '📥 Recepción en Escuela',
        icono: '📥',
        items: (d.items || []).map((i) => ({
          nombre: i.producto_nombre,
          cantidad: i.cantidad_recibida,
          unidad: i.unidad_medida || 'u.',
          estado: i.estado_recepcion,
          danado: i.cantidad_danada,
        })),
        detalles: d.lote_estado === 'con_reclamos' ? '⚠️ Recepción con observaciones / reclamos' : '✓ Recepción completada',
      })
    }

    // 3. Consumos internos
    for (const c of historialConsumos) {
      list.push({
        id: `consumo-${c.id}`,
        tipo: 'consumo',
        titulo: `Consumo: ${c.producto_nombre}`,
        subtitulo: c.categoria ? `Categoría: ${c.categoria}` : 'Uso interno institucional',
        fecha: c.fecha,
        badgeColor: '#d97706',
        badgeBg: '#fffbeb',
        badgeText: '🔻 Consumo Interno',
        icono: '🔻',
        items: [
          {
            nombre: c.producto_nombre,
            cantidad: `-${c.cantidad}`,
            unidad: c.unidad_medida || 'u.',
          },
        ],
        detalles: c.motivo ? `"${c.motivo}" (Registrado por: ${c.usuario || 'Directivo'})` : `Registrado por: ${c.usuario || 'Directivo'}`,
      })
    }

    // Ordenar cronológicamente descendente
    list.sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())

    if (historialFilter === 'todos') return list
    return list.filter((item) => item.tipo === historialFilter)
  }, [historialRetiros, historialDistribuciones, historialConsumos, historialFilter])

  // Filtrado de productos en la tabla de stock
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
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{
          width: 42,
          height: 42,
          border: '4px solid #e2e8f0',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <h3 style={{ margin: '0 0 8px', color: 'var(--dark)' }}>Cargando Mi Stock y Depósito...</h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Sincronizando saldo de kit, inventario físico y flujos...</p>
      </div>
    )
  }

  const nivelStr = institucion?.nivel_educativo || user?.nivel_educativo || user?.institucion?.nivel_educativo || ''
  const nivelBadge = nivelStr ? (nivelStr.toLowerCase().startsWith('nivel') ? nivelStr : `Nivel ${nivelStr}`) : ''

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── CABECERA PRINCIPAL ── */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--dark)' }}>
              🏫 Mi Stock y Depósito
            </h2>
            {nivelBadge && (
              <span style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 999,
                border: '1px solid #bfdbfe',
              }}>
                {nivelBadge}
              </span>
            )}
            {kit ? (
              <span style={{
                background: '#f0fdf4',
                color: '#15803d',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 999,
                border: '1px solid #bbf7d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}>
                📦 {kit.nombre} {kit.cantidad_alumnos ? `(${kit.cantidad_alumnos} alumnos)` : ''}
              </span>
            ) : (
              <span style={{
                background: '#fff7ed',
                color: '#c2410c',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 999,
                border: '1px solid #fed7aa',
              }}>
                ⚠️ Sin kit asignado
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>
            {institucion?.nombre || user?.institucion?.nombre || 'Institución Escolar'}
            {institucion?.cue ? ` · CUE: ${institucion.cue}` : ''} — Gestión unificada de stock físico, retiros de kit y consumos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }}>
              🔄
            </span>
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => { setActiveTab('consumo'); setMsg(null) }}
            style={{ padding: '8px 18px', fontSize: '0.88rem' }}
          >
            📝 Registrar Consumo
          </button>
        </div>
      </div>

      {/* ── TARJETAS MÉTRICAS (KPIs) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14,
      }}>
        {/* 1. En Stock Ahora */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(5, 150, 105, 0.02) 100%)',
          border: '1px solid rgba(5, 150, 105, 0.25)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#047857' }}>
              En Stock Ahora
            </span>
            <span style={{ fontSize: '1.25rem' }}>📦</span>
          </div>
          <div style={{ margin: '8px 0 2px', fontSize: '2rem', fontWeight: 900, color: '#065f46', lineHeight: 1 }}>
            {totalStockActual}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#047857' }}>
            {productosConStock} producto{productosConStock !== 1 ? 's' : ''} con existencias
          </span>
        </div>

        {/* 2. Restante por Retirar del Kit */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.02) 100%)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: kit ? 'pointer' : 'default',
        }}
        onClick={() => { if (kit) setActiveTab('kit') }}
        title={kit ? 'Click para ver detalle del kit' : ''}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#1d4ed8' }}>
              Por Retirar del Kit
            </span>
            <span style={{ fontSize: '1.25rem' }}>🚚</span>
          </div>
          <div style={{ margin: '8px 0 2px', fontSize: '2rem', fontWeight: 900, color: totalPendienteRetirar > 0 ? '#1e40af' : '#047857', lineHeight: 1 }}>
            {kit ? totalPendienteRetirar : '—'}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#1d4ed8' }}>
            {kit ? (totalPendienteRetirar > 0 ? `${productosPendientesDeRetiro.length} productos pendientes` : '✓ Kit retirado al 100%') : 'Sin kit asignado'}
          </span>
        </div>

        {/* 3. Consumido */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(217, 119, 6, 0.02) 100%)',
          border: '1px solid rgba(217, 119, 6, 0.25)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#b45309' }}>
              Consumido
            </span>
            <span style={{ fontSize: '1.25rem' }}>🔻</span>
          </div>
          <div style={{ margin: '8px 0 2px', fontSize: '2rem', fontWeight: 900, color: '#92400e', lineHeight: 1 }}>
            {totalConsumido}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#b45309' }}>
            registrados en aulas y áreas
          </span>
        </div>

        {/* 4. Total Recibido Histórico */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.08) 0%, rgba(100, 116, 139, 0.02) 100%)',
          border: '1px solid rgba(100, 116, 139, 0.25)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#475569' }}>
              Total Recibido
            </span>
            <span style={{ fontSize: '1.25rem' }}>📥</span>
          </div>
          <div style={{ margin: '8px 0 2px', fontSize: '2rem', fontWeight: 900, color: '#334155', lineHeight: 1 }}>
            {totalRecibido}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#475569' }}>
            ingresado históricamente
          </span>
        </div>
      </div>

      {/* Alertas y Mensajes */}
      {error && <div className="msg show msg-error" style={{ margin: 0 }}>{error}</div>}
      {msg && <div className={`msg show msg-${msg.type}`} style={{ margin: 0 }}>{msg.text}</div>}

      {/* ── PESTAÑAS DE NAVEGACIÓN ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid var(--border)',
        overflowX: 'auto',
        paddingBottom: 2,
      }}>
        {[
          { key: 'resumen', label: '📊 Vista General' },
          { key: 'kit', label: '📋 Kit y Saldo por Retirar' },
          { key: 'stock', label: '📦 Stock en Depósito' },
          { key: 'consumo', label: '📝 Registrar Consumo' },
          { key: 'historial', label: '📜 Historial de Flujos' },
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
                padding: '12px 18px',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? 'var(--primary)' : 'var(--muted)',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                marginBottom: -4,
                fontSize: '0.95rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. PESTAÑA: VISTA GENERAL (RESUMEN DINÁMICO)              */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Fila superior: Estado del Kit vs Estado del Depósito */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* Tarjeta: Saldo de Kit Restante */}
            <div style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '16px 20px',
                background: '#f8fafc',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                    📦 Saldo Pendiente del Kit Aprobado
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    {kit ? `${kit.nombre} · Productos que aún no fueron retirados` : 'Asignación de Kit Institucional'}
                  </span>
                </div>
                {kit && (
                  <span className={`badge badge-estado-${totalPendienteRetirar > 0 ? 'pendiente' : 'aprobado'}`}>
                    {totalPendienteRetirar > 0 ? `${totalPendienteRetirar} pendientes` : 'Retiro Completo'}
                  </span>
                )}
              </div>

              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {!kit ? (
                  // ESTADO VACÍO AMIGABLE SI NO TIENE KIT ASIGNADO
                  <div style={{
                    textAlign: 'center',
                    padding: '30px 16px',
                    margin: 'auto 0',
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px dashed #cbd5e1',
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#1e293b', fontWeight: 700 }}>
                      No tiene productos aún asignados
                    </h4>
                    <p style={{ margin: '0 auto 16px', maxWidth: 360, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                      Tu institución no cuenta con un kit escolar previamente aprobado o asignado. Cuando tu supervisor escolar realice la asignación, verás aquí el desglose de productos disponibles para retirar.
                    </p>
                    <span style={{
                      display: 'inline-block',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}>
                      ℹ️ Podés consultar con tu supervisor de zona sobre la asignación del kit.
                    </span>
                  </div>
                ) : productosPendientesDeRetiro.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', margin: 'auto 0' }}>
                    <div style={{ fontSize: '2.8rem', marginBottom: 10 }}>🎉</div>
                    <h4 style={{ margin: '0 0 6px', color: '#047857', fontWeight: 700 }}>¡Todo el kit ha sido retirado!</h4>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>
                      No quedan productos pendientes de retiro para tu institución en el depósito central.
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--muted)' }}>
                      Estos insumos ya están aprobados para tu escuela y podés coordinar el retiro en el depósito central:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                      {productosPendientesDeRetiro.slice(0, 5).map((it) => {
                        const asignado = Number(it.cantidad_por_kit || 0) + Number(it.pedido_refuerzo || 0)
                        const retirado = Number(it.total_retirado || 0)
                        return (
                          <div key={it.producto_id} style={{
                            padding: '10px 14px',
                            background: '#f8fafc',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--dark)' }}>{it.producto_nombre}</strong>
                              <span style={{
                                fontWeight: 800,
                                color: '#b91c1c',
                                background: '#fef2f2',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: '0.82rem',
                              }}>
                                Quedan {it.restante} {it.unidad_medida || 'u.'}
                              </span>
                            </div>
                            <ProgressBar value={retirado} total={asignado} color="#3b82f6" />
                          </div>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setActiveTab('kit')}
                      style={{ marginTop: 16, width: '100%', fontSize: '0.88rem' }}
                    >
                      Ver todos los productos del Kit ({itemsKit.length}) →
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tarjeta: Stock Físico en la Escuela */}
            <div style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '16px 20px',
                background: '#f8fafc',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                    🏢 Stock Disponible en la Escuela
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    Mercadería recibida lista para ser utilizada internamente
                  </span>
                </div>
                <span className={`badge badge-estado-${totalStockActual > 0 ? 'aprobado' : 'pendiente'}`}>
                  {totalStockActual > 0 ? `${totalStockActual} u. disponibles` : 'Sin existencias'}
                </span>
              </div>

              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {depositoItems.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '30px 16px',
                    margin: 'auto 0',
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px dashed #cbd5e1',
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>📥</div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#1e293b', fontWeight: 700 }}>
                      No hay mercadería recibida aún
                    </h4>
                    <p style={{ margin: '0 auto 14px', maxWidth: 360, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                      El stock físico de tu escuela se acreditará automáticamente cuando confirmes recepciones en <strong>Recepción de Mercadería</strong> o cuando retires insumos en depósito.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
                        Insumos con mayor disponibilidad actual:
                      </span>
                      <button
                        type="button"
                        className="primary"
                        style={{ width: 'auto', padding: '6px 14px', fontSize: '0.82rem' }}
                        onClick={() => setActiveTab('consumo')}
                      >
                        ➕ Registrar Uso
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                      {depositoItems
                        .filter((i) => i.stock_actual > 0)
                        .slice(0, 5)
                        .map((item) => {
                          const pct = item.total_recibido > 0 ? Math.round((item.total_consumido / item.total_recibido) * 100) : 0
                          return (
                            <div key={item.producto_id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              background: '#f8fafc',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                            }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dark)' }}>
                                  {item.producto_nombre}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                  Recibido: {item.total_recibido} · Consumido: {item.total_consumido} ({pct}%)
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                  background: '#ecfdf5',
                                  color: '#065f46',
                                  fontWeight: 800,
                                  fontSize: '0.95rem',
                                  padding: '4px 10px',
                                  borderRadius: 8,
                                }}>
                                  {item.stock_actual} {item.unidad_medida || 'u.'}
                                </span>
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => handleQuickConsumir(item.producto_id)}
                                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                  title="Consumir este producto"
                                >
                                  Usar
                                </button>
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setActiveTab('stock')}
                      style={{ marginTop: 16, width: '100%', fontSize: '0.88rem' }}
                    >
                      Ver inventario completo del depósito ({depositoItems.length} productos) →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Fila inferior: Últimos movimientos registrados en cualquier flujo */}
          <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                  🕒 Movimientos Recientes
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                  Últimos retiros, recepciones y consumos de tu escuela
                </span>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setActiveTab('historial')}
                style={{ fontSize: '0.85rem', padding: '6px 14px' }}
              >
                Ver Historial Completo ({timelineFlujos.length}) →
              </button>
            </div>

            {timelineFlujos.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px 0' }}>
                Todavía no hay movimientos registrados en ningún flujo.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {timelineFlujos.slice(0, 4).map((f) => (
                  <div key={f.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{
                        background: f.badgeBg,
                        color: f.badgeColor,
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        {f.badgeText}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)' }}>{f.titulo}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{f.subtitulo}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 500 }}>
                        {formatDate(f.fecha, true)}
                      </span>
                    </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!kit ? (
            <div style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '48px 24px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>📦</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.35rem', fontWeight: 800, color: 'var(--dark)' }}>
                No tiene productos aún asignados
              </h3>
              <p style={{ margin: '0 auto 20px', maxWidth: 440, fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Tu institución educativa no cuenta actualmente con un kit escolar previamente aprobado o asignado para este ciclo. 
              </p>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '16px 20px',
                maxWidth: 500,
                margin: '0 auto',
                fontSize: '0.88rem',
                color: '#475569',
              }}>
                ℹ️ La asignación de kits es administrada por la <strong>Supervisión Escolar</strong> y la <strong>Dirección de Área</strong>. Una vez cargado el kit para tu escuela, aquí podrás consultar las cantidades aprobadas y realizar el seguimiento de cada retiro.
              </div>
            </div>
          ) : (
            <>
              {/* Resumen del Kit Asignado */}
              <div style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)' }}>
                    {kit.nombre}
                  </h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
                    Cantidad de alumnos base: <strong>{kit.cantidad_alumnos || 'No especificada'}</strong> · Tipo de escuela: <strong>{kit.tipo_escuela || '-'}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 10,
                    padding: '8px 16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Total Kit Asignado</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8' }}>
                      {itemsKit.reduce((sum, it) => sum + Number(it.cantidad_por_kit || 0), 0)} u.
                    </div>
                  </div>
                  <div style={{
                    background: totalPendienteRetirar > 0 ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${totalPendienteRetirar > 0 ? '#fecaca' : '#bbf7d0'}`,
                    borderRadius: 10,
                    padding: '8px 16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: totalPendienteRetirar > 0 ? '#991b1b' : '#166534', textTransform: 'uppercase' }}>
                      Pendiente Retiro
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: totalPendienteRetirar > 0 ? '#b91c1c' : '#15803d' }}>
                      {totalPendienteRetirar} u.
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid: Pedido Anual y Refuerzos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
                {/* Panel 1: Pedido Anual (Kit Base) */}
                <div style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                }}>
                  <div style={{
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)' }}>
                        📘 Pedido Anual
                      </h4>
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        Kit base asignado a la escuela por normativa
                      </span>
                    </div>
                    <span className={`badge badge-estado-${anualItems.some((i) => i.pendiente > 0) ? 'pendiente' : 'aprobado'}`}>
                      {anualItems.some((i) => i.pendiente > 0) ? 'Pendiente' : 'Completo'}
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th>Producto</th>
                          <th style={{ textAlign: 'center', width: 90 }}>Asignado</th>
                          <th style={{ textAlign: 'center', width: 90 }}>Retirado</th>
                          <th style={{ textAlign: 'center', width: 100 }}>Pendiente</th>
                          <th style={{ width: 130 }}>Progreso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anualItems.map((it) => {
                          const pct = it.asignado > 0 ? Math.round((it.retirado / it.asignado) * 100) : 0
                          return (
                            <tr key={`anual-${it.producto_id}`}>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{it.producto_nombre}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{it.unidad_medida || 'u.'}</div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.asignado}</td>
                              <td style={{ textAlign: 'center', color: it.retirado > 0 ? '#1d4ed8' : 'var(--muted)' }}>
                                {it.retirado}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  fontWeight: 800,
                                  color: it.pendiente > 0 ? '#b91c1c' : '#059669',
                                  background: it.pendiente > 0 ? '#fef2f2' : '#ecfdf5',
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.88rem',
                                  display: 'inline-block',
                                }}>
                                  {it.pendiente}
                                </span>
                              </td>
                              <td>
                                <ProgressBar value={it.retirado} total={it.asignado} showText={false} />
                                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{pct}% retirado</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Panel 2: Refuerzos Aprobados */}
                <div style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                }}>
                  <div style={{
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)' }}>
                        📙 Refuerzos Aprobados
                      </h4>
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        Pedidos extraordinarios autorizados para la institución
                      </span>
                    </div>
                    <span className={`badge badge-estado-${refuerzoItems.some((i) => i.pendiente > 0) ? 'pendiente' : 'aprobado'}`}>
                      {refuerzoItems.length === 0 ? 'Sin refuerzos' : refuerzoItems.some((i) => i.pendiente > 0) ? 'Pendiente' : 'Completo'}
                    </span>
                  </div>

                  {refuerzoItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
                      <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📋</div>
                      <p style={{ margin: 0, fontWeight: 600 }}>No hay refuerzos extraordinarios registrados.</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                        Cuando se apruebe una solicitud de refuerzo aparecerá aquí para coordinar el retiro.
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th>Producto</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Autorizado</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Retirado</th>
                            <th style={{ textAlign: 'center', width: 100 }}>Pendiente</th>
                            <th style={{ width: 130 }}>Progreso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {refuerzoItems.map((it) => {
                            const pct = it.asignado > 0 ? Math.round((it.retirado / it.asignado) * 100) : 0
                            return (
                              <tr key={`refuerzo-${it.producto_id}`}>
                                <td>
                                  <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{it.producto_nombre}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{it.unidad_medida || 'u.'}</div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.asignado}</td>
                                <td style={{ textAlign: 'center', color: it.retirado > 0 ? '#1d4ed8' : 'var(--muted)' }}>
                                  {it.retirado}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{
                                    fontWeight: 800,
                                    color: it.pendiente > 0 ? '#b91c1c' : '#059669',
                                    background: it.pendiente > 0 ? '#fef2f2' : '#ecfdf5',
                                    padding: '3px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.88rem',
                                    display: 'inline-block',
                                  }}>
                                    {it.pendiente}
                                  </span>
                                </td>
                                <td>
                                  <ProgressBar value={it.retirado} total={it.asignado} showText={false} />
                                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{pct}% retirado</span>
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
      {/* 3. PESTAÑA: STOCK EN DEPÓSITO Y PRODUCTOS CONSUMIDOS      */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Barra de Filtros y Búsqueda */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre de producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', maxWidth: 360, padding: '8px 12px', fontSize: '0.9rem' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSearchQuery('')}
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'con_stock', label: 'En Stock' },
                { key: 'sin_stock', label: 'Sin Stock / Agotados' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStockStatusFilter(f.key)}
                  style={{
                    background: stockStatusFilter === f.key ? '#0f172a' : '#f1f5f9',
                    color: stockStatusFilter === f.key ? '#fff' : '#475569',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontSize: '0.82rem',
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
                style={{ padding: '7px 16px', fontSize: '0.85rem', marginLeft: 6 }}
              >
                ➕ Registrar Consumo
              </button>
            </div>
          </div>

          {/* Tabla de Stock */}
          <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          }}>
            {filteredStockItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)' }}>
                <div style={{ fontSize: '2.8rem', marginBottom: 10 }}>📦</div>
                <h4 style={{ margin: '0 0 6px', color: 'var(--dark)' }}>
                  {depositoItems.length === 0 ? 'No hay mercadería recibida en el depósito' : 'No se encontraron productos con ese filtro'}
                </h4>
                <p style={{ margin: '0 auto', maxWidth: 400, fontSize: '0.88rem' }}>
                  {depositoItems.length === 0
                    ? 'Cuando confirmes recepciones o retires productos del kit, figurarán automáticamente en esta lista.'
                    : 'Probá modificando el término de búsqueda o seleccionando "Todos".'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center', width: 110 }}>Total Recibido</th>
                      <th style={{ textAlign: 'center', width: 110 }}>Consumido</th>
                      <th style={{ textAlign: 'center', width: 130 }}>En Stock Ahora</th>
                      <th style={{ width: 160 }}>% Consumo</th>
                      <th style={{ textAlign: 'center', width: 100 }}>Acción</th>
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
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark)' }}>
                              {item.producto_nombre}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                              Unidad de medida: <strong>{item.unidad_medida || 'u.'}</strong>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                            {item.total_recibido}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: item.total_consumido > 0 ? '#d97706' : 'var(--muted)' }}>
                            {item.total_consumido}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '5px 14px',
                              borderRadius: 8,
                              fontWeight: 900,
                              fontSize: '1.05rem',
                              background: sinStock ? '#fef2f2' : stockBajo ? '#fffbeb' : '#f0fdf4',
                              color: sinStock ? '#dc2626' : stockBajo ? '#d97706' : '#059669',
                              border: `1px solid ${sinStock ? '#fca5a5' : stockBajo ? '#fde68a' : '#86efac'}`,
                            }}>
                              {item.stock_actual}
                            </span>
                            {stockBajo && (
                              <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 700, marginTop: 3 }}>
                                ⚠️ Stock bajo
                              </div>
                            )}
                          </td>
                          <td>
                            <ProgressBar value={item.total_consumido} total={item.total_recibido} showText={false} />
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 3 }}>
                              {pct}% utilizado
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="secondary"
                              disabled={sinStock}
                              onClick={() => handleQuickConsumir(item.producto_id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                opacity: sinStock ? 0.4 : 1,
                              }}
                              title={sinStock ? 'Sin existencias para consumir' : 'Registrar uso de este producto'}
                            >
                              Consumir
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
      {/* 4. PESTAÑA: REGISTRAR CONSUMO DE PRODUCTOS                */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'consumo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 12,
            padding: '16px 20px',
            fontSize: '0.9rem',
            color: '#0369a1',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>📝</span>
            <div>
              <strong style={{ display: 'block', marginBottom: 2 }}>Registrar Uso / Consumo Institucional</strong>
              Ingresá las cantidades utilizadas en aulas, oficinas o tareas de limpieza. El sistema validará que no superes las existencias y descontará el stock al guardar.
            </div>
          </div>

          {depositoItems.filter((i) => Number(i.stock_actual) > 0).length === 0 ? (
            <div style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '48px 20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📦</div>
              <h3 style={{ margin: '0 0 6px', color: 'var(--dark)' }}>No hay stock físico disponible</h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
                Para registrar consumos, tu escuela debe tener al menos un producto con existencias en depósito.
              </p>
            </div>
          ) : (
            <>
              {/* Tarjetas de productos a consumir */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                          background: cantNum > 0 ? (excede ? '#fef2f2' : '#f0fdf4') : '#fff',
                          border: `2px solid ${cantNum > 0 ? (excede ? '#ef4444' : '#10b981') : 'var(--border)'}`,
                          borderRadius: 14,
                          padding: '16px 20px',
                          transition: 'all 0.2s ease',
                          boxShadow: cantNum > 0 ? '0 2px 8px rgba(16, 185, 129, 0.08)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--dark)' }}>
                              {item.producto_nombre}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>
                              Unidad: <strong>{item.unidad_medida || 'u.'}</strong> · Existencias disponibles:{' '}
                              <strong style={{ color: '#059669', fontSize: '0.9rem' }}>{item.stock_actual}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--dark)' }}>
                              Cantidad a descontar:
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={item.stock_actual}
                              value={val.cantidad}
                              onChange={(e) => setField('cantidad', e.target.value)}
                              placeholder="0"
                              style={{
                                width: 95,
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: '1.15rem',
                                borderColor: excede ? '#ef4444' : cantNum > 0 ? '#10b981' : '',
                              }}
                            />
                          </div>
                        </div>

                        {excede && (
                          <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 700, marginTop: 8 }}>
                            ⚠️ La cantidad supera el stock disponible ({item.stock_actual} {item.unidad_medida || 'u.'})
                          </div>
                        )}

                        {cantNum > 0 && !excede && (
                          <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap', borderTop: '1px dashed #cbd5e1', paddingTop: 12 }}>
                            <div style={{ flex: 1, minWidth: 190 }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                                Área / Categoría de destino
                              </label>
                              <select
                                value={val.categoria}
                                onChange={(e) => setField('categoria', e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', fontSize: '0.88rem' }}
                              >
                                <option value="">— Seleccionar categoría —</option>
                                {CATEGORIAS_CONSUMO.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ flex: 2, minWidth: 240 }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                                Observación / Motivo (opcional)
                              </label>
                              <input
                                type="text"
                                value={val.motivo}
                                onChange={(e) => setField('motivo', e.target.value)}
                                placeholder="Ej: Entregado a sala de 4 años, limpieza semanal..."
                                style={{ width: '100%', padding: '8px 10px', fontSize: '0.88rem' }}
                                maxLength={200}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>

              {/* Resumen previo a guardar */}
              {Object.values(consumos).some((v) => Number(v.cantidad) > 0) && (
                <div style={{
                  background: '#fff7ed',
                  border: '2px solid #fb923c',
                  borderRadius: 14,
                  padding: '16px 20px',
                }}>
                  <h4 style={{ margin: '0 0 10px', color: '#9a3412', fontWeight: 800 }}>
                    📋 Resumen del consumo a registrar:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(consumos)
                      .filter(([, v]) => Number(v.cantidad) > 0)
                      .map(([pid, v]) => {
                        const item = depositoItems.find((i) => i.producto_id === Number(pid))
                        return (
                          <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #fed7aa', fontSize: '0.9rem' }}>
                            <span>
                              <strong>{item?.producto_nombre}</strong> {v.categoria ? `(${v.categoria})` : ''}
                            </span>
                            <span style={{ fontWeight: 800, color: '#c2410c' }}>
                              -{v.cantidad} {item?.unidad_medida || 'u.'}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: 12 }}>
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
                  style={{ flex: 1, padding: '12px 20px', fontSize: '1rem', fontWeight: 800 }}
                >
                  {savingConsumo ? 'Guardando consumo...' : '✓ Confirmar y Guardar Consumo'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    const reset = {}
                    for (const item of depositoItems) reset[item.producto_id] = { cantidad: '', categoria: '', motivo: '' }
                    setConsumos(reset)
                  }}
                  style={{ padding: '12px 20px', fontSize: '0.9rem' }}
                >
                  Limpiar campos
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. PESTAÑA: HISTORIAL CONSOLIDADO DE CADA FLUJO           */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'historial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Selector de Flujo */}
          <div style={{
            display: 'flex',
            gap: 10,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 14px',
            overflowX: 'auto',
          }}>
            {[
              { key: 'todos', label: 'Todos los Flujos', icon: '🔄', count: timelineFlujos.length },
              { key: 'retiro', label: 'Retiros de Kit', icon: '🚚', count: historialRetiros.length },
              { key: 'distribucion', label: 'Recepciones en Escuela', icon: '📥', count: historialDistribuciones.length },
              { key: 'consumo', label: 'Consumos Internos', icon: '🔻', count: historialConsumos.length },
            ].map((f) => {
              const isSelected = historialFilter === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setHistorialFilter(f.key)}
                  style={{
                    background: isSelected ? 'var(--primary)' : '#f8fafc',
                    color: isSelected ? '#fff' : 'var(--dark)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: '0.88rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: isSelected ? '#fff' : '#475569',
                    fontSize: '0.72rem',
                    padding: '2px 7px',
                    borderRadius: 999,
                    fontWeight: 700,
                  }}>
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Listado de eventos cronológicos */}
          <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          }}>
            {timelineFlujos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)' }}>
                <div style={{ fontSize: '2.8rem', marginBottom: 10 }}>📜</div>
                <h4 style={{ margin: '0 0 6px', color: 'var(--dark)' }}>No hay registros en este flujo</h4>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>
                  Los movimientos correspondientes aparecerán aquí conforme se registren retiros, recepciones o consumos.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {timelineFlujos.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: idx === timelineFlujos.length - 1 ? 'none' : '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 16,
                      background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: item.badgeBg,
                        color: item.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                      }}>
                        {item.icono}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.98rem', color: 'var(--dark)' }}>{item.titulo}</strong>
                          <span style={{
                            background: item.badgeBg,
                            color: item.badgeColor,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}>
                            {item.badgeText}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.83rem', color: 'var(--muted)', marginTop: 3 }}>
                          {item.subtitulo}
                        </div>

                        {/* Listado de ítems involucrados */}
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(item.items || []).map((prod, i) => (
                            <div key={i} style={{ fontSize: '0.84rem', color: '#334155' }}>
                              • <strong>{prod.nombre}</strong>: <span style={{ fontWeight: 700, color: item.tipo === 'consumo' ? '#b91c1c' : '#047857' }}>{prod.cantidad} {prod.unidad}</span>
                              {prod.danado > 0 && <span style={{ color: '#dc2626', marginLeft: 6 }}>(⚠️ {prod.danado} dañados)</span>}
                            </div>
                          ))}
                        </div>

                        {item.detalles && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', marginTop: 6 }}>
                            {item.detalles}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      📅 {formatDate(item.fecha, true)}
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
