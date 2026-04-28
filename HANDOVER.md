# dawn-dashboard 인수인계 문서

## 프로젝트 개요

`@dawn.town.music` 인스타그램 채널 콘텐츠 관리 대시보드.
YouTube에서 채널 감성에 맞는 영상을 자동 수집·스코어링하고, 인스타그램 업로드 콘텐츠를 관리하는 Next.js 웹앱.

- **배포 URL**: https://prut-ai.vercel.app
- **GitHub**: https://github.com/txme-team/prut
- **Supabase 프로젝트**: `cmlkzaumrhqfyjtdsgpj` (dawntown, ap-southeast-1)

---

## 기술 스택

- Next.js 16.2.4 (App Router, TypeScript)
- Tailwind CSS v4
- Supabase (PostgreSQL, REST API, service role key)
- Claude Haiku API (`claude-haiku-4-5-20251001`) — 채널핏 스코어링
- YouTube Data API v3
- Vercel (배포)

---

## 디렉토리 구조

```
dawn-dashboard/
├── app/
│   ├── layout.tsx              # 사이드바 + 메인 레이아웃
│   ├── globals.css             # CSS 변수 + Tailwind import
│   ├── page.tsx                # 루트 → /queue 리다이렉트
│   ├── queue/
│   │   ├── page.tsx            # YouTube 큐 (✅ 구현 완료)
│   │   └── actions.ts          # reserveVideo, hideVideo, restoreVideo
│   ├── sources/
│   │   ├── page.tsx            # 소스 관리 (✅ 구현 완료)
│   │   └── actions.ts          # createSource, updateSource, toggleSource, deleteSource, validateYouTube*
│   ├── pending/                # ❌ 미구현 (폴더 없음)
│   ├── reels/                  # ❌ 미구현 (폴더 없음)
│   ├── carousel/               # ❌ 미구현 (폴더 없음)
│   └── calendar/               # ❌ 미구현 (폴더 없음)
├── components/
│   ├── sidebar.tsx             # 좌측 네비게이션
│   ├── queue-card.tsx          # YouTube 큐 카드 컴포넌트
│   ├── queue-filters.tsx       # 큐 필터 (era, stars, sort, status)
│   ├── source-row.tsx          # 소스 목록 행
│   ├── source-form.tsx         # 소스 추가/수정 모달
│   └── source-add-button.tsx   # 소스 추가 버튼
├── lib/
│   ├── database.types.ts       # Supabase 타입 정의
│   ├── supabase.ts             # createServiceClient()
│   └── utils.ts                # cn() 유틸
├── dawn_monitor.js             # YouTube 수집 스크립트 (node로 실행)
├── .github/workflows/
│   └── dawn-monitor.yml        # 매일 KST 07:00 자동 수집 cron
├── .env.local                  # API 키 (gitignore됨)
└── vercel.json
```

---

## Supabase 테이블 구조

### `sources`
YouTube 수집 소스 목록.
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| name | text | 소스 이름 |
| type | enum | `handle` / `playlist` |
| source_value | text | @채널핸들 또는 재생목록ID |
| era | enum | `classic` / `modern` |
| is_active | boolean | 활성화 여부 |
| note | text? | 메모 |
| last_run_at | timestamp? | 마지막 수집 시각 |
| last_run_count | int? | 마지막 수집 건수 |

### `youtube_candidates`
수집된 YouTube 영상 후보.
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| video_id | text | YouTube video ID |
| title | text | 영상 제목 |
| channel | text | 채널명 |
| source_name | text | 수집 소스명 |
| era | enum | `classic` / `modern` |
| duration_sec | int | 영상 길이(초) |
| views / likes / comments | int | 통계 |
| like_rate / comment_rate | float | 비율 |
| published_at | timestamp? | 업로드 날짜 |
| thumbnail_url | text? | 썸네일 URL |
| score_viral | float | 바이럴 지수 (25%) |
| score_comment | float | 댓글 반응도 (20%) |
| score_fit | float | 채널핏 (20%) |
| score_season | float | 시즌 매칭 (15%) |
| score_fresh | float | 신선도 (10%) |
| final_score | float | 최종 점수 |
| stars | float | 별점 (1.0~5.0) |
| status | enum | `pending` / `reserved` / `hidden` |
| collected_at | timestamp | 수집 시각 |

### `seen_videos`
중복 수집 방지용 테이블.
| 컬럼 | 타입 |
|---|---|
| video_id | text (unique) |
| reserved_at | timestamp |

