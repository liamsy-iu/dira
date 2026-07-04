'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Trash2, Check, Download } from 'lucide-react'
import { deleteTableAction, toggleTableStatusAction } from '@/lib/actions/tables'
import { useDiraStore } from '@/lib/store/dira'
import styles from './TableCard.module.css'

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeCanvas),
  { ssr: false, loading: () => <div className={styles['qr-placeholder']} /> }
)

interface TableCardProps {
  id: string
  label: string
  status: string
  qrToken: string
  baseUrl: string
}

export function TableCard({ id, label, status, qrToken, baseUrl }: TableCardProps) {
  const businessName = useDiraStore((s) => s.businessName)
  const [currentStatus, setCurrentStatus] = useState(status)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  // Ref for the visible QR (small, for preview)
  const previewQrRef = useRef<HTMLDivElement>(null)
  // Ref for the hidden large QR (high-res, for poster)
  const posterQrRef = useRef<HTMLDivElement>(null)

  const tableUrl = `${baseUrl}/table/${qrToken}`

  const statusVariant =
    currentStatus === 'occupied' ? styles['status-occupied']
    : currentStatus === 'reserved' ? styles['status-reserved']
    : styles['status-available']

  async function handleCopy() {
    await navigator.clipboard.writeText(tableUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${label}"? This will break any printed QR codes.`)) return
    setDeleting(true)
    await deleteTableAction(id)
  }

  async function handleToggleStatus() {
    setToggling(true)
    const next = currentStatus === 'available' ? 'occupied' : 'available'
    setCurrentStatus(next)
    const result = await toggleTableStatusAction(id, currentStatus)
    if (result.error) setCurrentStatus(currentStatus)
    setToggling(false)
  }

  async function handleDownloadPoster() {
    const largeQr = posterQrRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!largeQr) return

    const W = 600
    const H = 820
    const poster = document.createElement('canvas')
    poster.width = W
    poster.height = H
    const ctx = poster.getContext('2d')!

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }

    // ── Background ──────────────────────────────────────────────────
    ctx.fillStyle = '#FAFAF8'
    ctx.fillRect(0, 0, W, H)

    // ── Green header ────────────────────────────────────────────────
    ctx.fillStyle = '#16a34a'
    rr(0, 0, W, 210, 0)
    ctx.fill()

    // ── Business name ────────────────────────────────────────────────
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(businessName || 'Café', W / 2, 105, W - 80)

    // ── Table label ──────────────────────────────────────────────────
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.letterSpacing = '0.12em'
    ctx.fillText(label.toUpperCase(), W / 2, 158)

    // ── QR white card ────────────────────────────────────────────────
    const QR = 300
    const qx = (W - QR) / 2
    const qy = 230

    ctx.shadowColor = 'rgba(0,0,0,0.10)'
    ctx.shadowBlur = 28
    ctx.shadowOffsetY = 6
    ctx.fillStyle = '#ffffff'
    rr(qx - 28, qy - 28, QR + 56, QR + 56, 20)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    // ── QR code ──────────────────────────────────────────────────────
    ctx.drawImage(largeQr, qx, qy, QR, QR)

    // ── Scan to order ────────────────────────────────────────────────
    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText('Scan to Order', W / 2, qy + QR + 80)

    ctx.fillStyle = '#9e9089'
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText('Browse the menu and place your order', W / 2, qy + QR + 116)

    // ── URL (short, for manual typing) ───────────────────────────────
    ctx.fillStyle = '#c4bdb5'
    ctx.font = '12px "Courier New", Courier, monospace'
    ctx.fillText(tableUrl.replace('https://', ''), W / 2, qy + QR + 152, W - 80)

    // ── Dira branding ─────────────────────────────────────────────────
    ctx.fillStyle = '#d4cfc9'
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText('Powered by Dira', W / 2, H - 28)

    // ── Download ──────────────────────────────────────────────────────
    const link = document.createElement('a')
    link.download = `${label.replace(/\s+/g, '-').toLowerCase()}-table-poster.png`
    link.href = poster.toDataURL('image/png', 1.0)
    link.click()
  }

  return (
    <div className={styles.card}>
      {/* Hidden high-res QR for poster generation */}
      <div style={{ position: 'absolute', left: -9999, top: -9999, opacity: 0, pointerEvents: 'none' }} ref={posterQrRef}>
        <QRCodeCanvas value={tableUrl} size={300} level="H" />
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.label}>{label}</h3>
          <motion.span
            key={currentStatus}
            className={`${styles.status} ${statusVariant}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          >
            {currentStatus}
          </motion.span>
        </div>
        <button className={styles['delete-btn']} onClick={handleDelete} disabled={deleting} aria-label={`Delete ${label}`}>
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      </div>

      {/* Status toggle */}
      <button
        className={`${styles['status-toggle']} ${currentStatus === 'occupied' ? styles['toggle-occupied'] : styles['toggle-available']}`}
        onClick={handleToggleStatus}
        disabled={toggling}
      >
        {currentStatus === 'available' ? 'Mark as occupied' : 'Mark as available'}
      </button>

      {/* QR Code preview */}
      <div className={styles['qr-wrap']} ref={previewQrRef}>
        <QRCodeCanvas value={tableUrl} size={160} bgColor="transparent" fgColor="currentColor" level="M" />
      </div>

      <p className={styles.url}>{tableUrl}</p>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles['action-btn']} onClick={handleCopy}>
          {copied
            ? <><Check size={14} strokeWidth={2} /> Copied</>
            : <><span>🔗</span> Copy URL</>
          }
        </button>
        <button className={styles['action-btn']} onClick={handleDownloadPoster}>
          <Download size={14} strokeWidth={1.5} /> Download poster
        </button>
      </div>
    </div>
  )
}
