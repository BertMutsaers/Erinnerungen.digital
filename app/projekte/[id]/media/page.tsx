import { getBookId } from '@/lib/getBookId'
import MediaScreen from '@/components/MediaScreen'

export default async function ProjektMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bookId  = await getBookId(id)
  return <MediaScreen bookId={bookId} basePath={`/projekte/${id}`} />
}
