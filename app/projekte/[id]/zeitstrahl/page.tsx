import { getBookId } from '@/lib/getBookId'
import TimelineScreen from '@/components/TimelineScreen'

export default async function ProjektZeitstrahlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bookId  = await getBookId(id)
  return <TimelineScreen bookId={bookId} basePath={`/projekte/${id}`} />
}
