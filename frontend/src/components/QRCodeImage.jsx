import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QRCodeImage({ value, size = 200 }) {
  const [dataUrl, setDataUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setDataUrl(null)
    setError(null)

    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [value, size])

  if (error) {
    return <p className="text-sm text-red-600">Couldn't generate the QR code.</p>
  }

  if (!dataUrl) {
    return (
      <div
        className="flex animate-pulse items-center justify-center rounded-lg bg-surface-2 text-sm text-muted"
        style={{ width: size, height: size }}
      >
        Loading…
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt="Scan to open this share link"
      width={size}
      height={size}
      className="rounded-lg border border-border"
    />
  )
}
