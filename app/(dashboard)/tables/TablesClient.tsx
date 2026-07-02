'use client'

import { useState, useEffect, useActionState } from 'react'
import { Plus, Table2 } from 'lucide-react'
import { createTableAction } from '@/lib/actions/tables'
import { useDiraStore } from '@/lib/store/dira'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Modal } from '@/components/ui/Modal/Modal'
import { TableCard } from './TableCard'
import styles from './page.module.css'

const initialState: { error: string | undefined; success: boolean } = { error: undefined, success: false }

export function TablesClient() {
  const tables = useDiraStore((s) => s.tables)
  const [modalOpen, setModalOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createTableAction, initialState)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (state?.success) setModalOpen(false)
  }, [state?.success])

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Tables</h2>
          <p className={styles.subtitle}>
            {tables.length} {tables.length === 1 ? 'table' : 'tables'} · each has a unique QR code
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
          <Plus size={16} strokeWidth={2} />
          Add table
        </Button>
      </div>

      {tables.length === 0 ? (
        <div className={styles.empty}>
          <Table2 size={36} strokeWidth={1} />
          <h3 className={styles['empty-title']}>No tables yet</h3>
          <p className={styles['empty-sub']}>
            Add your first table to generate a QR code for customers to scan
          </p>
          <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
            Add first table
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {tables.map((table) => (
            <TableCard
              key={table.id}
              id={table.id}
              label={table.label}
              status={table.status}
              qrToken={table.qr_token}
              baseUrl={baseUrl}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add table"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="add-table-form" loading={isPending}>
              Add table
            </Button>
          </>
        }
      >
        <form id="add-table-form" action={formAction} className={styles['modal-form']}>
          {state?.error && (
            <div className={styles['modal-error']} role="alert">{state.error}</div>
          )}
          <Input
            label="Table name"
            name="label"
            type="text"
            placeholder="Table 1, Counter, Terrace…"
            required
          />
          <p className={styles['modal-hint']}>
            A unique QR code will be generated automatically.
          </p>
        </form>
      </Modal>
    </>
  )
}
