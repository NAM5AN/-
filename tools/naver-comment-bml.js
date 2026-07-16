/* 체험단 매니저 — 블로그 댓글 도우미 북마클릿 패널
   네이버 블로그 글 화면(mainFrame 안 PostView 또는 m.blog)에서 실행됨.
   인증·프리미엄 확인·댓글 생성은 전부 숨김 iframe(comment-bridge.html, 체험단 매니저 도메인)이 대행. */
(function () {
  if (window.__cmCmtBooted) { return; }
  window.__cmCmtBooted = true;

  var SITE = "https://cheheomdan-manager.com";
  var BRIDGE_URL = SITE + "/tools/comment-bridge.html?v=" + Date.now();
  var SITE_ORIGIN = SITE;
  var MIN_SAMPLES = 5;
  var TONES = {
    warm: "친근하고 다정한 존댓말, 가벼운 이모티콘 1개 정도",
    polite: "정중하고 깔끔한 존댓말, 이모티콘 없이 담백하게",
    lively: "밝고 발랄한 톤, 느낌표와 이모티콘을 자연스럽게",
    plain: "군더더기 없이 짧고 담백한 존댓말, 이모티콘 최소화"
  };
  var SAMPLE_PLACEHOLDERS = [
    "예) 우와 사진만 봐도 군침 도네요 ㅎㅎ 꼭 가봐야겠어요!",
    "예) 분위기 진짜 좋다.. 데이트 코스로 딱일 듯 👍",
    "예) 저도 저번에 갔는데 주차가 좀 힘들었어요 ㅠㅠ 그래도 맛은 최고였어요",
    "예) 가격도 착하고 양도 많네요 완전 혜자~ 다음에 또 갈래요",
    "예) 헐 이거 완전 제 취향이에요 일단 저장해둘게요!!",
    "예) 인테리어 너무 예뻐서 사진 찍기 좋겠어요 ☺️",
    "예) 메뉴 종류 많아서 골라먹는 재미 있겠네요 ㅋㅋ"
  ];

  /* ---------- 본문 추출 (지금 보고 있는 페이지에서) ---------- */
  function extractPost() {
    var d = document;
    var el = d.querySelector(".se-main-container") || d.getElementById("postViewArea") || d.querySelector(".post_ct");
    var text = el ? (el.innerText || "") : "";
    text = text.replace(/\u200b/g, "").replace(/\n{3,}/g, "\n\n").trim();
    var te = d.querySelector(".se-title-text") || d.querySelector(".htitle") || d.querySelector(".se_title") || d.querySelector(".tit_h3");
    var title = te ? (te.innerText || "").trim() : "";
    return { title: title, text: text.slice(0, 8000) };
  }

  /* ---------- 호스트 + Shadow DOM ---------- */
  var host = document.createElement("div");
  host.id = "cm-cmt-host";
  host.style.cssText = "all:initial; position:fixed; z-index:2147483000; right:16px; bottom:16px;";
  (document.body || document.documentElement).appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  var css = ""
    + ":host{all:initial}"
    + "*{box-sizing:border-box; font-family:'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕',sans-serif}"
    + ".panel{width:min(380px,calc(100vw - 32px)); max-height:min(82vh,700px); display:flex; flex-direction:column;"
    + " background:#FBF7F0; color:#2A2522; border:1px solid #E5DCCE; border-radius:14px;"
    + " box-shadow:0 12px 40px rgba(42,37,34,.22); overflow:hidden}"
    + ".hd{display:flex; align-items:center; gap:8px; padding:12px 14px; background:#F5EFE6; border-bottom:1px solid #E5DCCE}"
    + ".hd b{font-size:14px; font-weight:700}"
    + ".hd .sp{flex:1}"
    + ".xbtn{border:0; background:transparent; font-size:18px; line-height:1; color:#8B8178; cursor:pointer; padding:4px}"
    + ".xbtn:hover{color:#C2542B}"
    + ".bd{padding:14px; overflow-y:auto}"
    + ".muted{font-size:12px; color:#8B8178; line-height:1.6; word-break:keep-all}"
    + ".gate{padding:6px 2px 2px; text-align:center}"
    + ".gate .big{font-size:14px; font-weight:700; margin:6px 0 8px}"
    + ".gate p{font-size:12.5px; color:#5C544C; line-height:1.7; margin:0 0 12px; word-break:keep-all}"
    + ".btn{display:inline-block; width:100%; padding:11px 0; border:0; border-radius:9px; background:#C2542B; color:#fff;"
    + " font-size:13.5px; font-weight:700; cursor:pointer; text-align:center; text-decoration:none; margin-bottom:8px}"
    + ".btn:hover{background:#A84722}"
    + ".btn.ghost{background:#fff; color:#C2542B; border:1px solid #E0A98F}"
    + ".btn.ghost:hover{background:#FBF1EC}"
    + ".btn:disabled{opacity:.55; cursor:default}"
    + ".lbl{display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:700; margin:12px 0 6px}"
    + ".lbl .sp{flex:1}"
    + ".mini{border:1px solid #E5DCCE; background:#fff; color:#5C544C; border-radius:7px; font-size:11.5px; padding:4px 8px; cursor:pointer}"
    + ".mini:hover{border-color:#C2542B; color:#C2542B}"
    + "textarea{width:100%; background:#fff; border:1px solid #E5DCCE; border-radius:9px; padding:9px 11px;"
    + " font-size:13px; color:#2A2522; line-height:1.55; resize:vertical}"
    + "textarea:focus{outline:none; border-color:#C2542B}"
    + "textarea::placeholder{color:#B7AC9F}"
    + "#cmBody{min-height:96px}"
    + ".chips{display:flex; flex-wrap:wrap; gap:6px}"
    + ".chip{border:1px solid #E5DCCE; background:#fff; color:#5C544C; border-radius:999px; padding:6px 11px;"
    + " font-size:12px; cursor:pointer}"
    + ".chip.active{background:#C2542B; border-color:#C2542B; color:#fff; font-weight:700}"
    + ".hidden{display:none !important}"
    + ".srow{display:flex; gap:6px; margin-bottom:6px}"
    + ".srow textarea{flex:1; min-height:42px; height:42px; font-size:12.5px}"
    + ".srm{flex-shrink:0; width:30px; border:1px solid #E5DCCE; background:#fff; border-radius:8px; color:#B7AC9F;"
    + " font-size:16px; cursor:pointer}"
    + ".srm:hover{border-color:#D87B7B; color:#D87B7B}"
    + ".sadd{width:100%; padding:8px 0; background:transparent; border:1px dashed #E0A98F; border-radius:8px;"
    + " color:#C2542B; font-size:12px; font-weight:700; cursor:pointer}"
    + ".sadd:hover{background:rgba(194,84,43,.06)}"
    + ".lenrow{display:flex; align-items:center; gap:10px}"
    + "input[type=range]{flex:1; accent-color:#C2542B}"
    + ".lenval{font-size:12px; color:#5C544C; min-width:40px; text-align:right}"
    + ".err{color:#C0392B; font-size:12px; margin-top:8px; line-height:1.5; word-break:keep-all}"
    + ".card{background:#fff; border:1px solid #E5DCCE; border-radius:10px; padding:11px 12px; margin-top:8px}"
    + ".card p{margin:0 0 8px; font-size:13px; line-height:1.65; white-space:pre-wrap; word-break:break-word}"
    + ".copy{border:1px solid #E5DCCE; background:#F5EFE6; border-radius:7px; font-size:11.5px; padding:5px 10px; cursor:pointer; color:#5C544C}"
    + ".copy:hover{border-color:#C2542B; color:#C2542B}"
    + ".ft{padding:8px 14px; border-top:1px solid #E5DCCE; background:#F5EFE6; font-size:11px; color:#8B8178; text-align:center}";

  root.innerHTML = ""
    + "<style>" + css + "</style>"
    + "<div class='panel'>"
    + "  <div class='hd'><b>💬 블로그 댓글 도우미</b><span class='sp'></span><button class='xbtn' id='cmClose' aria-label='닫기'>✕</button></div>"
    + "  <div class='bd'>"
    + "    <div id='vLoading' class='gate'><p class='muted'>확인 중이에요...</p></div>"
    + "    <div id='vLogin' class='gate hidden'>"
    + "      <div class='big'>로그인이 필요해요</div>"
    + "      <p>체험단 매니저에 카카오 로그인 후,<br>북마크 버튼을 다시 눌러 주세요.</p>"
    + "      <a class='btn' id='btnOpenSite' target='_blank' rel='noopener'>체험단 매니저 열기</a>"
    + "      <button class='btn ghost' id='btnRecheck1'>로그인했어요, 다시 확인</button>"
    + "    </div>"
    + "    <div id='vPremium' class='gate hidden'>"
    + "      <div class='big'>💎 프리미엄 전용 기능이에요</div>"
    + "      <p>북마클릿 댓글 생성은 프리미엄에서 쓸 수 있어요.<br>지금은 <b>베타 기간</b>이라 설정에서 <b>무료로</b> 켤 수 있어요.</p>"
    + "      <a class='btn' id='btnOpenSettings' target='_blank' rel='noopener'>설정에서 프리미엄 켜기</a>"
    + "      <button class='btn ghost' id='btnRecheck2'>켰어요, 다시 확인</button>"
    + "    </div>"
    + "    <div id='vTool' class='hidden'>"
    + "      <div class='lbl'>본문<span class='sp'></span><button class='mini' id='btnReextract'>다시 가져오기</button></div>"
    + "      <textarea id='cmBody' placeholder='글 화면이 아니면 본문을 직접 붙여넣어 주세요.'></textarea>"
    + "      <div class='lbl'>말투</div>"
    + "      <div class='chips' id='cmChips'></div>"
    + "      <textarea id='cmCustom' class='hidden' style='margin-top:8px; min-height:40px;' placeholder='원하는 말투를 적어주세요. 예) 동네 단골손님처럼 푸근하게'></textarea>"
    + "      <div id='cmLearn' class='hidden' style='margin-top:8px;'>"
    + "        <p class='muted' style='margin:0 0 8px;'>제가 예전에 직접 단 댓글을 <b>5개 이상</b> 넣어 주세요. 형식이 다양할수록 더 정확해요.</p>"
    + "        <div id='cmSamples'></div>"
    + "        <button class='sadd' id='cmAddSample' type='button'>+ 댓글 추가</button>"
    + "      </div>"
    + "      <div class='lbl'>길이</div>"
    + "      <div class='chips' style='margin-bottom:8px'>"
    + "        <button class='chip' data-len='30'>짧게</button>"
    + "        <button class='chip active' data-len='60'>보통</button>"
    + "        <button class='chip' data-len='100'>길게</button>"
    + "      </div>"
    + "      <div class='lenrow'><input type='range' id='cmLen' min='20' max='150' step='5' value='60'><span class='lenval'><span id='cmLenVal'>60</span>자</span></div>"
    + "      <button class='btn' id='cmGo' style='margin-top:12px'>댓글 만들기</button>"
    + "      <div class='err hidden' id='cmErr'></div>"
    + "      <div id='cmResults'></div>"
    + "    </div>"
    + "  </div>"
    + "  <div class='ft'>체험단 매니저 · 프리미엄 전용</div>"
    + "</div>";

  function $(id) { return root.getElementById(id); }
  var elLoading = $("vLoading"), elLogin = $("vLogin"), elPremium = $("vPremium"), elTool = $("vTool");
  var elBody = $("cmBody"), elChips = $("cmChips"), elCustom = $("cmCustom"), elLearn = $("cmLearn");
  var elSamples = $("cmSamples"), elAddSample = $("cmAddSample");
  var elLen = $("cmLen"), elLenVal = $("cmLenVal"), elGo = $("cmGo"), elErr = $("cmErr"), elResults = $("cmResults");

  $("btnOpenSite").href = SITE + "/";
  $("btnOpenSettings").href = SITE + "/?open=settings";

  function show(view) {
    [elLoading, elLogin, elPremium, elTool].forEach(function (v) { v.classList.add("hidden"); });
    view.classList.remove("hidden");
  }

  /* ---------- 브릿지 통신 ---------- */
  var iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed; width:1px; height:1px; opacity:0; pointer-events:none; border:0; left:-9999px; top:-9999px;";
  iframe.src = BRIDGE_URL;
  var bridgeReady = new Promise(function (resolve) {
    iframe.addEventListener("load", function () { setTimeout(resolve, 150); });
    setTimeout(resolve, 5000); // 로드 이벤트를 놓쳐도 진행
  });
  (document.body || document.documentElement).appendChild(iframe);

  var seq = 0, pending = {};
  window.addEventListener("message", function (ev) {
    if (ev.origin !== SITE_ORIGIN) return;
    var m = ev.data || {};
    if (typeof m !== "object" || m.cm !== true || !m.id) return;
    var p = pending[m.id];
    if (!p) return;
    delete pending[m.id];
    clearTimeout(p.t);
    p.resolve(m);
  });
  function ask(msg, timeoutMs) {
    return bridgeReady.then(function () {
      return new Promise(function (resolve, reject) {
        var id = "m" + (++seq);
        msg.cm = true;
        msg.id = id;
        var t = setTimeout(function () { delete pending[id]; reject(new Error("timeout")); }, timeoutMs || 12000);
        pending[id] = { resolve: resolve, t: t };
        try { iframe.contentWindow.postMessage(msg, SITE_ORIGIN); }
        catch (e) { clearTimeout(t); delete pending[id]; reject(e); }
      });
    });
  }

  /* ---------- 상태(로그인/프리미엄) ---------- */
  var isAdmin = false;
  function applyStatus(st) {
    if (!st || st.loggedIn !== true) { show(elLogin); return; }
    if (st.premium !== true) { show(elPremium); return; }
    isAdmin = st.admin === true;
    buildChips();
    applyStyle(st.style);
    prefillBody(false);
    show(elTool);
  }
  function checkStatus() {
    show(elLoading);
    ask({ type: "status" }, 12000).then(applyStatus).catch(function () {
      show(elLogin); // 브릿지 응답 실패 시에도 로그인 안내로 (재확인 버튼으로 재시도 가능)
    });
  }
  $("btnRecheck1").addEventListener("click", checkStatus);
  $("btnRecheck2").addEventListener("click", checkStatus);

  /* ---------- 도구 UI ---------- */
  var toneId = "warm";
  function buildChips() {
    var defs = [
      { id: "warm", label: "친근하게" },
      { id: "polite", label: "정중하게" },
      { id: "lively", label: "발랄하게", adminOnly: true },
      { id: "plain", label: "담백하게" },
      { id: "custom", label: "직접 입력" },
      { id: "learn", label: "내 댓글로 학습" }
    ];
    elChips.innerHTML = "";
    defs.forEach(function (d) {
      if (d.adminOnly && !isAdmin) return;
      var b = document.createElement("button");
      b.className = "chip" + (d.id === toneId ? " active" : "");
      b.dataset.tone = d.id;
      b.textContent = d.label;
      b.addEventListener("click", function () {
        toneId = d.id;
        Array.prototype.forEach.call(elChips.children, function (c) { c.classList.toggle("active", c === b); });
        elCustom.classList.toggle("hidden", toneId !== "custom");
        elLearn.classList.toggle("hidden", toneId !== "learn");
        if (toneId === "learn") ensureSampleRows(MIN_SAMPLES);
        saveStyle();
      });
      elChips.appendChild(b);
    });
    // 저장된 톤이 관리자 전용(발랄)인데 일반 유저면 안전 폴백
    if (toneId === "lively" && !isAdmin) toneId = "warm";
  }
  function setActiveChip() {
    Array.prototype.forEach.call(elChips.children, function (c) {
      c.classList.toggle("active", c.dataset.tone === toneId);
    });
    elCustom.classList.toggle("hidden", toneId !== "custom");
    elLearn.classList.toggle("hidden", toneId !== "learn");
  }

  function addSampleRow(value) {
    var idx = elSamples.querySelectorAll(".srow").length;
    var row = document.createElement("div");
    row.className = "srow";
    var ta = document.createElement("textarea");
    ta.placeholder = SAMPLE_PLACEHOLDERS[idx % SAMPLE_PLACEHOLDERS.length];
    if (value) ta.value = value;
    ta.addEventListener("input", saveStyleSoon);
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "srm";
    rm.textContent = "×";
    rm.addEventListener("click", function () {
      row.remove();
      if (!elSamples.querySelector(".srow")) addSampleRow("");
      saveStyle();
    });
    row.appendChild(ta);
    row.appendChild(rm);
    elSamples.appendChild(row);
  }
  function collectSamples() {
    return Array.prototype.map.call(elSamples.querySelectorAll(".srow textarea"), function (t) { return t.value.trim(); })
      .filter(function (x) { return !!x; });
  }
  function ensureSampleRows(min) {
    var n = elSamples.querySelectorAll(".srow").length;
    while (n < min) { addSampleRow(""); n++; }
  }
  elAddSample.addEventListener("click", function () { addSampleRow(""); });

  /* ---------- 스타일 저장/복원 (사이트 도구와 공유) ---------- */
  var saveTimer = null;
  function saveStyle() {
    var st = { toneId: toneId, customTone: elCustom.value, samples: collectSamples() };
    ask({ type: "saveStyle", style: st }, 8000).catch(function () {});
  }
  function saveStyleSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveStyle, 600);
  }
  elCustom.addEventListener("input", saveStyleSoon);
  function applyStyle(saved) {
    if (saved && typeof saved.customTone === "string") elCustom.value = saved.customTone;
    elSamples.innerHTML = "";
    if (saved && Array.isArray(saved.samples)) {
      saved.samples.forEach(function (s) { if (s) addSampleRow(s); });
    }
    if (saved && typeof saved.toneId === "string" && (TONES[saved.toneId] || saved.toneId === "custom" || saved.toneId === "learn")) {
      toneId = saved.toneId;
    }
    if (toneId === "lively" && !isAdmin) toneId = "warm";
    setActiveChip();
    if (toneId === "learn") ensureSampleRows(MIN_SAMPLES);
  }

  /* ---------- 본문 ---------- */
  function prefillBody(force) {
    var p = extractPost();
    if (!p.text || p.text.length < 10) {
      if (force) { flashErr("본문을 찾지 못했어요. 블로그 글 화면인지 확인하거나, 본문을 직접 붙여넣어 주세요."); }
      return;
    }
    if (force || !elBody.value.trim()) { elBody.value = p.text; }
  }
  $("btnReextract").addEventListener("click", function () { prefillBody(true); });

  /* ---------- 길이 ---------- */
  var lenChips = root.querySelectorAll(".chip[data-len]");
  Array.prototype.forEach.call(lenChips, function (c) {
    c.addEventListener("click", function () {
      elLen.value = c.dataset.len;
      elLenVal.textContent = c.dataset.len;
      Array.prototype.forEach.call(lenChips, function (x) { x.classList.toggle("active", x === c); });
    });
  });
  elLen.addEventListener("input", function () {
    elLenVal.textContent = elLen.value;
    Array.prototype.forEach.call(lenChips, function (x) { x.classList.toggle("active", x.dataset.len === elLen.value); });
  });

  /* ---------- 생성 ---------- */
  function flashErr(msg) {
    elErr.textContent = msg;
    elErr.classList.remove("hidden");
  }
  function toneText() {
    if (toneId === "custom") return (elCustom.value.trim() || "자연스럽고 진솔한 존댓말");
    return TONES[toneId] || TONES.warm;
  }
  function copyText(t, btn) {
    function done() {
      var old = btn.textContent;
      btn.textContent = "복사됨!";
      setTimeout(function () { btn.textContent = old; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done).catch(function () { legacy(); });
    } else { legacy(); }
    function legacy() {
      var ta = document.createElement("textarea");
      ta.value = t;
      ta.style.cssText = "position:fixed; left:-9999px; top:0;";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      ta.remove();
    }
  }
  function renderResults(list) {
    elResults.innerHTML = "";
    list.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "card";
      var p = document.createElement("p");
      p.textContent = c;
      var btn = document.createElement("button");
      btn.className = "copy";
      btn.textContent = "복사";
      btn.addEventListener("click", function () { copyText(c, btn); });
      card.appendChild(p);
      card.appendChild(btn);
      elResults.appendChild(card);
    });
  }
  elGo.addEventListener("click", function () {
    elErr.classList.add("hidden");
    var text = elBody.value.trim();
    if (!text) { flashErr("본문이 비어 있어요. '다시 가져오기'를 누르거나 직접 붙여넣어 주세요."); return; }
    var msg = { type: "comment", text: text.slice(0, 8000), length: Number(elLen.value) || 60 };
    if (toneId === "learn") {
      var samples = collectSamples();
      if (samples.length < MIN_SAMPLES) {
        flashErr("더 정확한 분석을 위해 댓글을 " + MIN_SAMPLES + "개 이상 넣어 주세요. (지금 " + samples.length + "개)");
        return;
      }
      msg.styleSamples = samples;
    } else {
      msg.tone = toneText();
    }
    saveStyle();
    elGo.disabled = true;
    elGo.textContent = "만드는 중... (10~20초)";
    elResults.innerHTML = "";
    ask(msg, 90000).then(function (r) {
      elGo.disabled = false;
      elGo.textContent = "댓글 만들기";
      var d = r.data || {};
      if (r.status === 401) { show(elLogin); return; }
      if (r.status === 403 && d.code === "premium_required") { show(elPremium); return; }
      if (d.ok === true && Array.isArray(d.comments) && d.comments.length) { renderResults(d.comments); return; }
      flashErr(d.error || "댓글을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    }).catch(function () {
      elGo.disabled = false;
      elGo.textContent = "댓글 만들기";
      flashErr("응답이 없어요. 잠시 후 다시 시도해 주세요.");
    });
  });

  /* ---------- 열기/닫기 ---------- */
  $("cmClose").addEventListener("click", function () { host.style.display = "none"; });
  document.addEventListener("cm-cmt-toggle", function () {
    host.style.display = host.style.display === "none" ? "" : "none";
    if (host.style.display !== "none") { prefillBody(false); }
  });

  checkStatus();
})();
