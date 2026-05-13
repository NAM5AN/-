import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

const SUPABASE_URL = 'https://wvwoqqfizgbhvdzlqscc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iLtSrF52sRfzalwcR4Nt-w_dJiU2q16';
const DAILY_LIMIT = 3;
const GEMINI_MODEL = 'gemini-2.0-flash';

const EXTRACTION_PROMPT = `이 이미지는 블로그 체험단 모집 공고 캡쳐입니다. 다음 항목을 추출해주세요.

JSON 형식으로만 답변하세요 (코드 블록이나 다른 설명 절대 금지):
{
  "storeName": "상호명 또는 업체명",
  "region": "지역 (시/도 + 구/군, 예: 서울 강남구)",
  "content": "체험단에게 제공되는 내용/서비스/제품",
  "deadline": "리뷰 마감일 (YYYY-MM-DD 형식, 추출 불가하면 빈 문자열)"
}

[deadline 추출 규칙 - 매우 중요]
체험단 공고에는 보통 두 가지 날짜가 있습니다. 헷갈리지 마세요:
  ① "모집 마감일" / "선정 마감일" / "신청 마감일" / "모집 및 선정 기간" → 이건 절대 추출하면 안 됨
  ② "리뷰 마감일" / "리뷰 마감" / "포스팅 마감" / "콘텐츠 등록 마감" → 이것을 추출해야 함

deadline 필드에는 반드시 ②번(리뷰 마감일)만 넣으세요.
공고에 "리뷰 마감"이 명시적으로 적혀있으면 그 날짜를, 없으면 가장 늦은 날짜를 추출하세요.
모집 마감일이나 신청 마감일만 있고 리뷰 마감일이 없다면 빈 문자열로 두세요.

[형식]
- 모든 날짜는 YYYY-MM-DD 형식으로 변환 (예: "26.06.09" → "2026-06-09")
- 찾지 못한 항목은 빈 문자열로 두세요.`;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    // 1. 사용자 JWT 검증
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    }
    const token = authHeader.slice(7);

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        detail: userError?.message || 'No user data'
      });
    }
    const userId = userData.user.id;

    // 2. 오늘 사용량 체크
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage, error: usageError } = await supabase
      .from('daily_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (usageError) {
      return res.status(500).json({
        error: 'USAGE_QUERY_FAILED',
        detail: usageError.message
      });
    }

    const currentCount = usage?.count || 0;
    if (currentCount >= DAILY_LIMIT) {
      return res.status(429).json({
        error: 'DAILY_LIMIT_EXCEEDED',
        limit: DAILY_LIMIT,
        used: currentCount,
        remaining: 0
      });
    }

    // 3. 요청 본문에서 이미지 데이터 받기
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({
        error: 'MISSING_IMAGE',
        detail: `imageBase64: ${!!imageBase64
