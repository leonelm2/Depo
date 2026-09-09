import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { apiFetch } from '../api.js'
import { useAuth } from '../context/AuthContext'
import { MapPin, List } from 'lucide-react'
import ActionIcon from './ui/ActionIcon'
import FilterSortButton from './FilterSortButton'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import L from 'leaflet'
import 'leaflet.markercluster'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default function Instituciones({ supervisorMode = false }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('listado')
  const [instituciones, setInstituciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchNombre, setSearchNombre] = useState('')
  const [searchCUE, setSearchCUE] = useState('')
  const [searchCUI, setSearchCUI] = useState('')
  const [searchText, setSearchText] = useState('')
  const [filterDepartamento, setFilterDepartamento] = useState('')
  const [filterNivel, setFilterNivel] = useState('')
  const [filterPedido, setFilterPedido] = useState('')
  const [sortBy, setSortBy] = useState('nombre_asc')
  const [selectedEdificioKey, setSelectedEdificioKey] = useState(null)
  const [expandedInstitucionId, setExpandedInstitucionId] = useState(null)
  const [pedidosByInstitucion, setPedidosByInstitucion] = useState({})
  const [loadingPedidosId, setLoadingPedidosId] = useState(null)
  const [pedidosError, setPedidosError] = useState('')
  const [kits, setKits] = useState([])
  const [assignKitModal, setAssignKitModal] = useState({ open: false, instId: null, kit_id: '', kit_cantidad: '', instNombre: '' })
  const [savingKit, setSavingKit] = useState(false)

  useEffect(() => {
    const fetchInstituciones = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await apiFetch(supervisorMode ? '/api/supervisor/instituciones' : '/api/instituciones', { token })
        const data = await response.json()
        if (!response.ok) {
          throw new Error((data.error || 'Error HTTP ' + response.status) + (data.details ? ' - ' + data.details : ''))
        }
        let list = data.instituciones || []

        // En modo supervisor, el backend ya devuelve solo escuelas asignadas.
        if (supervisorMode) {
          // Excluir comedores — solo escuelas
          list = list.filter(i =>
            !(i.tipo || i.categoria || '').toLowerCase().includes('comedor')
          )
        }

        if (user?.role === 'director_area' && user?.nivel_educativo) {
          const userNivel = String(user.nivel_educativo).toLowerCase().trim()
          list = list.filter(i => {
            const instNivel = String(i.nivel || '').toLowerCase().trim()
            if (userNivel === 'primario') return instNivel.includes('primari') || instNivel.includes('albergue')
            if (userNivel === 'secundario') return instNivel.includes('secundari') || instNivel.includes('tecnic') || instNivel.includes('agro')
            if (userNivel === 'inicial') return instNivel.includes('inicial')
            if (userNivel === 'especial') return instNivel.includes('especial')
            if (userNivel === 'adultos') return instNivel.includes('adult') || instNivel.includes('cens')
            return instNivel.includes(userNivel)
          })
        }

        setInstituciones(list)
      } catch (err) {
        console.error("Instituciones fetch error:", err)
        setError('Error al cargar instituciones: ' + (err.message || 'Desconocido'))
      } finally {
        setLoading(false)
      }
    }
    fetchInstituciones()

    if (user?.role === 'master') {
      const token = localStorage.getItem('token')
      apiFetch('/api/pedidos/kits', { token })
        .then(r => r.json())
        .then(data => setKits(data.kits || []))
        .catch(err => console.error('Error loading kits:', err))
    }
  }, [supervisorMode, user?.role, user?.nivel_educativo])

  const departamentos = Array.from(new Set(
    instituciones
      .map(inst => String(inst.departamento || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))

  const niveles = Array.from(new Set(
    instituciones
      .map(inst => String(inst.nivel || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))

  // Filtrar instituciones
  const filteredInstituciones = useMemo(() => {
    const search = searchText.trim().toLowerCase()

    return [...instituciones]
      .filter(inst => {
        const matchesSearch = !search || [
          inst.nombre,
          inst.cue,
          inst.cui,
          inst.departamento,
          inst.nivel,
        ].some((value) => String(value || '').toLowerCase().includes(search))

        return matchesSearch &&
          String(inst.nombre || '').toLowerCase().includes(searchNombre.toLowerCase()) &&
          String(inst.cue || '').toLowerCase().includes(searchCUE.toLowerCase()) &&
          (inst.cui || '').toLowerCase().includes(searchCUI.toLowerCase()) &&
          (!filterDepartamento || String(inst.departamento || '').trim() === filterDepartamento) &&
          (!filterNivel || String(inst.nivel || '').trim() === filterNivel) &&
          (!filterPedido || inst.pedido_status === filterPedido)
      })
      .sort((a, b) => {
        if (sortBy === 'departamento_asc') return String(a.departamento || '').localeCompare(String(b.departamento || ''), 'es', { sensitivity: 'base' })
        if (sortBy === 'nivel_asc') return String(a.nivel || '').localeCompare(String(b.nivel || ''), 'es', { sensitivity: 'base' })
        if (sortBy === 'cue_asc') return String(a.cue || '').localeCompare(String(b.cue || ''), 'es', { sensitivity: 'base', numeric: true })
        if (sortBy === 'cui_asc') return String(a.cui || '').localeCompare(String(b.cui || ''), 'es', { sensitivity: 'base', numeric: true })
        return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' })
      })
  }, [instituciones, searchText, searchNombre, searchCUE, searchCUI, filterDepartamento, filterNivel, filterPedido, sortBy])

  const filtrosActivos = [searchText.trim(), searchNombre.trim(), searchCUE.trim(), searchCUI.trim(), filterDepartamento, filterNivel, filterPedido].filter(Boolean).length

  const validInstituciones = filteredInstituciones.filter(inst =>
    Number.isFinite(Number(inst.latitud)) && Number.isFinite(Number(inst.longitud))
  )

  // Agrupar por edificio para que cada pin represente un edificio
  const groupedByEdificio = validInstituciones.reduce((acc, inst) => {
    const edificioId = inst.edificio_id ? String(inst.edificio_id) : ''
    const fallbackCoords = `${inst.latitud},${inst.longitud}`
    const buildingKey = edificioId || fallbackCoords
    if (!buildingKey) return acc
    if (!acc[buildingKey]) acc[buildingKey] = []
    acc[buildingKey].push(inst)
    return acc
  }, {})

  const selectedInstituciones = selectedEdificioKey ? (groupedByEdificio[selectedEdificioKey] || []) : []
  const cuesDelEdificio = Array.from(new Set(selectedInstituciones.map(i => String(i.cue || '').trim()).filter(Boolean))).sort()

  const pinLegendItems = useMemo(() => {
    if (supervisorMode) {
      return [
        { color: '#e74c3c', label: 'Rojo: sin kit' },
        { color: '#f1c40f', label: 'Amarillo: sin solicitud' },
        { color: '#f39c12', label: 'Naranja: solicitud enviada' },
        { color: '#2ecc71', label: 'Verde: solicitud aprobada' },
      ]
    }

    return [
      { color: '#2ecc71', label: 'Verde: retiraron mercaderia' },
      { color: '#f1c40f', label: 'Amarillo: con pedido' },
      { color: '#e74c3c', label: 'Rojo: sin retiro / pendiente' },
    ]
  }, [supervisorMode])

  const handleSelectEdificio = (buildingKey) => {
    setSelectedEdificioKey(buildingKey)
    setExpandedInstitucionId(null)
    setPedidosError('')
  }

  const handleToggleInstitucion = async (inst) => {
    const institucionId = inst.id

    if (expandedInstitucionId === institucionId) {
      setExpandedInstitucionId(null)
      return
    }

    setExpandedInstitucionId(institucionId)
    setPedidosError('')

    if (pedidosByInstitucion[institucionId]) return

    try {
      setLoadingPedidosId(institucionId)
      const token = localStorage.getItem('token')
      const res = await apiFetch(`/api/pedidos/institucion/${institucionId}`, { token })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setPedidosError(data.error || 'No se pudo cargar el historial de egresos')
        return
      }

      setPedidosByInstitucion(prev => ({
        ...prev,
        [institucionId]: data.pedidos || []
      }))
    } catch {
      setPedidosError('No se pudo cargar el historial de egresos')
    } finally {
      setLoadingPedidosId(null)
    }
  }

  const handleSaveAssignKit = async (e) => {
    e.preventDefault()
    setSavingKit(true)
    try {
      const token = localStorage.getItem('token')
      // Se utiliza el endpoint del supervisor para asignar el kit, el master tiene permisos.
      const res = await apiFetch(`/api/supervisor/instituciones/${assignKitModal.instId}/tipo-kit`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ 
          kit_id: assignKitModal.kit_id ? Number(assignKitModal.kit_id) : 0, 
          kit_cantidad: assignKitModal.kit_cantidad ? Number(assignKitModal.kit_cantidad) : 0 
        })
      })
      if (!res.ok) throw new Error('Error al asignar el kit')
      const data = await res.json()

      // Actualizar la lista local
      setInstituciones(prev => prev.map(inst => 
        inst.id === assignKitModal.instId 
          ? { ...inst, kit_id: data.kit_id, kit_cantidad: assignKitModal.kit_cantidad, kit_nombre: data.kit_nombre } 
          : inst
      ))
      setAssignKitModal({ open: false, instId: null, kit_id: '', kit_cantidad: '', instNombre: '' })
    } catch (err) {
      alert('Hubo un error al intentar asignar el kit. Revisa los permisos o intenta más tarde.')
    } finally {
      setSavingKit(false)
    }
  }

  // Crear iconos
  const createIcon = (status, pedido_status) => {
    let color = 'red';
    if (supervisorMode) {
      if (status === 'sin_kit') {
        color = 'red';
      } else if (status === 'sin_solicitud') {
        color = 'yellow';
      } else if (status === 'solicitud_enviada') {
        color = 'orange';
      } else if (status === 'solicitud_aprobada') {
        color = 'green';
      }
    } else {
      if (status === 'retiraron') {
        color = 'green';
      } else if (pedido_status === 'con_pedido') {
        color = 'yellow';
      }
    }
    
    return L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }

  if (loading) return <div>Cargando mapa...</div>
  if (error) return <div>Error: {error}</div>



  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{supervisorMode ? 'Mis Escuelas' : 'Mapa de Instituciones - San Juan'}</h2>
          {user?.role === 'director_area' && user?.nivel_educativo && (
            <span style={{
              fontSize: '0.82rem',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#2563eb',
              fontWeight: 600,
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span>Dirección de Área:</span>
              <strong style={{ textTransform: 'capitalize' }}>{user.nivel_educativo}</strong>
            </span>
          )}
          {(supervisorMode || user?.role === 'supervisor') && (
            <span style={{
              fontSize: '0.82rem',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              fontWeight: 600,
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              Zonas Asignadas
            </span>
          )}
        </div>
        <FilterSortButton
          searchValue={searchText}
          searchPlaceholder="Buscar nombre, CUE, CUI o departamento..."
          onSearchChange={setSearchText}
          filters={[
            {
              key: 'departamento',
              label: 'Departamento',
              value: filterDepartamento,
              onChange: setFilterDepartamento,
              emptyLabel: 'Todos',
              options: departamentos.map((dep) => ({ value: dep, label: dep })),
            },
            {
              key: 'nivel',
              label: 'Nivel',
              value: filterNivel,
              onChange: setFilterNivel,
              emptyLabel: 'Todos',
              options: niveles.map((nivel) => ({ value: nivel, label: nivel })),
            },
          ]}
          sortValue={sortBy}
          sortOptions={[
            { value: 'nombre_asc', label: 'Nombre (A-Z)' },
            { value: 'departamento_asc', label: 'Departamento' },
            { value: 'nivel_asc', label: 'Nivel educativo' },
            { value: 'cue_asc', label: 'CUE' },
            { value: 'cui_asc', label: 'CUI' },
          ]}
          onSortChange={setSortBy}
          onClear={() => {
            setSearchText('')
            setSearchNombre('')
            setSearchCUE('')
            setSearchCUI('')
            setFilterDepartamento('')
            setFilterNivel('')
            setFilterPedido('')
            setSortBy('nombre_asc')
          }}
          activeCount={filtrosActivos}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <span className="badge">Instituciones cargadas: {filteredInstituciones.length}</span>
        <span className="badge">Con coordenadas: {validInstituciones.length}</span>
        <span className="badge">Edificios en mapa: {Object.keys(groupedByEdificio).length}</span>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: '#fff', padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>Referencia de colores del pin</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {pinLegendItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 999, padding: '6px 10px', background: '#fafafa' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--dark)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <button 
          className={activeTab === 'listado' ? '' : 'secondary'}
          style={{ borderRadius: '8px 8px 0 0', margin: 0, padding: '10px 20px', borderBottom: activeTab === 'listado' ? '2px solid var(--blue)' : 'none' }}
          onClick={() => setActiveTab('listado')}
        >
          <List size={16} /> Listado
        </button>
        <button 
          className={activeTab === 'mapa' ? '' : 'secondary'}
          style={{ borderRadius: '8px 8px 0 0', margin: 0, padding: '10px 20px', borderBottom: activeTab === 'mapa' ? '2px solid var(--blue)' : 'none' }}
          onClick={() => setActiveTab('mapa')}
        >
          <MapPin size={16} /> Mapa
        </button>
      </div>

      {activeTab === 'listado' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Nombre</th>
                <th style={{ padding: 10 }}>CUE</th>
                <th style={{ padding: 10 }}>CUI</th>
                <th style={{ padding: 10 }}>Nivel</th>
                <th style={{ padding: 10 }}>Departamento</th>
                {user?.role === 'master' && <th style={{ padding: 10 }}>Kit Asignado</th>}
              </tr>
            </thead>
            <tbody>
              {filteredInstituciones.map(inst => (
                <tr key={inst.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, fontWeight: 500, color: 'var(--dark)' }}>{inst.nombre}</td>
                  <td style={{ padding: 10 }}>{inst.cue || '-'}</td>
                  <td style={{ padding: 10 }}>{inst.cui || '-'}</td>
                  <td style={{ padding: 10 }}>
                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                      {inst.nivel || '-'}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>{inst.departamento || '-'}</td>
                  {user?.role === 'master' && (
                    <td style={{ padding: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {inst.kit_nombre ? (
                          <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 600 }}>{inst.kit_nombre}</span>
                            <br />
                            <span style={{ color: 'var(--muted)' }}>Cant: {inst.kit_cantidad || 0}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Sin kit</span>
                        )}
                        <button 
                          onClick={() => setAssignKitModal({ open: true, instId: inst.id, kit_id: inst.kit_id || '', kit_cantidad: inst.kit_cantidad || '', instNombre: inst.nombre })}
                          style={{ margin: 0, padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--dark)' }}
                          title="Asignar Kit"
                        >
                          <ActionIcon name="editar" size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredInstituciones.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No se encontraron instituciones con los filtros aplicados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'mapa' && (
        <div className="instituciones-map-layout">
        {/* Mapa */}
        <div className="instituciones-map-container" style={{ isolation: 'isolate' }}>
          {validInstituciones.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--muted)' }}>
              No hay instituciones georreferenciadas para mostrar en el mapa con los filtros actuales.
            </div>
          ) : (
            <MapContainer
              center={[-31.5375, -68.5364]}
              zoom={10}
              minZoom={9}
              maxZoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {Object.entries(groupedByEdificio).map(([buildingKey, insts]) => {
                const firstInst = insts[0]
                const lat = Number(firstInst.latitud)
                const lng = Number(firstInst.longitud)
                const cueCount = new Set(insts.map(i => i.cue)).size

                return (
                  <Marker
                    key={buildingKey}
                    position={[lat, lng]}
                    icon={createIcon(firstInst.status, firstInst.pedido_status)}
                    eventHandlers={{ click: () => handleSelectEdificio(buildingKey) }}
                  >
                    <Popup>
                      <div>
                        <strong>Edificio: {firstInst.cui || 'Sin CUI'}</strong>
                        <div>{cueCount} CUE(s) - {insts.length} escuela(s)</div>
                        <div style={{ marginTop: 6, color: '#6b7280', fontSize: '0.85rem' }}>Hace click en el pin para ver las CUE del edificio.</div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          )}
        </div>

        {/* Panel derecho */}
        <aside className="instituciones-map-aside">
          <h3 style={{ marginTop: 4 }}>CUE por Edificio</h3>

          {!selectedEdificioKey && (
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>
              Seleccioná un pin en el mapa para ver las CUE del edificio y los últimos egresos.
            </p>
          )}

          {selectedEdificioKey && (
            <>
              <p style={{ marginTop: 8, marginBottom: 12 }}>
                <strong>Edificio:</strong> {selectedInstituciones[0]?.cui || selectedEdificioKey}
              </p>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 6 }}>CUE en este edificio</div>
                {cuesDelEdificio.length === 0 ? (
                  <div style={{ color: 'var(--muted)' }}>Sin CUE registrados</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cuesDelEdificio.map(cue => (
                      <span key={cue} className="badge">{cue}</span>
                    ))}
                  </div>
                )}
              </div>

              {pedidosError && <div className="msg show msg-error">{pedidosError}</div>}

              <div style={{ display: 'grid', gap: 10 }}>
                {selectedInstituciones.map(inst => {
                  const expanded = expandedInstitucionId === inst.id
                  const pedidos = pedidosByInstitucion[inst.id] || []

                  return (
                    <div key={inst.id} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleInstitucion(inst)}
                        style={{
                          width: '100%',
                          margin: 0,
                          borderRadius: 0,
                          textAlign: 'left',
                          justifyContent: 'space-between',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: '#f9fafb',
                          color: 'var(--dark)',
                          border: 'none',
                          minHeight: 46,
                          padding: '10px 12px'
                        }}
                      >
                        <span>{inst.nombre}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{expanded ? 'Ocultar' : 'Ver egresos'}</span>
                      </button>

                      {expanded && (
                        <div style={{ padding: 10, background: '#fff' }}>
                          {loadingPedidosId === inst.id && <p style={{ margin: 0, color: 'var(--muted)' }}>Cargando egresos...</p>}

                          {loadingPedidosId !== inst.id && pedidos.length === 0 && (
                            <p style={{ margin: 0, color: 'var(--muted)' }}>Sin egresos registrados.</p>
                          )}

                          {loadingPedidosId !== inst.id && pedidos.length > 0 && (
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                              {pedidos.map(p => (
                                <li key={p.id} style={{ marginBottom: 6 }}>
                                  #{p.id} - {p.producto_nombre || '-'} x {p.cantidad} {p.unidad_medida || ''} - Egreso - {new Date(p.created_at).toLocaleDateString('es-AR')}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </aside>
      </div>
      )}

      <p>Mostrando {Object.keys(groupedByEdificio).length} edificio(s) en mapa con {filteredInstituciones.length} instituciones</p>

      {/* Modal para Asignar Kit (Master) */}
      {assignKitModal.open && (
        <div
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(8px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            padding: 16 
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setAssignKitModal({ ...assignKitModal, open: false }) }}
        >
          <div style={{ 
            background: '#ffffff', 
            padding: 32, 
            borderRadius: 16, 
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#1e3a8a' }}>Asignar Kit</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 20 }}>
              Escuela: <strong>{assignKitModal.instNombre}</strong>
            </p>
            <form onSubmit={handleSaveAssignKit}>
              <div style={{ marginBottom: 16 }}>
                <label>Kit Asignado</label>
                <select
                  value={assignKitModal.kit_id}
                  onChange={(e) => setAssignKitModal({ ...assignKitModal, kit_id: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="">Ninguno</option>
                  {kits.map(k => <option key={k.id} value={k.id}>{k.nombre}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label>Cantidad de Kits</label>
                <input
                  type="number"
                  min="0"
                  value={assignKitModal.kit_cantidad}
                  onChange={(e) => setAssignKitModal({ ...assignKitModal, kit_cantidad: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button 
                  type="button" 
                  className="secondary" 
                  onClick={() => setAssignKitModal({ ...assignKitModal, open: false })}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={savingKit}>
                  {savingKit ? 'Guardando...' : 'Guardar asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

