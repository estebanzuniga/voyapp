import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useTranslation } from '../hooks/useTranslation'

export function QRCodeImage({ value, size = 200 }) {
  const { t } = useTranslation()
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
    return <p className="text-sm text-red-600">{t('qrCode.error')}</p>
  }

  if (!dataUrl) {
    return (
      <div
        className="flex animate-pulse items-center justify-center rounded-lg bg-surface-2 text-sm text-muted"
        style={{ width: size, height: size }}
      >
        {t('common.loading')}
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt={t('qrCode.alt')}
      width={size}
      height={size}
      className="rounded-lg border border-border"
    />
  )
}
