import { useEffect, useRef } from 'react'

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function hexToRgba(hex, alpha) {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function draw(canvas) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = Math.max(1, rect.width * dpr)
  canvas.height = Math.max(1, rect.height * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const w = rect.width
  const h = rect.height
  if (w === 0 || h === 0) return

  const bg = cssVar('--color-bg')
  const accent = cssVar('--color-accent')
  const accent2 = cssVar('--color-accent-2')

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, hexToRgba(accent2, 0.85))
  sky.addColorStop(0.55, hexToRgba(accent, 0.9))
  sky.addColorStop(1, hexToRgba(bg, 1))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  const sunY = h * 0.42
  const sunR = Math.min(w, h) * 0.16
  const glow = ctx.createRadialGradient(w * 0.28, sunY, 0, w * 0.28, sunY, sunR * 2.2)
  glow.addColorStop(0, 'rgba(255,236,214,0.9)')
  glow.addColorStop(1, 'rgba(255,236,214,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(w * 0.28, sunY, sunR * 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,244,230,0.95)'
  ctx.beginPath()
  ctx.arc(w * 0.28, sunY, sunR, 0, Math.PI * 2)
  ctx.fill()

  function ridge(baseY, amp, color) {
    const segments = 8
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(0, baseY)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = t * w
      ctx.lineTo(x, baseY - Math.sin(t * Math.PI * 1.4) * amp - t * amp * 0.3)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
  ridge(h * 0.66, h * 0.05, hexToRgba(accent2, 0.55))
  ridge(h * 0.78, h * 0.06, hexToRgba(bg, 0.9))
}

export function AuthVisualPanel({ tagline }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const redraw = () => draw(canvas)
    redraw()
    window.addEventListener('resize', redraw)
    return () => window.removeEventListener('resize', redraw)
  }, [])

  return (
    <div className="relative hidden overflow-hidden lg:block">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <p className="font-display absolute inset-x-9 bottom-9 text-2xl leading-tight text-[#fbeedd] text-balance">
        {tagline}
      </p>
    </div>
  )
}
