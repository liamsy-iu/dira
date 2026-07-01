'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Copy, Trash2, Check, QrCode } from 'lucide-react'
import { deleteTableAction } from '@/lib/actions/tables'
import styles from './TableCard.module.css'

// Lazy-load QR code — heavy canvas library
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
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const tableUrl = `${baseUrl}/table/${qrToken}`

  async function handleCopy() {
    await navigator.clipboard.writeText(tableUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const canvas = canvasRef.current?.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${label.replace(/\s+/g, '-').toLowerCase()}-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${label}"? This will break any QR codes already printed.`)) return
    setDeleting(true)
    await deleteTableAction(id)
  }

  const statusVariant =
    status === 'occupied' ? styles['status-occupied']
    : status === 'reserved' ? styles['status-reserved']
    : styles['status-available']

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.label}>{label}</h3>
          <span className={`${styles.status} ${statusVariant}`}>
            {status}
          </span>
        </div>
        <button
          className={styles['delete-btn']}
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete ${label}`}
        >
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      </div>

      {/* QR Code */}
      <div className={styles['qr-wrap']} ref={canvasRef}>
        <QRCodeCanvas
          value={tableUrl}
          size={160}
          bgColor="transparent"
          fgColor="currentColor"
          level="M"
        />
      </div>

      {/* URL */}
      <p className={styles.url}>{tableUrl}</p>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles['action-btn']} onClick={handleCopy}>
          {copied ? (
            <><Check size={14} strokeWidth={2} /> Copied</>
          ) : (
            <><Copy size={14} strokeWidth={1.5} /> Copy URL</>
          )}
        </button>
        <button className={styles['action-btn']} onClick={handleDownload}>
          <QrCode size={14} strokeWidth={1.5} /> Download QR
        </button>
      </div>
    </div>
  )
}
