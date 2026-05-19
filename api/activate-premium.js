import { createClient } from '@supabase/supabase-js';

// 베타 무료 프리미엄 종료일 (이 날짜까지 프리미엄 혜택 무료 제공)
const BETA_PREMIUM_EXPIRES_AT = '2026-09-30T23:59:59+09:00';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. 토큰 검증
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다' });
  }
  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error: authError } =
    await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: '유효하지 않은 세션입니다' });
  }

  try {
    // 2. 이미 프리미엄인지 확인
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing && existing.plan === 'premium' && existing.status === 'active') {
      return res.status(200).json({
        success: true,
        alreadyPremium: true,
        message: '이미 프리미엄 이용 중입니다',
        plan: 'premium',
        expiresAt: existing.expires_at
      });
    }

    // 3. 베타 프리미엄 부여 (upsert: 기존 행 있으면 갱신, 없으면 생성)
    const now = new Date().toISOString();
    const { error: upsertError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan: 'premium',
        status: 'active',
        source: 'beta_free',
        started_at: now,
        expires_at: BETA_PREMIUM_EXPIRES_AT,
        updated_at: now
      }, { onConflict: 'user_id' });

    if (upsertError) throw upsertError;

    return res.status(200).json({
      success: true,
      alreadyPremium: false,
      message: '프리미엄이 활성화되었습니다',
      plan: 'premium',
      expiresAt: BETA_PREMIUM_EXPIRES_AT
    });

  } catch (err) {
    console.error('프리미엄 활성화 오류:', err);
    return res.status(500).json({
      error: '프리미엄 활성화 중 오류가 발생했습니다',
      detail: err.message
    });
  }
}
