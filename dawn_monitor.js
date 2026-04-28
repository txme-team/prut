'use strict';
/**
 * dawn_monitor.js  ─  Supabase 연동 버전
 * ─────────────────────────────────────────────────────────────────────────────
 * YouTube Data API v3 + Claude Haiku 채널핏 평가 + 5요소 스코어링
 * 수집 결과를 Supabase youtube_candidates 테이블에 upsert
 * seen_videos 테이블로 중복 방지
 *
 * 사용법:
 *   node dawn_monitor.js
 *   (dawn-dashboard 폴더 안에서 실행. .env.local 자동 로드)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

// ─── .env.local 로드 ──────────────────────────────────────────────────────────
(function loadEnv() {
  const candidates = [
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '.env'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
    break;
  }
})();

const YT_KEY       = process.env.YOUTUBE_API_KEY;
const CLAUDE_KEY   = process.env.ANTHROPIC_API_KEY;
const SB_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!YT_KEY)  { console.error('❌ YOUTUBE_API_KEY 없음'); process.exit(1); }
if (!SB_URL || !SB_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 없음');
  process.exit(1);
}

// ─── Supabase REST 헬퍼 ───────────────────────────────────────────────────────
function sbFetch(method, endpoint, body) {
  const url  = new URL(SB_URL + '/rest/v1/' + endpoint);
  const opts = {
    hostname: url.hostname,
    path:     url.pathname + url.search,
    method,
    headers: {
      'apikey':         SB_KEY,
      'Authorization':  'Bearer ' + SB_KEY,
      'Content-Type':   'application/json',
      'Prefer':         'return=representation',
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : null }); }
        catch (e) { reject(new Error('Supabase 파싱 실패: ' + raw.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function sbGet(endpoint) {
  const r = await sbFetch('GET', endpoint, null);
  return r.data || [];
}

async function sbUpsert(table, rows, onConflict) {
  const endpoint = table + '?on_conflict=' + onConflict;
  const r = await sbFetch('POST', endpoint, rows);
  if (r.status >= 400) {
    console.error('  ⚠️  Supabase upsert 오류 (' + r.status + '):', JSON.stringify(r.data).slice(0, 200));
  }
  return r;
}

async function sbInsert(table, row) {
  const r = await sbFetch('POST', table, row);
  if (r.status >= 400) {
    console.error('  ⚠️  Supabase insert 오류 (' + r.status + '):', JSON.stringify(r.data).slice(0, 200));
  }
  return r;
}

// ─── era 비율 ─────────────────────────────────────────────────────────────────
const ERA_RATIO = { classic: 7, modern: 3 };

// ─── 필터 기준 ────────────────────────────────────────────────────────────────
const MIN_VIEWS        = 200000;
const MIN_LIKE_RATE    = 0.005;
const MAX_DURATION_SEC = 600;
const MIN_CONCEPT_FIT  = 0.40;   // Claude 채널핏 40% 미만 제외

// ─── 계절 키워드 ──────────────────────────────────────────────────────────────
const SEASON_KEYWORDS = {
  spring: ['봄','벚꽃','꽃','설레','편지','청춘','새벽','향기','나비','따스','4월','5월','3월','봄비','봄날','꽃잎','개나리','진달래'],
  summer: ['여름','바다','파도','태양','열정','휴가','뜨거','시원','7월','8월','6월','모래','해변'],
  autumn: ['가을','낙엽','이별','외로움','쓸쓸','단풍','바람','10월','11월','9월','갈대','노을','코스모스'],
  winter: ['겨울','눈','크리스마스','그리움','차갑','하얀','12월','1월','2월','추위','눈송이','캐럴'],
};

function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('JSON 파싱 실패: ' + raw.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1]||0)*3600) + (parseInt(m[2]||0)*60) + parseInt(m[3]||0);
}

function fmtDuration(sec) {
  return Math.floor(sec/60) + ':' + String(sec%60).padStart(2,'0');
}

function fmtViews(n) {
  return n >= 10000 ? (n/10000).toFixed(1)+'만' : n.toLocaleString();
}

function toStarDisplay(stars) {
  const full = Math.floor(stars);
  const half = (stars - full) >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

// ─── Claude API — 채널핏 배치 평가 ────────────────────────────────────────────
async function getConceptFitScores(videos) {
  if (!CLAUDE_KEY) {
    console.log('  ⚠️  ANTHROPIC_API_KEY 없음 → 채널핏 필터 비활성 (전체 통과)');
    return videos.map(() => 1.0);
  }
  if (videos.length === 0) return [];

  const list = videos.map((v, i) =>
    (i+1) + '. "' + v.title + '" [채널: ' + v.channel + ']'
  ).join('\n');

  const prompt =
    '당신은 인스타그램 음악 채널 "@dawn.town.music"의 채널핏 심사관입니다.\n\n' +
    '【채널 정체성】\n' +
    '채널 이름: "22세기 라디오"\n' +
    '콘셉트: 혼자 듣는 새벽 감성 음악. 조용하고 깊은 감정. 혼자만의 공간에서 흘러나오는 음악.\n' +
    '타겟: 20~40대 한국인, 혼자 밤에 감성에 잠기는 사람들\n\n' +
    '【가장 중요한 규칙 — 반드시 0.1 이하 부여】\n' +
    '아래 유형에 해당하면 점수를 절대로 0.2 이상 주지 마세요:\n' +
    '  · 아이돌 그룹 (멤버 2명 이상으로 구성된 그룹)\n' +
    '    예: BTS, 방탄소년단, 블랙핑크, BLACKPINK, 소녀시대, 엑소, EXO,\n' +
    '        키스오브라이프, KISS OF LIFE, aespa, 에스파, 뉴진스, NewJeans,\n' +
    '        (G)I-DLE, 트와이스, TWICE, 샤이니, SHINee, 세븐틴, 투피엠 등\n' +
    '  · 댄스팝 / 클럽 비트 / 힙합 / 랩 위주 곡\n' +
    '  · 신나고 에너지 넘치는 응원가, 파티곡\n\n' +
    '【높은 점수 (0.7~1.0) 기준】\n' +
    '  · 솔로 발라드 가수 (신승훈, 변진섭, 이승철, 이문세, 조용필, 김범수, 박효신,\n' +
    '    임재범, 이소라, 성시경, 김광석, 양희은, 이선희, 나얼, 박정현 등)\n' +
    '  · 1990~2000년대 감성 팝/발라드 그룹 (듀오 포함)\n' +
    '  · 감성적이고 잔잔한 R&B (소울, 재즈 팝 포함)\n\n' +
    '【평가 대상】\n' + list + '\n\n' +
    '반드시 JSON 숫자 배열만 반환하세요. 순서 유지. 설명 없이 숫자만.\n' +
    '예시: [0.95, 0.05, 0.8, 0.1, 0.7]';

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise(resolve => {
    const opts = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const data  = JSON.parse(raw);
          if (data.error) {
            console.log('  ⚠️  Claude API 오류: ' + data.error.message + ' → 필터 비활성');
            return resolve(videos.map(() => 1.0));
          }
          const text  = (data.content?.[0]?.text) || '[]';
          const match = text.match(/\[[\d.,\s]+\]/);
          if (!match) {
            console.log('  ⚠️  Claude 응답 형식 오류 → 필터 비활성');
            return resolve(videos.map(() => 1.0));
          }
          const scores = JSON.parse(match[0]);
          while (scores.length < videos.length) scores.push(1.0);
          resolve(scores.slice(0, videos.length));
        } catch (e) {
          console.log('  ⚠️  Claude 파싱 실패 → 필터 비활성');
          resolve(videos.map(() => 1.0));
        }
      });
    });
    req.on('error', () => {
      console.log('  ⚠️  Claude 연결 실패 → 필터 비활성');
      resolve(videos.map(() => 1.0));
    });
    req.write(body);
    req.end();
  });
}

// ─── 5요소 스코어링 + 채널핏 하드 필터 ────────────────────────────────────────
async function scoreAndRank(candidates) {
  if (candidates.length === 0) return [];

  const season    = getCurrentSeason();
  const seasons   = ['spring','summer','autumn','winter'];
  const oppSeason = seasons[(seasons.indexOf(season)+2)%4];
  const seasonKws = SEASON_KEYWORDS[season]    || [];
  const oppKws    = SEASON_KEYWORDS[oppSeason] || [];

  // ─ Claude 채널핏 배치 평가 ─
  console.log('\n  🤖 Claude 채널핏 평가 중... (' + candidates.length + '개)');
  const fitScores = await getConceptFitScores(candidates);

  // ─ 하드 필터 ─
  const passed = [];
  const rejected = [];
  candidates.forEach((c, i) => {
    const fit = Math.min(Math.max(fitScores[i] ?? 1.0, 0), 1);
    c._fit = fit;
    const pct  = Math.round(fit * 100);
    const icon = fit >= 0.7 ? '🟢' : fit >= 0.4 ? '🟡' : '🔴';
    if (fit >= MIN_CONCEPT_FIT) {
      passed.push(c);
      console.log('  ' + icon + ' [' + pct + '%] ' + c.title.slice(0, 40));
    } else {
      rejected.push(c);
      console.log('  ' + icon + ' [' + pct + '%] ✗ 제외 — ' + c.title.slice(0, 36));
    }
  });

  console.log('\n  ✅ 채널핏 필터: ' + passed.length + '개 통과 / ' + rejected.length + '개 제외');
  if (rejected.length) {
    console.log('  📋 제외 목록:');
    rejected.forEach(c => console.log('     · ' + c.title.slice(0, 40) + ' [' + Math.round(c._fit*100) + '%]'));
  }

  if (passed.length === 0) return [];

  const maxViews = passed.reduce((mx, c) => Math.max(mx, c.views), 1);
  const maxLog   = Math.log10(Math.max(maxViews, 10));

  passed.forEach(c => {
    // ① 바이럴
    const viewsNorm    = Math.log10(Math.max(c.views, 10)) / maxLog;
    const likeRateNorm = Math.min((c.likes / Math.max(c.views, 1)) / 0.05, 1);
    c._viral   = viewsNorm * 0.6 + likeRateNorm * 0.4;
    // ② 댓글 반응도 (0.3% = 만점)
    c._comment = Math.min((c.comments / Math.max(c.views, 1)) / 0.003, 1);
    // ④ 시즌 매칭
    const t = c.title;
    c._season  = seasonKws.some(kw => t.includes(kw)) ? 1.0
               : oppKws.some(kw => t.includes(kw))    ? 0.1 : 0.5;
    // ⑤ 신선도 (10년 기준)
    const days = (Date.now() - new Date(c.publishedAt).getTime()) / 86400000;
    c._fresh   = Math.max(0, 1 - days / 3650);

    c._base    = c._viral*0.25 + c._comment*0.20 + c._fit*0.20 + c._season*0.15 + c._fresh*0.10;
  });

  // ⑥ 다양성 보정
  passed.sort((a, b) => b._base - a._base);
  const chCount = {};
  passed.forEach(c => {
    chCount[c.channel] = (chCount[c.channel] || 0) + 1;
    const nth    = chCount[c.channel];
    const divAdj = nth === 1 ? 0.10 : nth === 2 ? 0.0 : -0.05 * (nth - 2);
    c.finalScore   = Math.min(1, Math.max(0, c._base + divAdj));
    c.score100     = Math.round(c.finalScore * 100);
    const raw      = c.finalScore * 5;
    c.stars        = Math.max(1, Math.round(raw * 2) / 2);
    c.starsDisplay = toStarDisplay(c.stars);
    c.scoreDetail  = [
      '바이럴 '  + Math.round(c._viral*100),
      '댓글 '    + Math.round(c._comment*100),
      '채널핏 '  + Math.round(c._fit*100),
      '시즌 '    + Math.round(c._season*100),
      '신선도 '  + Math.round(c._fresh*100),
    ].join(' · ');
  });

  passed.sort((a, b) => b.finalScore - a.finalScore);
  return passed;
}

// ─── YouTube API ──────────────────────────────────────────────────────────────
async function resolveHandle(handle) {
  const data = await fetchJSON(
    'https://www.googleapis.com/youtube/v3/channels'
    + '?part=contentDetails&forHandle=' + encodeURIComponent(handle) + '&key=' + YT_KEY
  );
  if (!data.items?.length) return null;
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function fetchPlaylistIds(playlistId, maxItems) {
  maxItems = maxItems || 50;
  const ids = [];
  let pageToken = '';
  while (ids.length < maxItems) {
    const data = await fetchJSON(
      'https://www.googleapis.com/youtube/v3/playlistItems'
      + '?part=contentDetails&playlistId=' + encodeURIComponent(playlistId)
      + '&maxResults=50&pageToken=' + pageToken + '&key=' + YT_KEY
    );
    if (data.error) { console.log('  ⚠️  ' + data.error.message); break; }
    if (!data.items) break;
    data.items.forEach(item => {
      const vid = item.contentDetails?.videoId;
      if (vid) ids.push(vid);
    });
    if (!data.nextPageToken || ids.length >= maxItems) break;
    pageToken = data.nextPageToken;
  }
  return ids.slice(0, maxItems);
}

async function fetchVideoDetails(videoIds) {
  const results = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i+50).join(',');
    const data  = await fetchJSON(
      'https://www.googleapis.com/youtube/v3/videos'
      + '?part=snippet,statistics,contentDetails&id=' + batch + '&key=' + YT_KEY
    );
    if (data.items) results.push(...data.items);
  }
  return results;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  const runStats = { total_collected: 0, total_filtered: 0, total_rejected_fit: 0, sources_run: 0, error: null };

  // 1. Supabase에서 소스 목록 로드
  console.log('📋 소스 목록 로드 중...');
  const sources = await sbGet('sources?is_active=eq.true&order=created_at.asc');
  if (!sources.length) { console.error('❌ 활성 소스가 없습니다.'); process.exit(1); }
  console.log('  ✅ ' + sources.length + '개 소스 로드 완료');

  // 2. seen_videos 로드 (중복 방지)
  const seenRows = await sbGet('seen_videos?select=video_id');
  const seenIds  = new Set(seenRows.map(r => r.video_id));
  console.log('  📌 예약 확정 영상: ' + seenIds.size + '개 제외 예정');

  // 3. 소스별 수집
  const candidates = [];
  for (const src of sources) {
    console.log('\n📡 [' + src.name + '] (' + src.era + ') 수집 중...');
    runStats.sources_run++;

    let playlistId = null;
    if (src.type === 'handle') {
      playlistId = await resolveHandle(src.source_value);
      if (!playlistId) { console.log('  ⚠️  채널 없음: ' + src.source_value); continue; }
    } else {
      playlistId = src.source_value;
    }

    const videoIds = await fetchPlaylistIds(playlistId, 50);
    if (!videoIds.length) { console.log('  ⚠️  영상 없음'); continue; }

    const videos = await fetchVideoDetails(videoIds);
    let added = 0;

    videos.forEach(v => {
      const id          = v.id;
      const title       = v.snippet?.title       || '';
      const channel     = v.snippet?.channelTitle || '';
      const publishedAt = v.snippet?.publishedAt  || new Date().toISOString();
      const thumb       = v.snippet?.thumbnails?.medium?.url || '';
      const views       = parseInt(v.statistics?.viewCount    || 0);
      const likes       = parseInt(v.statistics?.likeCount    || 0);
      const comments    = parseInt(v.statistics?.commentCount || 0);
      const duration    = parseDuration(v.contentDetails?.duration || '');
      const likeRate    = views > 0 ? likes / views : 0;

      if (seenIds.has(id))             return;
      if (views    < MIN_VIEWS)        return;
      if (likeRate < MIN_LIKE_RATE)    return;
      if (duration > MAX_DURATION_SEC) return;
      if (duration < 61)               return; // 쇼츠 제외

      candidates.push({
        id, title, channel,
        era:          src.era,
        source_name:  src.name,
        publishedAt,
        views, likes, comments,
        likeRate:    parseFloat((likeRate * 100).toFixed(4)),
        commentRate: views > 0 ? parseFloat(((comments / views) * 100).toFixed(4)) : 0,
        durationSec:  duration,
        thumb,
        url: 'https://www.youtube.com/watch?v=' + id,
      });
      added++;
    });

    // 소스 last_run 업데이트
    await sbFetch('PATCH', 'sources?id=eq.' + src.id, {
      last_run_at:    new Date().toISOString(),
      last_run_count: added,
    });

    console.log('  ✅ 조건 통과: ' + added + '개 (누적 ' + candidates.length + '개)');
  }

  runStats.total_collected = candidates.length;

  // 4. 스코어링 + 채널핏 필터
  console.log('\n🧮 스코어링 중...');
  const scored = await scoreAndRank(candidates);
  runStats.total_rejected_fit = candidates.length - scored.length;
  runStats.total_filtered     = scored.length;

  // 5. era 비율 적용 (TOP 10 선출)
  const classicPool = scored.filter(c => c.era === 'classic');
  const modernPool  = scored.filter(c => c.era === 'modern');
  const classicPick = classicPool.slice(0, ERA_RATIO.classic);
  const modernPick  = modernPool.slice(0,  ERA_RATIO.modern);
  const deficit     = (ERA_RATIO.classic + ERA_RATIO.modern) - classicPick.length - modernPick.length;
  const fallback    = deficit > 0
    ? scored.filter(c => !classicPick.includes(c) && !modernPick.includes(c)).slice(0, deficit)
    : [];
  const top10 = [...classicPick, ...modernPick, ...fallback]
    .sort((a, b) => b.finalScore - a.finalScore);

  console.log('\n🏆 최종 추천 TOP ' + top10.length + ':');
  top10.forEach((c, i) => {
    console.log('  ' + (i+1) + '. [' + c.starsDisplay + ' ' + c.stars + '★] [' + c.era + '] ' + c.title.slice(0, 38));
  });

  // 6. Supabase youtube_candidates upsert
  if (scored.length > 0) {
    console.log('\n💾 Supabase에 저장 중... (' + scored.length + '개)');
    const rows = scored.map(c => ({
      video_id:      c.id,
      title:         c.title,
      channel:       c.channel,
      source_name:   c.source_name,
      era:           c.era,
      duration_sec:  c.durationSec,
      views:         c.views,
      likes:         c.likes,
      comments:      c.comments,
      like_rate:     c.likeRate,
      comment_rate:  c.commentRate,
      published_at:  c.publishedAt,
      thumbnail_url: c.thumb,
      score_viral:   parseFloat(c._viral.toFixed(3)),
      score_comment: parseFloat(c._comment.toFixed(3)),
      score_fit:     parseFloat(c._fit.toFixed(3)),
      score_season:  parseFloat(c._season.toFixed(3)),
      score_fresh:   parseFloat(c._fresh.toFixed(3)),
      final_score:   parseFloat(c.finalScore.toFixed(3)),
      stars:         c.stars,
      status:        'pending',
    }));

    // 50개씩 나눠서 upsert
    for (let i = 0; i < rows.length; i += 50) {
      await sbUpsert('youtube_candidates', rows.slice(i, i+50), 'video_id');
    }
    console.log('  ✅ Supabase 저장 완료');
  }

  // 7. monitor_runs 기록
  await sbInsert('monitor_runs', runStats);

  // 8. 디버그용 HTML 리포트 (로컬 확인용)
  const now     = new Date();
  const dateStr = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0');
  const htmlPath = path.join(__dirname, 'dawn_queue_' + dateStr + '.html');

  function fitColor(fit) {
    return fit >= 0.7 ? '#4caf82' : fit >= 0.4 ? '#c8a96e' : '#e05c5c';
  }

  const cards = top10.map((c, i) => {
    const t      = c.title.replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fitPct = Math.round((c._fit||0)*100);
    const fitCol = fitColor(c._fit||0);
    return `<a href="${c.url}" target="_blank" class="card">
  <div class="rank">#${i+1}</div>
  <img src="${c.thumb}" alt="" loading="lazy">
  <div class="info">
    <div class="stars" style="color:${c.stars>=4.5?'#f5c518':c.stars>=3.5?'#c8a96e':'#888'}">${c.starsDisplay} ${c.stars.toFixed(1)}</div>
    <div class="title">${t}</div>
    <div class="sub">${c.channel} · ${c.publishedAt.slice(0,4)} · ${c.era}</div>
    <div class="fit-row"><span style="color:${fitCol};font-size:11px;font-weight:700;">채널핏 ${fitPct}%</span></div>
    <div class="detail">${c.scoreDetail}</div>
  </div>
</a>`;
  }).join('\n');

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>Dawn Queue ${dateStr}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#0f0f0f;color:#e0e0e0;padding:24px}
h1{font-size:18px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.card{background:#1c1c1c;border-radius:10px;overflow:hidden;text-decoration:none;color:inherit;position:relative;display:flex;flex-direction:column}
.card img{width:100%;aspect-ratio:16/9;object-fit:cover}
.rank{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.8);color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px}
.info{padding:10px;flex:1}
.stars{font-size:13px;font-weight:700;margin-bottom:3px}
.title{font-size:12px;font-weight:600;margin-bottom:2px}
.sub{font-size:10px;color:#888}
.fit-row{margin:4px 0 2px}
.detail{font-size:9px;color:#555}
</style></head><body>
<h1>🎵 Dawn Queue ${dateStr} — TOP ${top10.length} / 전체 ${scored.length}개 통과</h1>
<div class="grid">${cards}</div>
</body></html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('\n🌐 HTML 리포트: dawn_queue_' + dateStr + '.html');
  console.log('✅ 완료! Supabase + 로컬 리포트 모두 저장됨');
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
