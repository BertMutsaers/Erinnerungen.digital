import { NextRequest, NextResponse } from 'next/server'
import { createShareToken, revokeShareToken, regenerateShareToken, getShareToken, enableSharing, disableSharing } from '@/lib/sharing'

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

/**
 * POST /api/share
 * body: { projectId, action: 'enable' | 'disable' | 'create' | 'regenerate' }
 * - 'enable'     → activate sharing (reuse token if exists, else create)
 * - 'disable'    → deactivate sharing (token preserved for later re-enable)
 * - 'create'     → create new token (legacy)
 * - 'regenerate' → replace token (legacy)
 */
export async function POST(req: NextRequest) {
  const { projectId, action } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId missing' }, { status: 400 })
  try {
    if (action === 'enable') {
      const token = await enableSharing(projectId)
      return NextResponse.json({ token })
    }
    if (action === 'disable') {
      await disableSharing(projectId)
      return NextResponse.json({ ok: true })
    }
    // legacy
    const token = action === 'regenerate'
      ? await regenerateShareToken(projectId)
      : await createShareToken(projectId)
    return NextResponse.json({ token })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 })
  }
}

/** DELETE /api/share → { ok: true } — body: { projectId } — fully revokes token */
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
