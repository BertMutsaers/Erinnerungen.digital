import { NextRequest, NextResponse } from 'next/server'
import { createShareToken, revokeShareToken, regenerateShareToken, getShareToken } from '@/lib/sharing'

/** GET /api/share?projectId=... → { token: string | null } */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId missing' }, { status: 400 })
  try {
    const token = await getShareToken(projectId)
    return NextResponse.json({ token })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}

/** POST /api/share → { token } — body: { projectId, action: 'create' | 'regenerate' } */
export async function POST(req: NextRequest) {
  const { projectId, action } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId missing' }, { status: 400 })
  try {
    const token = action === 'regenerate'
      ? await regenerateShareToken(projectId)
      : await createShareToken(projectId)
    return NextResponse.json({ token })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}

/** DELETE /api/share → { ok: true } — body: { projectId } */
export async function DELETE(req: NextRequest) {
  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId missing' }, { status: 400 })
  try {
    await revokeShareToken(projectId)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}
