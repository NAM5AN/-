// ════════════════════════════════════════════════════════════════
//  Supabase Edge Function:  admin-stats
//  체험단 매니저 관리자 통계 — 사용자 목록 + 진행중/완료 갯수
//
//  보안:
//   - 요청 헤더 x-admin-token 이 환경변수 ADMIN_TOKEN 과 일치할 때만 데이터를 돌려줍니다.
//   - service_role 키(SUPABASE_SERVICE_ROLE_KEY)는 이 함수(서버) 안에서만 쓰이고
//     브라우저로 절대 전달되지 않습니다.
//
//  배포 시 주의:
//   - "Verify JWT"(JWT 검증)를 끄고 배포하세요. (대신 ADMIN_TOKEN 으로 보호)
//   - 환경변수(Secrets)에 ADMIN_TOKEN 만 직접 추가하면 됩니다.
//     (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 는 Supabase가 자동 제공)
// ════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-admin-token, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    // ── 1) 관리자 토큰 검증 ──
    const adminToken = Deno.env.get('ADMIN_TOKEN')
    const sent = req.headers.get('x-admin-token')
    if (!adminToken || sent !== adminToken) {
      return json({ error: '관리자 토큰이 올바르지 않습니다.' }, 401)
    }

    // ── 2) service_role 클라이언트 (RLS 우회, 전체 데이터 조회) ──
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── 2.5) 사용자 상세 모드: body에 userId가 있으면 그 사용자의 체험단 목록만 반환 ──
    let body: any = {}
    try { body = await req.json() } catch (_) { /* body 없으면 전체 통계 모드 */ }
    if (body && typeof body.userId === 'string' && body.userId) {
      const { data: rows, error } = await supabase
        .from('entries')
        .select('store_name, region, category, deadline, visit_date, completed, created_at, completed_at')
        .eq('user_id', body.userId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      const entries = (rows || []).map((r: any) => ({
        storeName: r.store_name || '(가게명 없음)',
        region: r.region || '',
        category: r.category || '',
        deadline: r.deadline || null,
        visitDate: r.visit_date || null,
        completed: !!r.completed,
        createdAt: r.created_at || null,
        completedAt: r.completed_at || null,
      }))
      return json({ entries, generatedAt: new Date().toISOString() })
    }

    // ── 3) 전체 사용자 목록 (1000명씩 페이지네이션) ──
    const authUsers: any[] = []
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      authUsers.push(...data.users)
      if (data.users.length < 1000) break
    }

    // ── 4) 전체 entries 집계 (사용자별 + 그래프용 날짜 시리즈) ──
    const byUser: Record<string, { active: number; completed: number; lastActive: string | null; lastCompleted: string | null }> = {}
    let totalActive = 0
    let totalCompleted = 0
    const entryCreatedDates: string[] = []   // 모든 캠페인 등록일 (YYYY-MM-DD)
    const entryCompletedDates: string[] = [] // 완료된 캠페인 완료일 (YYYY-MM-DD)
    const dateOnly = (v: any) => (v ? String(v).slice(0, 10) : null)
    const size = 1000
    for (let from = 0; from < 1_000_000; from += size) {
      const { data, error } = await supabase
        .from('entries')
        .select('user_id, completed, created_at, completed_at')
        .range(from, from + size - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      for (const r of data) {
        const row = r as any
        const uid = row.user_id ?? 'unknown'
        const rec = (byUser[uid] ??= { active: 0, completed: 0, lastActive: null, lastCompleted: null })
        // 그래프용: 등록일
        const cDate = dateOnly(row.created_at)
        if (cDate) entryCreatedDates.push(cDate)
        if (row.completed) {
          rec.completed++
          totalCompleted++
          // 완료일: completed_at 우선, 없으면 created_at
          const d = row.completed_at || row.created_at || null
          if (d && (!rec.lastCompleted || d > rec.lastCompleted)) rec.lastCompleted = d
          const dDate = dateOnly(row.completed_at || row.created_at)
          if (dDate) entryCompletedDates.push(dDate)
        } else {
          rec.active++
          totalActive++
          // 진행중: 등록일(created_at) 중 가장 최근
          const d = row.created_at || null
          if (d && (!rec.lastActive || d > rec.lastActive)) rec.lastActive = d
        }
      }
      if (data.length < size) break
    }

    // ── 5) 프리미엄 구독자 (선택 정보) ──
    const premium = new Set<string>()
    try {
      const { data: subs } = await supabase.from('subscriptions').select('user_id')
      subs?.forEach((s: any) => s.user_id && premium.add(s.user_id))
    } catch (_) {
      /* subscriptions 테이블이 없거나 접근 불가면 무시 */
    }

    // 닉네임/이름 추출 (카카오 등 OAuth는 user_metadata에 닉네임이 들어옴)
    const pickName = (u: any) => {
      const m = u.user_metadata || {}
      return m.name || m.full_name || m.nickname || m.preferred_username || m.user_name || ''
    }
    // 로그인 방식 (kakao / google / email 등)
    const pickProvider = (u: any) =>
      (u.app_metadata && u.app_metadata.provider) ||
      (u.identities && u.identities[0] && u.identities[0].provider) ||
      ''

    // ── 6) 사용자별 결과 구성 ──
    const users = authUsers.map((u) => ({
      id: u.id,
      name: pickName(u),
      provider: pickProvider(u),
      email: u.email || '',
      createdAt: u.created_at || null,
      lastSignIn: u.last_sign_in_at || null,
      active: byUser[u.id]?.active || 0,
      completed: byUser[u.id]?.completed || 0,
      lastActiveAt: byUser[u.id]?.lastActive || null,
      lastCompletedAt: byUser[u.id]?.lastCompleted || null,
      premium: premium.has(u.id),
    }))

    // entries에는 있지만 auth 목록엔 없는 user_id(탈퇴 등) 처리
    const known = new Set(authUsers.map((u) => u.id))
    for (const uid of Object.keys(byUser)) {
      if (uid !== 'unknown' && !known.has(uid)) {
        users.push({
          id: uid,
          name: '',
          provider: '',
          email: '(탈퇴/알 수 없음)',
          createdAt: null,
          lastSignIn: null,
          active: byUser[uid].active,
          completed: byUser[uid].completed,
          lastActiveAt: byUser[uid].lastActive || null,
          lastCompletedAt: byUser[uid].lastCompleted || null,
          premium: premium.has(uid),
        })
      }
    }

    return json({
      summary: {
        totalUsers: authUsers.length,
        totalActive,
        totalCompleted,
        totalEntries: totalActive + totalCompleted,
        premiumCount: premium.size,
      },
      users,
      series: {
        entryCreated: entryCreatedDates,
        entryCompleted: entryCompletedDates,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
