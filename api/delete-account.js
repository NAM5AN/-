import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 1. 토큰 검증
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다' })
  }
  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error: authError } = 
    await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: '유효하지 않은 세션입니다' })
  }

  try {
    // 2. 카카오 연결 끊기 (실패해도 진행)
    const kakaoIdentity = user.identities?.find(i => i.provider === 'kakao')
    const kakaoToken = 
      kakaoIdentity?.identity_data?.provider_token ||
      user.user_metadata?.provider_token

    if (kakaoToken) {
      try {
        await fetch('https://kapi.kakao.com/v1/user/unlink', {
          method: 'POST',
          headers: { Authorization: `Bearer ${kakaoToken}` }
        })
      } catch (err) {
        console.log('카카오 unlink 실패 (무시):', err.message)
      }
    }

    // 3. auth.users 삭제 → CASCADE로 entries, daily_usage 자동 삭제
    const { error: deleteError } = 
      await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) throw deleteError

    return res.status(200).json({
      success: true,
      message: '회원 탈퇴가 완료되었습니다'
    })
  } catch (err) {
    console.error('탈퇴 처리 오류:', err)
    return res.status(500).json({
      error: '탈퇴 처리 중 오류가 발생했습니다',
      detail: err.message
    })
  }
}
