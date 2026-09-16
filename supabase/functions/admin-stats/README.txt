체험단 매니저 · 관리자 페이지 파일

1) index.ts  (원래 이름: admin-stats.ts)
   → Supabase 대시보드 > Edge Functions > admin-stats 에 코드 전체 교체 후 Deploy
   → (Verify JWT 끄기 / Secrets에 ADMIN_TOKEN 설정은 최초 1회만)
   → 이 파일에는 키가 없다. 전부 Deno.env.get() 으로 읽는다.

2) admin.html  (레포 루트)
   → https://cheheomdan-manager.com/admin.html 로 배포된다.
   → 설정창의 "📊 관리자 통계 열기" 버튼으로 들어갈 수 있다(관리자 계정에만 보임).
   → 관리자 토큰을 입력해야 데이터가 나온다. 토큰은 sessionStorage 에만 남아
     탭을 닫으면 지워진다.

수정할 때마다 두 파일을 함께 교체(함수 재배포 + admin.html 새로고침)하면 됩니다.

─────────────────────────────────────────────────────────────
보안 메모 (2026-09-16)

이 레포는 공개(PUBLIC)다. 위 두 파일에 키나 토큰은 들어있지 않지만,
admin.html 이 배포되면서 아래 사실이 공개된다는 점은 알고 있어야 한다.

  - admin-stats 엔드포인트의 주소와 요청 형식
  - 인증이 x-admin-token 헤더 하나뿐이라는 것 (Verify JWT 꺼짐, CORS *)
  - 이 함수가 전체 사용자의 이메일·가입일·최근 로그인을 돌려준다는 것

즉 ADMIN_TOKEN 하나가 전 사용자 이메일을 지키는 유일한 방어선이다.
토큰이 짧거나 추측 가능한 값이면 지금 바꿀 것. 32자 이상 무작위를 쓴다.

  openssl rand -base64 32

바꿀 때는 Supabase Secrets 의 ADMIN_TOKEN 만 교체하면 되고,
admin.html 은 토큰을 입력받는 구조라 파일을 고칠 필요가 없다.
함수 재배포도 필요 없다.
