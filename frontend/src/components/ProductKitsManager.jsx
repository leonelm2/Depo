import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { toast } from 'sonner'
import ActionIcon from './ui/ActionIcon'

function emptyForm() {
  return {
    id: null,
    nombre: '',
    descripcion: '',
    items: [{ producto_id: '', cantidad: '' }]
  }
}

export default function ProductKitsManager() {
  const { token } = useAuth()
  const [kits, setKits] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [expandedKits, setExpandedKits] = useState({})

  const toggleKit = (id) => {
    setExpandedKits(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const productosOrdenados = useMemo(() => (
    [...productos].sort((a, b) =>
      String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' })
    )
  ), [productos])

  const loadData = async () => {
    setLoading(true)
    try {
      const [kitsRes, productosRes] = await Promise.all([
        apiFetch('/api/pedidos/kits?include_inactive=1', { token }),
        apiFetch('/api/productos', { token })
      ])

      const kitsData = kitsRes.ok ? await kitsRes.json() : { kits: [] }
      const productosData = await productosRes.json().catch(() => ({}))

      if (!kitsRes.ok) {
        const kitsError = await kitsRes.json().catch(() => ({}))
        throw new Error(kitsError.error || 'No se pudieron cargar los kits.')
      }

      if (!productosRes.ok) {
        throw new Error(productosData.error || 'No se pudieron cargar los productos para armar el kit.')
      }

      setKits(kitsData.kits || [])
      setProductos(productosData.productos || [])
    } catch (err) {
      setProductos([])
      toast.error(err.message || 'No se pudieron cargar los datos del kit.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const openCreate = () => {
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (kit) => {
    setForm({
      id: kit.id,
      nombre: kit.nombre || '',
      descripcion: kit.descripcion || '',
      items: (kit.items || []).length
        ? kit.items.map((item) => ({
            producto_id: String(item.producto_id),
            cantidad: String(item.cantidad)
          }))
        : [{ producto_id: '', cantidad: '' }]
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setForm(emptyForm())
  }

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => idx === index ? { ...item, [field]: value } : item)
    }))
  }

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { producto_id: '', cantidad: '' }]
    }))
  }

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      items: form.items
        .filter((item) => item.producto_id && item.cantidad)
        .map((item) => ({
          producto_id: Number(item.producto_id),
          cantidad: Number(item.cantidad)
        }))
    }

    const endpoint = form.id ? `/api/pedidos/kits/${form.id}` : '/api/pedidos/kits'
    const method = form.id ? 'PUT' : 'POST'

    try {
      const res = await apiFetch(endpoint, {
        token,
        method,
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el kit.')
      }

      toast.success(form.id ? 'Kit actualizado correctamente.' : 'Kit creado correctamente.')
      closeModal()
      loadData()
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el kit.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (kit) => {
    if (!window.confirm(`¿Eliminar el kit "${kit.nombre}"?`)) return

    try {
      const res = await apiFetch(`/api/pedidos/kits/${kit.id}`, {
        token,
        method: 'DELETE'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el kit.')
      }
      toast.success('Kit eliminado correctamente.')
      loadData()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el kit.')
    }
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
        <div>
          <h3 style={{ marginBottom: 6, fontSize: '1.4rem', color: '#1e3a8a', fontWeight: 800 }}>Kits de productos</h3>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.92rem' }}>
            Creá kits por nombre y después asignalos directamente a cada escuela.
          </p>
        </div>
        <button 
          type="button" 
          onClick={openCreate}
          style={{ 
            width: 'auto', 
            margin: 0, 
            padding: '10px 20px', 
            borderRadius: 8, 
            fontSize: '0.95rem', 
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ActionIcon name="agregar" size={16} />
          Crear kit
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: 85, borderRadius: 12, background: '#e2e8f0' }} />
          ))}
        </div>
      ) : kits.length === 0 ? (
        <div className="sv-empty-state" style={{ marginTop: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 24, borderRadius: '50%' }}>
            <ActionIcon name="agregar" size={32} />
          </div>
          <div>
            <h4 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.1rem' }}>No hay kits configurados</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>Creá tu primer kit para asignarlo a las escuelas.</p>
          </div>
          <button type="button" onClick={openCreate} style={{ width: 'auto' }}>
            <ActionIcon name="agregar" size={16} /> Crear mi primer kit
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          {kits.map((kit) => (
            <article 
              key={kit.id} 
              style={{ 
                background: '#fff', 
                border: '1px solid #e2e8f0', 
                borderRadius: 12, 
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'box-shadow 0.2s ease',
                position: 'relative'
              }}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  gap: 12, 
                  flexWrap: 'wrap', 
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => toggleKit(kit.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#1e3a8a', fontWeight: 700 }}>{kit.nombre}</h4>
                    {!kit.activo && (
                      <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4 }}>
                        Inactivo
                      </span>
                    )}
                    <span style={{ 
                      background: '#f1f5f9', 
                      color: '#475569', 
                      fontSize: '0.8rem', 
                      padding: '3px 10px', 
                      borderRadius: 20, 
                      fontWeight: 600 
                    }}>
                      📦 {(kit.items || []).length} productos
                    </span>
                    {kit.cantidad_alumnos && (
                      <span style={{ 
                        background: '#eff6ff', 
                        color: '#1d4ed8', 
                        fontSize: '0.8rem', 
                        padding: '3px 10px', 
                        borderRadius: 20, 
                        fontWeight: 600 
                      }}>
                        👥 Ref: {kit.cantidad_alumnos} alumnos
                      </span>
                    )}
                  </div>
                  {kit.descripcion && (
                    <p style={{ margin: '6px 0 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>{kit.descripcion}</p>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} onClick={(e) => e.stopPropagation()}>
                  <div className="inline-actions" style={{ display: 'flex', gap: 8 }}>
                    <button 
                      type="button" 
                      className="secondary"
                      onClick={() => openEdit(kit)}
                      style={{ 
                        width: 'auto', 
                        margin: 0, 
                        padding: '6px 14px', 
                        fontSize: '0.85rem', 
                        borderRadius: 6, 
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <ActionIcon name="editar" size={15} /> Editar
                    </button>
                    {kit.activo && (
                      <button 
                        type="button" 
                        className="sv-btn-rechazar" 
                        onClick={() => handleDelete(kit)}
                        style={{ 
                          width: 'auto', 
                          margin: 0, 
                          padding: '6px 14px', 
                          fontSize: '0.85rem', 
                          borderRadius: 6, 
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <ActionIcon name="eliminar" size={15} /> Eliminar
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleKit(kit.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      margin: 0,
                      padding: 4,
                      width: 'auto',
                      minHeight: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transform: expandedKits[kit.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', color: '#64748b' }}>▼</span>
                  </button>
                </div>
              </div>

              {expandedKits[kit.id] && (
                <div style={{ 
                  marginTop: 20, 
                  borderTop: '1px solid #f1f5f9', 
                  paddingTop: 16,
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Producto</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Cantidad</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Unidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(kit.items || []).map((item) => (
                        <tr key={`${kit.id}-${item.producto_id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>{item.producto_nombre}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#1e3a8a' }}>{item.cantidad}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.unidad_medida || 'unidad'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="modal-content" style={{ padding: 32, maxWidth: 850, overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#1e3a8a', fontSize: '1.4rem', fontWeight: 800 }}>{form.id ? 'Editar kit' : 'Nuevo kit'}</h3>
            <form onSubmit={handleSubmit} className="grid">
              <div>
                <label>Nombre del kit</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Kit Primaria Turno Manana"
                  required
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Descripcion</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Enfoque del kit o nota interna"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 600, color: '#334155', marginBottom: 10, display: 'block' }}>Productos del kit</label>
                <div style={{ display: 'grid', gap: 12 }}>
                  {form.items.map((item, index) => (
                    <div key={`kit-item-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(120px, 150px) auto', gap: 10, alignItems: 'end' }}>
                      <div>
                        <select
                          value={item.producto_id}
                          onChange={(e) => updateItem(index, 'producto_id', e.target.value)}
                          required
                        >
                          <option value="">Seleccionar producto...</option>
                          {productosOrdenados
                            .filter(p => {
                              const selectedProductIds = form.items.map(i => String(i.producto_id)).filter(Boolean);
                              return !selectedProductIds.includes(String(p.id)) || String(p.id) === String(item.producto_id);
                            })
                            .map((producto) => (
                            <option key={producto.id} value={producto.id}>
                              {producto.nombre}{producto.marca ? ` - ${producto.marca}` : ''} ({producto.unidad_medida || 'unidad'})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.cantidad}
                          onChange={(e) => updateItem(index, 'cantidad', e.target.value)}
                          placeholder="Cantidad"
                          required
                          style={{ margin: 0 }}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeItem(index)} 
                        disabled={form.items.length === 1}
                        style={{ 
                          width: 'auto', 
                          margin: 0, 
                          padding: '10px 14px', 
                          borderRadius: 8, 
                          background: '#fee2e2', 
                          color: '#991b1b', 
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '44px'
                        }}
                      >
                        <ActionIcon name="eliminar" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  className="secondary" 
                  onClick={addItem}
                  style={{ 
                    width: 'auto', 
                    marginTop: 14, 
                    marginBottom: 0, 
                    padding: '8px 16px', 
                    borderRadius: 8, 
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <ActionIcon name="agregar" size={15} /> Agregar producto
                </button>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                <button 
                  type="button" 
                  className="secondary" 
                  onClick={closeModal}
                  style={{ width: 'auto', margin: 0, padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ActionIcon name="cancelar" size={14} />
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  style={{ width: 'auto', margin: 0, padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ActionIcon name="guardar" size={14} />
                  {saving ? 'Guardando...' : 'Guardar kit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