### `monitor_runs`
수집 실행 로그.
| 컬럼 | 타입 |
|---|---|
| run_at | timestamp |
| total_collected | int |
| total_filtered | int |
| total_rejected_fit | int |
| sources_run | int |
| error | text? |

---

## CSS 변수 (globals.css)

```css
--bg:           #0d0d0d
--surface:      #161616
--surface2:     #1e1e1e
--surface3:     #272727
--border:       #2e2e2e
--accent:       #c8a96e    /* 골드 */
--accent-dim:   rgba(200,169,110,0.15)
--text:         #e8e8e8
--text-muted:   #888888
--text-dim:     #555555
--green:        #4caf82
--red:          #e05c5c
--purple:       #9c7fe0
```

모든 컴포넌트는 `style={{ color: "var(--text)" }}` 형태의 인라인 스타일을 사용.
Tailwind는 레이아웃(`flex`, `grid`, `gap`, `rounded` 등)에만 사용.

---

## 알려진 버그 및 미해결 이슈

### 🔴 1. Tailwind CSS v4 빌드 문제 (최우선 수정 필요)
**증상**: Vercel 배포 후 padding, margin, font-size 등 Tailwind 유틸리티 클래스가 적용되지 않음. 로컬 dev 환경에서는 정상.

**원인**: Tailwind v4의 `@import "tailwindcss"` 방식에서 임의값 클래스(`text-[13px]`, `py-[5px]` 등)가 프로덕션 빌드 시 CSS에 포함되지 않는 문제.

**해결 방향**:
- 옵션 A: Tailwind v4 → v3 다운그레이드 (`tailwind.config.js` + `content` 경로 설정)
- 옵션 B: 임의값 클래스를 모두 인라인 style로 교체

추천은 **옵션 A** (다운그레이드). 변경 파일: `package.json`, `postcss.config.mjs`, `globals.css`, `tailwind.config.js` 신규 생성.

### 🟡 2. 미구현 페이지 4개
사이드바에 링크는 있으나 페이지 파일이 없어 404 발생.

**`/pending` — 업로드 대기**
- `youtube_candidates`에서 `status=reserved`인 영상 목록 표시
- queue-card와 유사한 UI, 되돌리기 버튼 포함
- 업로드 관점의 정보 강조 (썸네일, 제목, 채널, 별점)

**`/reels` — 릴스 생성**
- 예약 확정 영상 선택 → Claude API로 인스타그램 릴스 캡션 + 해시태그 자동 생성
- 채널 컨셉: 감성적인 올드팝/발라드, 새벽 감성, 그리움
- 생성 결과 복사 버튼 포함

**`/carousel` — 캐러셀 생성**
- 예약 확정 영상 선택 → Claude API로 인스타그램 캐러셀 슬라이드 문구(1~5장) 자동 생성
- 각 슬라이드별 문구 + 전체 캡션 + 해시태그
- 생성 결과 복사 버튼 포함

**`/calendar` — 캘린더**
- 예약 확정 영상을 월간 캘린더 뷰로 표시
- `collected_at` 기준으로 날짜 배치
- 날짜 클릭 시 해당 영상 미리보기 모달

---

## 채널 컨셉 (콘텐츠 생성 시 참고)

- 채널명: `@dawn.town.music`
- 슬로건: "22세기 라디오"
- 감성: 새벽, 그리움, 감성, 올드팝, 발라드
- ERA 비율: Classic 70% / Modern 30%
- 금지 장르: 아이돌 그룹, 댄스팝, 아이돌 발라드
- 채널핏 기준: score_fit >= 0.40 이상만 후보 등재

---

## 작업 재개 시 순서

1. **Tailwind v4 → v3 다운그레이드** (전체 UI 복구)
2. **`/pending` 페이지 구현** (가장 단순, queue 페이지 참고)
3. **`/calendar` 페이지 구현** (reserved 영상 월간 뷰)
4. **`/reels` 페이지 구현** (Claude API 연동)
5. **`/carousel` 페이지 구현** (Claude API 연동)
6. **GitHub push → Vercel 자동 배포 확인**

---

## 로컬 개발 환경

```bash
cd ~/Documents/eveln.dawntown/dawn-dashboard
npm run dev   # http://localhost:3000
```

수동 수집:
```bash
node dawn_monitor.js
```

GitHub push 후 Vercel 자동 배포됨 (main 브랜치 연동).
