import Link from 'next/link'
import Logo from './Logo'

export default function InvalidShareLink() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6" style={{ backgroundColor: '#F2F2F7' }}>
      <Logo variant="full" height={60} />
      <div className="bg-white rounded-[20px] px-8 py-10 text-center max-w-[380px] w-full" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
        <p className="font-sans text-[32px] mb-4">🔗</p>
        <h1 className="font-serif font-bold text-[22px] text-gray-900 mb-3 leading-tight">
          Dieser Link ist nicht (mehr) gültig
        </h1>
        <p className="font-sans text-[14px] leading-relaxed" style={{ color: '#9B9B9B' }}>
          Das Erinnerungsbuch wurde möglicherweise nicht mehr freigegeben oder der Link ist abgelaufen.
        </p>
      </div>
      <Link href="/" className="font-sans text-[13px] underline active:opacity-60" style={{ color: '#9B9B9B' }}>
        Zur Startseite
      </Link>
    </main>
  )
}
