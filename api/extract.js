import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wvwoqqfizgbhvdzlqscc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iLtSrF52sRfzalwcR4Nt-w_dJiU2q16';
const DAILY_LIMIT = 3;
const OPENAI_MODEL = 'gpt-4o';

// 관리자 UID 화이트리스트 (app_metadata.is_admin 플래그와 함께 이중으로 체크)
const ADMIN_USER_IDS = [
  '00712584-e37a-46c3-ac31-387f73b6523c'
];

// 유저가 관리자인지 판별 — 다음 중 하나라도 만족하면 관리자
//  (1) app_metadata.is_admin === true
//  (2) UID가 ADMIN_USER_IDS 화이트리스트에 포함
function isAdminUser(user) {
  if (!user) return false;
  if (user.app_metadata?.is_admin === true) return true;
  if (ADMIN_USER_IDS.includes(user.id)) return true;
  return false;
}

// 프롬프트는 함수로 생성 — 오늘 날짜를 주입해 연도 추론 정확도를 높임
function buildExtractionPrompt(today) {
  return `이 이미지는 블로그 체험단 모집 공고 캡쳐입니다. 다음 항목을 추출해주세요.

오늘 날짜는 ${today} 입니다. 날짜 추론 시 이 값을 기준으로 삼으세요.

JSON 형식으로만 답변하세요 (코드 블록이나 다른 설명 절대 금지):
{
  "storeName": "상호명 또는 업체명",
  "region": "지역 (시/도 + 구/군, 예: 서울 강남구)",
  "content": "체험단에게 제공되는 내용/서비스/제품",
  "deadline": "리뷰 마감일 (YYYY-MM-DD 형식, 추출 불가하면 빈 문자열)"
}

[deadline 추출 규칙 - 매우 중요]
체험단 공고에는 보통 여러 종류의 날짜가 있습니다. 절대 헷갈리지 마세요.

deadline은 "리뷰(블로그/SNS 게시물)를 등록해야 하는 마지막 날짜" 입니다.
다음 우선순위로 판단하세요:
  1순위: "리뷰 등록기간" / "리뷰 등록 기간" / "콘텐츠 등록기간"의 *종료 날짜*
         예) "리뷰 등록기간  05.19 ~ 06.08" → deadline은 "2026-06-08" (끝 날짜!)
  2순위: "리뷰 마감일" / "리뷰 마감" / "포스팅 마감" / "콘텐츠 등록 마감"의 명시적 날짜
  3순위: 위 항목이 전혀 없으면 빈 문자열

[deadline으로 추출하면 절대 안 되는 항목들]
다음은 마감일이 아닙니다. 절대 deadline에 넣지 마세요:
  - "리뷰어 신청기간" / "신청 기간" / "모집 기간"
  - "리뷰어 발표" / "선정자 발표" / "리뷰어 선정"
  - "캠페인 결과발표" / "결과 발표"
  - "모집 마감" / "신청 마감"
주의: 이미지에서 특정 날짜가 색상이나 굵게 강조되어 있어도,
그 항목이 "리뷰어 발표" 같은 항목이면 deadline이 아닙니다.
강조 여부가 아니라 "항목 이름"으로 판단하세요.

[기간 표기 처리]
"05.19 ~ 06.08" 처럼 기간(범위)으로 표기된 경우:
  - 시작 날짜가 아니라 *종료 날짜*(뒤쪽 날짜)를 사용하세요.

[연도 추론 규칙 - 매우 중요]
이미지의 날짜에 연도(2024, 2025 등)가 없는 경우가 많습니다.
연도가 명시되지 않았다면 다음 규칙을 적용하세요:
  - 추출한 월/일이 오늘(${today}) 이후이거나 같으면 → 올해 연도
  - 추출한 월/일이 오늘보다 과거이면 → 내년 연도
  - 절대 작년 이하의 과거 연도로 추론하지 마세요.
연도가 명시되어 있으면("26.06.08" 처럼) 그 연도를 그대로 쓰세요.

[형식]
- 모든 날짜는 반드시 YYYY-MM-DD 형식으로 변환
  예) "26.06.09" → "2026-06-09", "6/8" → 연도 추론 후 "2026-06-08"
- 찾지 못한 항목은 빈 문자열로 두세요.`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

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
    const isAdmin = isAdminUser(userData.user);

    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from('daily_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    const currentCount = usage?.count || 0;

    // 관리자는 일일 제한 우회 (일반 유저만 제한 적용)
    if (!isAdmin && currentCount >= DAILY_LIMIT) {
      return res.status(429).json({
        error: 'DAILY_LIMIT_EXCEEDED',
        limit: DAILY_LIMIT,
        used: currentCount
      });
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'MISSING_IMAGE' });
    }

    // OpenAI API 호출
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_KEY_NOT_CONFIGURED' });
    }

    const openaiRes = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: buildExtractionPrompt(today) },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }],
          response_format: { type: 'json_object' },
          temperature: 0,
          max_tokens: 512
        })
      }
    );

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      return res.status(502).json({ error: 'OPENAI_API_ERROR', detail: errBody });
    }

    const openaiData = await openaiRes.json();
    const rawText = openaiData.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return res.status(502).json({ error: 'OPENAI_PARSE_ERROR', raw: rawText });
      }
    }

    // ===== 후처리: deadline 연도 보정 (AI가 과거 연도로 추론한 경우 방어) =====
    parsed.deadline = correctDeadlineYear(parsed.deadline, today);

    // 사용량 기록 — 관리자는 카운트하지 않음 (무제한)
    if (!isAdmin) {
      if (currentCount === 0) {
        await supabase.from('daily_usage').insert({ user_id: userId, date: today, count: 1 });
      } else {
        await supabase
          .from('daily_usage')
          .update({ count: currentCount + 1 })
          .eq('user_id', userId)
          .eq('date', today);
      }
    }

    // 응답 — 관리자는 무제한 표시, 일반 유저는 사용량 정보 포함
    return res.status(200).json({
      data: parsed,
      usage: isAdmin
        ? { isAdmin: true }
        : {
            used: currentCount + 1,
            limit: DAILY_LIMIT,
            remaining: DAILY_LIMIT - currentCount - 1
          }
    });

  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', detail: err.message });
  }
}

