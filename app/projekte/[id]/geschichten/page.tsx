import { getBookId } from '@/lib/getBookId'
import GeschichtenScreen from '@/components/GeschichtenScreen'

export default async function ProjektGeschichtenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bookId  = await getBookId(id)
  return <GeschichtenScreen bookId={bookId} basePath={`/projekte/${id}`} />
}
