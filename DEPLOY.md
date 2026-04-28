# Dawn Dashboard — 배포 가이드

## 1. GitHub 저장소 생성

```bash
cd dawn-dashboard
git init
git add .
git commit -m "initial: dawn-dashboard v1"
# GitHub에서 새 저장소 생성 후
git remote add origin https://github.com/<YOUR_USERNAME>/dawn-dashboard.git
git push -u origin main
```

---

## 2. Vercel 배포

1. https://vercel.com 접속 → "Add New Project"
2. GitHub 저장소 연결
3. **Root Directory**: `dawn-dashboard` (저장소 루트에 프로젝트가 있으면 비워둠)
4. Framework Preset: **Next.js** (자동 감지)

### Environment Variables 설정

Vercel 프로젝트 Settings → Environment Variables에 아래 항목 추가:

| 변수명 | 값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cmlkzaumrhqfyjtdsgpj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _(anon key)_ |
| `SUPABASE_SERVICE_ROLE_KEY` | _(service role key)_ |
| `YOUTUBE_API_KEY` | _(YouTube Data API v3 key)_ |
| `ANTHROPIC_API_KEY` | _(Anthropic API key)_ |

5. "Deploy" 클릭

---

## 3. GitHub Actions — 자동 수집 설정

`.github/workflows/dawn-monitor.yml` 파일이 포함되어 있습니다.
매일 한국시간 오전 7시(UTC 22:00)에 자동으로 `dawn_monitor.js`를 실행합니다.

GitHub 저장소 Settings → Secrets and variables → Actions에 아래 추가:

| Secret 이름 | 값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `ANTHROPIC_API_KEY` | Anthropic API key |

수동 실행: GitHub 저장소 → Actions → "Dawn Monitor" → "Run workflow"

---

## 4. 로컬 개발

```bash
npm install
npm run dev   # http://localhost:3000
```

수동 수집:
```bash
node dawn_monitor.js
```
