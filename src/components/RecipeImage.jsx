import { useState } from 'react'
import { APPROVED_IMAGES } from '../approved-images.js'

// Renders a recipe's remote cover image, falling back to the approved
// placeholder when no image is set or the remote URL fails to load.
// Only remote URLs from project-assets data or approved-images.js are used.
export default function RecipeImage({ src, alt, className, accentColor }) {
  const [failed, setFailed] = useState(false)
  const useFallback = !src || failed
  return (
    <img
      className={className}
      src={useFallback ? APPROVED_IMAGES.placeholder : src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!failed) setFailed(true)
      }}
      style={accentColor ? { backgroundColor: accentColor } : undefined}
    />
  )
}
