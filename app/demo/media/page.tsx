import Link from 'next/link'
import MediaScreen from '@/components/MediaScreen'

const DEMO_BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

function DemoBanner() {
  return (
    <div style={{ background: '#000', color: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <p className="font-sans" style={{ fontSize: 13 }}>
        <span style={{ marginRight: 8 }}>👁️</span>
        <strong>Demo-Ansicht</strong> — Das ist ein Beispielprojekt.
      </p>
      <Link href="/auth" className="font-sans font-semibold"
        style={{ fontSize: 13, color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '5px 14px', borderRadius: 100, whiteSpace: 'nowrap', textDecoration: 'none' }}>
        Eigenes Projekt erstellen →
      </Link>
    </div>
  )
}

export default function DemoMediaPage() {
  return (
    <div>
      <DemoBanner />
      <MediaScreen bookId={DEMO_BOOK_ID} basePath="/demo" />
    </div>
  )
}
