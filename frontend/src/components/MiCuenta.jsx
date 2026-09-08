import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'

const ROLE_LABELS = {
  admin: 'Administrador',
  supervisor: 'Supervisor Escolar',
  director_area: 'Director de Área',
  directivo: 'Directivo Escolar',
  operador_escolar: 'Operador Escolar',
  operador: 'Operador de Depósito',
  area_compras: 'Área de Compras',
  consulta: 'Consulta',
  control_ministerio: 'Control Ministerio',
  master: 'Administrador Master',
  secretario_administrativo: 'Secretario Administrativo',
  ministro_financiero: 'Ministro Financiero',
}

function EyeIcon({ visible }) {
  if (visible) {
    // Eye off (ocultar)
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    )
  }
  // Eye (ver)
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function MiCuenta() {
  const { user, token, login, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('datos') // 'datos' | 'seguridad'

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' })
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' })

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [profile, setProfile] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    nivel_educativo: '',
    institucion_nombre: '',
    institucion_cue: '',
  })

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)

      try {
        const res = await apiFetch('/api/users/me', { token })
        if (res.status === 401) {
          logout()
          return
        }

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo cargar la información de tu perfil')
        }

        const nextUser = data.user || {}
        if (!mounted) return

        setProfile({
          nombre: nextUser.nombre || '',
          apellido: nextUser.apellido || '',
          email: nextUser.email || '',
          telefono: nextUser.telefono || '',
          nivel_educativo: nextUser.nivel_educativo || nextUser.institucion?.nivel_educativo || '',
          institucion_nombre: nextUser.institucion?.nombre || '',
          institucion_cue: nextUser.institucion?.cue || '',
        })
      } catch (err) {
        if (!mounted) return
        setProfileMsg({ text: err.message || 'Error al cargar tu información', type: 'error' })
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (token) load()

    return () => {
      mounted = false
    }
  }, [logout, token])

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setProfileMsg({ text: '', type: '' })
    setSavingProfile(true)

    try {
      const res = await apiFetch('/api/users/me', {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          nombre: profile.nombre,
          apellido: profile.apellido,
          email: profile.email,
          telefono: profile.telefono,
        }),
      })

      if (res.status === 401) {
        logout()
        return
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setProfileMsg({ text: data.error || 'No se pudieron guardar los cambios', type: 'error' })
        return
      }

      if (data.user) {
        login(token, { ...user, ...data.user })
      }

      setProfileMsg({ text: '¡Excelente! Tus datos personales se actualizaron correctamente.', type: 'success' })
    } catch {
      setProfileMsg({ text: 'Hubo un error de conexión al guardar. Intenta nuevamente.', type: 'error' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setPasswordMsg({ text: '', type: '' })

    if (!passwords.currentPassword.trim()) {
      setPasswordMsg({ text: 'Por favor, ingresa tu contraseña actual.', type: 'error' })
      return
    }

    if (!passwords.newPassword.trim()) {
      setPasswordMsg({ text: 'Por favor, ingresa la nueva contraseña.', type: 'error' })
      return
    }

    if (passwords.newPassword.length < 6) {
      setPasswordMsg({ text: 'La nueva contraseña debe tener al menos 6 letras o números.', type: 'error' })
      return
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMsg({ text: 'La confirmación de la contraseña no coincide. Revisa que ambas estén escritas igual.', type: 'error' })
      return
    }

    setSavingPassword(true)

    try {
      const res = await apiFetch('/api/users/me/password', {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      })

      if (res.status === 401) {
        logout()
        return
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPasswordMsg({ text: data.error || 'No se pudo cambiar la contraseña. Verifica que la contraseña actual sea correcta.', type: 'error' })
        return
      }

      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMsg({ text: '¡Listo! Tu contraseña se actualizó con éxito.', type: 'success' })
    } catch {
      setPasswordMsg({ text: 'Hubo un error de conexión al cambiar la contraseña.', type: 'error' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="cuenta-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="spinner" style={{ width: 42, height: 42, border: '4px solid #e2e8f0', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: '1.1rem', color: '#475569', fontWeight: 500 }}>Cargando los datos de tu cuenta...</p>
      </div>
    )
  }

  const nivelRaw = profile.nivel_educativo || user?.nivel_educativo || user?.institucion?.nivel_educativo
  const nivelVal = nivelRaw ? (nivelRaw.toLowerCase().startsWith('nivel') ? nivelRaw : `Nivel ${nivelRaw}`) : null
  const instNombre = profile.institucion_nombre || user?.institucion?.nombre
  const instCue = profile.institucion_cue || user?.institucion?.cue

  // Iniciales para el avatar
  const inicialNombre = (profile.nombre || user?.nombre || '').trim().charAt(0).toUpperCase()
  const inicialApellido = (profile.apellido || user?.apellido || '').trim().charAt(0).toUpperCase()
  const iniciales = (inicialNombre + inicialApellido) || 'U'

  // Nombre de visualización
  const nombreCompleto = [profile.nombre || user?.nombre, profile.apellido || user?.apellido].filter(Boolean).join(' ') || 'Mi Usuario'
  const rolEtiqueta = ROLE_LABELS[user?.role] || user?.role || 'Usuario'

  return (
    <div className="cuenta-container">
      {/* ── Cabecera e Identidad ── */}
      <section className="cuenta-header-card" aria-label="Identidad del usuario">
        <div className="cuenta-user-profile">
          <div className="cuenta-avatar" aria-hidden="true">
            {iniciales}
          </div>
          <div className="cuenta-user-info">
            <div className="cuenta-user-name-row">
              <h2 className="cuenta-user-name">{nombreCompleto}</h2>
              <span className="cuenta-role-badge">
                <span style={{ fontSize: '0.9rem' }}>👤</span>
                {rolEtiqueta}
              </span>
            </div>
            <p className="cuenta-user-desc">
              {instNombre ? `${instNombre}${instCue ? ` (CUE: ${instCue})` : ''}` : 'Ministerio de Educación — San Juan'}
              {nivelVal ? ` • ${nivelVal}` : ''}
            </p>
          </div>
        </div>
      </section>

      {/* ── Pestañas de Navegación ── */}
      <div className="cuenta-tabs" role="tablist" aria-label="Secciones de mi cuenta">
        <button
          type="button"
          role="tab"
          id="tab-datos"
          aria-selected={activeTab === 'datos'}
          aria-controls="panel-datos"
          className={`cuenta-tab-btn ${activeTab === 'datos' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('datos')}
        >
          <span className="cuenta-tab-icon" aria-hidden="true">📋</span>
          <span>Mis Datos Personales</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-seguridad"
          aria-selected={activeTab === 'seguridad'}
          aria-controls="panel-seguridad"
          className={`cuenta-tab-btn ${activeTab === 'seguridad' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('seguridad')}
        >
          <span className="cuenta-tab-icon" aria-hidden="true">🔒</span>
          <span>Seguridad y Contraseña</span>
        </button>
      </div>

      {/* ── PANEL 1: Mis Datos Personales ── */}
      {activeTab === 'datos' && (
        <section
          id="panel-datos"
          role="tabpanel"
          aria-labelledby="tab-datos"
          className="cuenta-card"
        >
          <div className="cuenta-card-header">
            <h3 className="cuenta-card-title">Datos Personales y de Contacto</h3>
            <p className="cuenta-card-desc">
              Aquí puedes revisar y actualizar tu nombre, correo electrónico y teléfono de contacto.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="cuenta-form">
            <div className="cuenta-grid-2">
              <div className="cuenta-field">
                <label htmlFor="input-nombre" className="cuenta-label">
                  Nombre
                </label>
                <input
                  id="input-nombre"
                  type="text"
                  className="cuenta-input"
                  value={profile.nombre}
                  onChange={(e) => setProfile((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: María"
                  required
                />
              </div>

              <div className="cuenta-field">
                <label htmlFor="input-apellido" className="cuenta-label">
                  Apellido
                </label>
                <input
                  id="input-apellido"
                  type="text"
                  className="cuenta-input"
                  value={profile.apellido}
                  onChange={(e) => setProfile((prev) => ({ ...prev, apellido: e.target.value }))}
                  placeholder="Ej: González"
                  required
                />
              </div>
            </div>

            <div className="cuenta-grid-2">
              <div className="cuenta-field">
                <label htmlFor="input-email" className="cuenta-label">
                  Correo electrónico
                </label>
                <input
                  id="input-email"
                  type="email"
                  className="cuenta-input"
                  value={profile.email}
                  onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="ejemplo@educacion.sanjuan.gob.ar"
                  required
                />
                <span className="cuenta-field-hint">Utilizado para ingresar al sistema y recibir notificaciones.</span>
              </div>

              <div className="cuenta-field">
                <label htmlFor="input-telefono" className="cuenta-label">
                  Teléfono de contacto
                </label>
                <input
                  id="input-telefono"
                  type="tel"
                  className="cuenta-input"
                  value={profile.telefono}
                  onChange={(e) => setProfile((prev) => ({ ...prev, telefono: e.target.value }))}
                  placeholder="Ej: 264 4123456"
                />
                <span className="cuenta-field-hint">Número para comunicaciones de urgencia o entregas.</span>
              </div>
            </div>

            {/* Ficha institucional informativa (no editable) */}
            {(instNombre || nivelVal) && (
              <div className="cuenta-institucion-card" role="region" aria-label="Información institucional asignada">
                <div className="cuenta-institucion-header">
                  <span style={{ fontSize: '1.25rem' }}>🏫</span>
                  <span>Establecimiento Educativo Asignado</span>
                </div>

                <div className="cuenta-institucion-grid">
                  {instNombre && (
                    <div className="cuenta-inst-item">
                      <span className="cuenta-inst-label">Institución escolar</span>
                      <span className="cuenta-inst-value">{instNombre}</span>
                    </div>
                  )}

                  {instCue && (
                    <div className="cuenta-inst-item">
                      <span className="cuenta-inst-label">Número de CUE</span>
                      <span className="cuenta-inst-value">{instCue}</span>
                    </div>
                  )}

                  {nivelVal && (
                    <div className="cuenta-inst-item">
                      <span className="cuenta-inst-label">Nivel educativo</span>
                      <span className="cuenta-inst-value">{nivelVal}</span>
                    </div>
                  )}
                </div>

                <div className="cuenta-institucion-footer">
                  <span aria-hidden="true">ℹ️</span>
                  <span>
                    Estos datos corresponden a la asignación oficial del Ministerio de Educación. Si necesitas modificarlos, consulta con tu Supervisor o Director de Área.
                  </span>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={savingProfile}
                className="cuenta-btn-submit"
              >
                <span>💾</span>
                <span>{savingProfile ? 'Guardando cambios...' : 'Guardar mis cambios'}</span>
              </button>
            </div>
          </form>

          {profileMsg.text && (
            <div
              role="alert"
              className={`cuenta-alert ${profileMsg.type === 'success' ? 'cuenta-alert-success' : 'cuenta-alert-error'}`}
            >
              <span className="cuenta-alert-icon" aria-hidden="true">
                {profileMsg.type === 'success' ? '✅' : '⚠️'}
              </span>
              <span>{profileMsg.text}</span>
            </div>
          )}
        </section>
      )}

      {/* ── PANEL 2: Seguridad y Contraseña ── */}
      {activeTab === 'seguridad' && (
        <section
          id="panel-seguridad"
          role="tabpanel"
          aria-labelledby="tab-seguridad"
          className="cuenta-card"
        >
          <div className="cuenta-card-header">
            <h3 className="cuenta-card-title">Cambiar mi Contraseña</h3>
            <p className="cuenta-card-desc">
              Por tu tranquilidad y seguridad, puedes cambiar tu contraseña de acceso en cualquier momento.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="cuenta-form" autoComplete="off">
            <div className="cuenta-security-tip">
              <span className="cuenta-security-tip-icon" aria-hidden="true">💡</span>
              <div>
                <strong>Consejo útil:</strong> Puedes presionar el botón del ojo{' '}
                <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}><EyeIcon visible={false} /></span>{' '}
                al final de cada campo para verificar que escribiste las letras y números sin errores.
              </div>
            </div>

            <div className="cuenta-field" style={{ maxWidth: '460px' }}>
              <label htmlFor="input-current-pass" className="cuenta-label">
                Contraseña actual
              </label>
              <div className="cuenta-password-wrapper">
                <input
                  id="input-current-pass"
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="cuenta-input"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Escribe tu contraseña actual"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="cuenta-password-toggle"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  title={showCurrentPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={showCurrentPassword ? 'Ocultar contraseña actual' : 'Ver contraseña actual'}
                >
                  <EyeIcon visible={showCurrentPassword} />
                </button>
              </div>
            </div>

            <div className="cuenta-grid-2">
              <div className="cuenta-field">
                <label htmlFor="input-new-pass" className="cuenta-label">
                  Nueva contraseña
                </label>
                <div className="cuenta-password-wrapper">
                  <input
                    id="input-new-pass"
                    type={showNewPassword ? 'text' : 'password'}
                    className="cuenta-input"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Mínimo 6 letras o números"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="cuenta-password-toggle"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Ver nueva contraseña'}
                  >
                    <EyeIcon visible={showNewPassword} />
                  </button>
                </div>
                <span className="cuenta-field-hint">Debe contener al menos 6 caracteres.</span>
              </div>

              <div className="cuenta-field">
                <label htmlFor="input-confirm-pass" className="cuenta-label">
                  Confirmar nueva contraseña
                </label>
                <div className="cuenta-password-wrapper">
                  <input
                    id="input-confirm-pass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="cuenta-input"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Vuelve a escribir la nueva contraseña"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="cuenta-password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Ver confirmación de contraseña'}
                  >
                    <EyeIcon visible={showConfirmPassword} />
                  </button>
                </div>
                <span className="cuenta-field-hint">Ambas contraseñas deben ser exactamente iguales.</span>
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <button
                type="submit"
                disabled={savingPassword}
                className="cuenta-btn-submit"
              >
                <span>🔑</span>
                <span>{savingPassword ? 'Actualizando contraseña...' : 'Actualizar mi contraseña'}</span>
              </button>
            </div>
          </form>

          {passwordMsg.text && (
            <div
              role="alert"
              className={`cuenta-alert ${passwordMsg.type === 'success' ? 'cuenta-alert-success' : 'cuenta-alert-error'}`}
            >
              <span className="cuenta-alert-icon" aria-hidden="true">
                {passwordMsg.type === 'success' ? '✅' : '⚠️'}
              </span>
              <span>{passwordMsg.text}</span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
