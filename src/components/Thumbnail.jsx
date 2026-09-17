import React, { useState } from 'react'
import { APPROVED_IMAGES } from '../approved-images.js'

// Renders a recipe image; falls back to the approved placeholder image when
// the recipe has no image or when the remote image fails to load. Only remote
// URLs from the project data / approved-images module are ever used.
export default function Thumbnail({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)
  const url = failed || !src ? APPROVED_IMAGES.placeholder : src
  return (
    <img
      src={url}
      alt={alt || 'Recipe image'}
      className={`thumb ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
