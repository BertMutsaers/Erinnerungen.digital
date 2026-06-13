/**
 * Resolves the book_id for a given project_id.
 * For new projects project_id == book_id (created with same UUID);
 * the lookup is a fallback for any data where they differ.
 */
import { createSupabaseServer } from './supabase-server'

export async function getBookId(projectId: string): Promise<string> {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from('books')
    .select('id')
    .eq('project_id', projectId)
    .single()
  return data?.id ?? projectId
}
