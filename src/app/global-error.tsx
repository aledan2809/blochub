'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ro">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#1f2937' }}>
            A apărut o eroare
          </h1>
          <p style={{ marginBottom: '24px', color: '#6b7280' }}>
            Ne pare rău, ceva nu a funcționat corect.
          </p>
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Încearcă din nou
          </button>
        </div>
      </body>
    </html>
  )
}
