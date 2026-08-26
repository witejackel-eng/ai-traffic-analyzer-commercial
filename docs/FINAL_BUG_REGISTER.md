# Final Bug Register — AI Traffic Analyzer v1.0.0

| ID | Severity | Component | Reproduction | Expected | Actual | Root Cause | Fix | Regression Test | Status |
|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | Critical | API | GET /api/provider/config | API key masked | Raw key leaked in response | GET handler returned raw config without masking | Added `apiKey: cfg.apiKey ? "(set)" : null` to GET response | security.test.ts: "GET /api/provider/config never returns the raw API key" | RESOLVED |
| BUG-002 | High | API | DELETE /api/projects/nonexistent | 404 Not Found | 500 Prisma P2025 (stack trace) | DELETE handlers had no try/catch | Wrapped in try/catch returning 404 | api.test.ts: "DELETE /api/projects/<nonexistent> returns 404" | RESOLVED |
| BUG-003 | High | Upload | Upload ../../../etc/passwd.mp4 | Sanitized filename | Filename contained `..` sequences | Sanitizer replaced `/` with `_` but left `..` intact | Added basename extraction + `..` collapse + leading-dot strip | security.test.ts: "rejects path-traversal filenames" | RESOLVED |
| BUG-004 | High | Provider | generic-http null detection in array | Crash: "Cannot read properties of null" | mapResponse crashed on null array elements | No null guard before `.map()` | Added `.filter((d): d is RawDetection => d != null)` | generic-http-provider.test.ts: "filters out null/invalid detections" | RESOLVED |
| BUG-005 | High | Provider | Detection with confidence > 1 or < 0 | Clamped to [0,1] | Invalid confidence values passed through | No clamping in mapResponse | Added `conf = Math.max(0, Math.min(1, conf))` + reject non-finite | generic-http-provider.test.ts: same test | RESOLVED |
| BUG-006 | High | Config | Settings change provider → restart required | Hot-swap | Cached singleton not refreshed | `config` cached env vars at import time | Converted to lazy getters | All generic-http tests | RESOLVED |
| BUG-007 | High | Upload | Upload 4K video | Completes in <30s | Hangs at "Uploading… 100%" for minutes | Buffer.from(arrayBuffer) loaded entire file + ffprobe blocked response | Stream-to-disk + background probe + ultra-fast ffprobe | real-pipeline.test.ts: "uploads a real MP4" | RESOLVED |
| BUG-008 | High | Build | Vercel deploy | Works | HTTP 500 on project creation | output:"standalone" + SQLite file path on serverless | Removed standalone, added Postgres support + vercel-build script | — | RESOLVED |
| BUG-009 | Medium | UI | Theme toggle icon | No hydration error | SSR/CSR hydration mismatch | Sun/Moon icon rendered differently on server vs client | Render both icons, toggle via CSS dark: classes | Playwright: "no hydration errors on initial load" | RESOLVED |
| BUG-010 | Medium | Upload | Upload route missing | POST /api/upload works | Route file absent from repo | File was not committed | Recreated with full validation | security.test.ts: all 4 upload tests | RESOLVED |
| BUG-011 | Low | App-shell | Collapsible sidebar | No hydration error | isMobile state change on mount | useEffect setState caused hydration warning | suppressHydrationWarning + deferred mobile check | — | RESOLVED |

**No critical or high-severity issues remain unresolved.**
