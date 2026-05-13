import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wvwoqqfizgbhvdzlqscc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iLtSrF52sRfzalwcR4Nt-w_dJiU2q16';
const DAILY_LIMIT = 3;

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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
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
    console.error('Usage query failed:', usageError);
    return res.status(500).json({ error: 'USAGE_QUERY_FAILED' });
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
    return res.status(400).json({ error: 'MISSING_IMAGE' });
  }

  // 4. Gemini API 호출
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY env var not set');
    return res.status(500).json({ error: 'SERVER_MISCONFIGURED' });
  }

  let geminiResponse;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: EXTRACTION_PROMPT }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })
      }
    );
  } catch (e) {
    console.error('Gemini fetch failed:', e);
    return res.status(502).json({ error: 'GEMINI_FETCH_FAILED' });
  }

  if (!geminiResponse.ok) {
    const errorBody = await geminiResponse.text().catch(() => '');
    console.error('Gemini error:', geminiResponse.status, errorBody);
    return res.status(502).json({ error: 'GEMINI_API_ERROR', status: geminiResponse.status });
  }

  const result = await geminiResponse.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const cleaned = text.replace(/```json|```/g, '').trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch (e2) {
      console.error('JSON parse failed:', text);
      return res.status(502).json({ error: 'JSON_PARSE_FAILED' });
    }
  }

  // 5. 사용량 +1
  const newCount = currentCount + 1;
  const { error: upsertError } = await supabase
    .from('daily_usage')
    .upsert({
      user_id: userId,
      date: today,
      count: newCount,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' });

  if (upsertError) {
    console.error('Usage upsert failed:', upsertError);
    // 사용량 기록 실패해도 결과는 반환 (사용자에게 손해 X)
  }

  // 6. 결과 반환
  return res.status(200).json({
    success: true,
    data: parsed,
    usage: {
      used: newCount,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - newCount
    }
  });
}
