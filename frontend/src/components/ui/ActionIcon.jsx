import React from 'react'

const ICON_MAP = {
  agregar: '/iconos/boton-agregar.png',
  nuevo: '/iconos/boton-agregar.png',
  aprobar: '/iconos/boton-aprobar.png',
  buscar: '/iconos/boton-buscar.png',
  filtrar: '/iconos/boton-buscar.png',
  cancelar: '/iconos/boton-cancelar.png',
  cerrar: '/iconos/boton-cancelar.png',
  editar: '/iconos/boton-editar.png',
  eliminar: '/iconos/boton-eliminar.png',
  borrar: '/iconos/boton-eliminar.png',
  excel: '/iconos/boton-excel.png',
  descargar: '/iconos/boton-excel.png',
  foto: '/iconos/boton-foto.png',
  guardar: '/iconos/boton-guardar.png',
  historial: '/iconos/boton-historial.png',
  imprimir: '/iconos/boton-imprimir.png',
  recargar: '/iconos/boton-recargar.png',
  actualizar: '/iconos/boton-recargar.png',
  rechazar: '/iconos/boton-rechazar.png',
  usuario: '/iconos/boton-usuario.png',
  verdetalle: '/iconos/boton-verdetalle.png',
  detalle: '/iconos/boton-verdetalle.png',
  ver: '/iconos/boton-verdetalle.png',
}

/**
 * Componente uniforme para renderizar iconos PNG en botones y acciones del sistema.
 * 
 * @param {string} name - Nombre del icono ('editar' | 'imprimir' | 'verdetalle') o URL directa
 * @param {number} size - Tamaño en píxeles (default: 18)
 * @param {string} alt - Texto alternativo
 * @param {string} className - Clases CSS adicionales
 * @param {object} style - Estilos en línea adicionales
 */
export default function ActionIcon({
  name,
  size = 18,
  alt,
  className = '',
  style = {},
  ...props
}) {
  const src = ICON_MAP[name] || name || '/iconos/boton-verdetalle.png'
  const altText = alt || name || 'icono'

  return (
    <img
      src={src}
      alt={altText}
      aria-hidden={!alt}
      className={`action-icon action-icon-${name} ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        pointerEvents: 'none',
        ...style,
      }}
      loading="eager"
      {...props}
    />
  )
}
