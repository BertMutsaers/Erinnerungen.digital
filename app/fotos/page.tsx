import BottomNav from '@/components/BottomNav'

export default function FotosPage() {
  return (
    <main className="mx-auto w-full max-w-[430px] min-h-screen bg-[#F2F2F7]">
      <header className="px-4 pt-10 pb-6">
        <h1 className="font-serif text-[30px] font-bold text-gray-900">Fotos</h1>
        <p className="font-sans text-[13px] text-gray-400 mt-0.5">Kommt bald</p>
      </header>
      <div className="flex items-center justify-center py-24">
        <p className="font-sans text-gray-300 text-[40px]">📷</p>
      </div>
      <BottomNav />
    </main>
  )
}
