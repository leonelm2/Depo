import React from 'react'

const ICON_MAP = {
  editar: '/iconos/boton-editar.png',
  imprimir: '/iconos/boton-imprimir.png',
  verdetalle: '/iconos/boton-verdetalle.png',
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
