import React, { useEffect, useState } from 'react';
import { APPROVED_IMAGES } from '../approved-images';

// Renders a remote recipe image, falling back to the approved placeholder
// when the recipe has no image or the remote image fails to load.
export default function Thumb({ src, alt, className = '', ...rest }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const url = !src || failed ? APPROVED_IMAGES.placeholder : src;
  return (
    <img
      className={className}
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
