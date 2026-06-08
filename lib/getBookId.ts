/**
 * Resolves the book_id for a given project_id.
 * For new projects: project_id == book_id (created with same UUID).
 * For legacy data (Piet demo): book_id is different — look it up.
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