/**
 * AI가 추출한 deadline의 연도를 검증/보정한다.
 * - 형식이 YYYY-MM-DD가 아니면 그대로 반환
 * - 추출된 날짜가 오늘보다 30일 이상 과거이면 연도가 잘못된 것으로 간주
 *   → 월/일이 오늘 이후가 되도록 연도를 올림 (보통 +1년, 필요시 더)
 * 체험단 리뷰 마감일은 거의 항상 미래 날짜이므로 과거면 연도 오류로 판단 가능.
 */
function correctDeadlineYear(deadline, today) {
  if (!deadline || typeof deadline !== 'string') return '';
  const m = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return deadline; // 형식 안 맞으면 손대지 않음

  const todayDate = new Date(today + 'T00:00:00Z');
  let year = parseInt(m[1], 10);
  const month = m[2];
  const day = m[3];

  let candidate = new Date(`${year}-${month}-${day}T00:00:00Z`);
  const GRACE_MS = 30 * 24 * 60 * 60 * 1000; // 30일 유예 (이미 마감 직전 등록한 경우 대비)

  // 추출된 날짜가 오늘보다 30일 이상 과거이면 연도를 올림
  let guard = 0;
  while (candidate.getTime() < todayDate.getTime() - GRACE_MS && guard < 5) {
    year += 1;
    candidate = new Date(`${year}-${month}-${day}T00:00:00Z`);
    guard += 1;
  }

  return `${year}-${month}-${day}`;
}
