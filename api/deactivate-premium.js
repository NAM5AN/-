import { createClient } from '@supabase/supabase-js';

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
    // 2. 현재 구독 확인
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status, source')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing || existing.plan !== 'premium') {
      return res.status(200).json({
        success: true,
        alreadyFree: true,
        message: '이미 무료 플랜입니다',
        plan: 'free'
      });
    }

    // 3. 무료 플랜으로 전환
    //    베타 무료(beta_free)는 행을 free로 갱신.
    //    유료 결제(paid)는 함부로 끄면 안 되므로 차단 — 정식 해지 절차 필요.
    if (existing.source === 'paid') {
      return res.status(400).json({
        error: 'PAID_SUBSCRIPTION',
        message: '유료 결제 구독은 결제 관리에서 해지해주세요'
      });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'active',
        expires_at: null,
        updated_at: now
      })
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      alreadyFree: false,
      message: '무료 플랜으로 전환되었습니다',
      plan: 'free'
    });

  } catch (err) {
    console.error('프리미엄 해제 오류:', err);
    return res.status(500).json({
      error: '플랜 전환 중 오류가 발생했습니다',
      detail: err.message
    });
  }
}
