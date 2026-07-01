'use client'

// Inline styles + a scoped <style> tag — guaranteed to work at print time
// regardless of CSS Module class name hashing across component files.
export function PrintReceiptButton() {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `@media print { #dira-receipt-print { display: none !important; } }`
      }} />
      <button
        id="dira-receipt-print"
        onClick={() => window.print()}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontFamily: 'inherit',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          marginTop: '8px',
        }}
      >
        Print receipt
      </button>
    </>
  )
}
