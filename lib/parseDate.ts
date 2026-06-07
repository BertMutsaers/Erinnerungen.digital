import type { ParsedDate } from '@/app/api/parse-date/route'

export async function parseDateText(text: string): Promise<ParsedDate> {
  const res  = await fetch('/api/parse-date', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text }),
  })
  return res.json() as Promise<ParsedDate>
}
