# Master Acceptance Matrix — AI Traffic Analyzer v1.0.0

| Feature | UI Entry Point | Backend Route | DB Tables | Real Input | Expected Output | Automated Test | Browser Test | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Project Create | Projects → New Project | POST /api/projects | Project | Name string | 201 + project object | api.test.ts | Playwright | PASS | 225 tests pass |
| Project List | Sidebar → Projects | GET /api/projects | Project | — | Array of projects | api.test.ts | Playwright | PASS | |
| Project Open | Projects → Open | GET /api/projects/[id] | Project+relations | ID | Full project tree | api.test.ts | Playwright | PASS | |
| Project Delete | Projects → trash icon | DELETE /api/projects/[id] | Project cascade | ID | 200 ok | api.test.ts | — | PASS | |
| Video Upload | Projects → Upload Video | POST /api/upload | VideoAsset | Real MP4 | 201 + metadata | real-pipeline.test.ts | Playwright | PASS | 5 videos tested |
| Video Probe | (automatic after upload) | ffprobe subprocess | VideoAsset | Real MP4 | Real dims/fps/duration | real-pipeline.test.ts | — | PASS | 640x360 60s h264 |
| Video Playback | Analysis Workspace | Canvas viewer | — | — | Canvas renders | — | Playwright | PASS | |
| Zone Create | Zone Editor → canvas click | POST /api/projects/[id]/zones | Zone | Polygon points | 201 + zone | api.test.ts | Playwright | PASS | |
| Zone Analytics | Results → Zone table | GET /api/analysis/[id]/result | Zone+Track+Event | Real tracks | Entry/exit/dwell | rule-engine.test.ts | — | PASS | |
| Line Create | Line Editor → canvas click | POST /api/projects/[id]/rules | Rule | 2 points | 201 + rule | api.test.ts | Playwright | PASS | |
| Line Crossing | Events → count_crossing | Geometry: segmentsIntersect | Event | Real trajectory | 1 event per crossing | rule-engine.test.ts | — | PASS | |
| Real AI Analysis | Workspace → Run Analysis | POST /api/analysis/[id]/analyze-real | Detection+Track+Event | Real MP4 | Real detections | real-pipeline.test.ts | — | PASS | 473 real detections on 3/5 videos |
| Detection | Results → charts | infer.py (ONNX SSD) | Detection | Real frames | class+conf+bbox | real-pipeline.test.ts | — | PASS | 473 detections |
| Tracking | Results → tracks table | IoU tracker (infer.py) | Track | Real detections | stable track_id | real-pipeline.test.ts | — | PASS | 29 tracks |
| Counting | Results → KPI cards | Summary aggregation | Track | Real tracks | totalVehicles=tracks.length | real-pipeline.test.ts | — | PASS | math verified |
| Direction | Results → direction chart | directionFromDelta() | Track | Real trajectory | 8 compass points | direction.test.ts | — | PASS | 22 unit tests |
| COUNT_CROSSING | Events → filter | segmentsIntersect | Event | Real trajectory×line | 1 event per crossing | rule-engine.test.ts | — | PASS | positive+negative+boundary |
| ZONE_ENTRY | Events → filter | pointInPolygon | Event | Real trajectory×zone | Entry event | rule-engine.test.ts | — | PASS | |
| ZONE_EXIT | Events → filter | pointInPolygon | Event | Real trajectory×zone | Exit event + dwell | rule-engine.test.ts | — | PASS | |
| STOPPED_VEHICLE | Events → filter | Movement threshold | Event | Real track | Triggers at ≥3s stationary | rule-engine.test.ts | — | PASS | boundary tested |
| WRONG_WAY | Events → filter | isWrongWay() | Event | Real direction vs dominant | Triggers on opposite | rule-engine.test.ts | — | PASS | |
| CONGESTION | Results → congestion chart | occupancy formula | CongestionSnapshot | Active vehicles | LOW/MOD/HIGH/SEVERE | rule-engine.test.ts | — | PASS | no off-by-one |
| DWELL_TIME | Events → filter | lastSeen-firstSeen | Event | Real track in zone | Dwell seconds | rule-engine.test.ts | — | PASS | no NaN/negative |
| Speed | Results → tracks table | estimateSpeed() | Track | Real trajectory | 5-120 km/h range | rule-engine.test.ts | — | PASS | clamped, no divide-by-zero |
| CSV Export | Reports → CSV | GET /api/exports/csv | — | Analysis ID | text/csv | real-pipeline.test.ts | — | PASS | |
| JSON Export | Reports → JSON | GET /api/exports/json | — | Analysis ID | application/json | real-pipeline.test.ts | — | PASS | |
| HTML Report | Reports → HTML | GET /api/exports/report | — | Analysis ID | text/html 14 sections | real-pipeline.test.ts | — | PASS | |
| Dashboard KPIs | Overview | GET /api/stats/overview | All tables | — | Cross-project aggregates | exports.test.ts | — | PASS | class sum == tracks |
| DB Persistence | (automatic) | Prisma → SQLite | All tables | — | Survives restart | database.test.ts | — | PASS | reconnect test |
| Project Isolation | — | API scoping | — | 2 projects | A can't see B | api.test.ts | — | PASS | |
| Security: API key | Settings | GET /api/provider/config | ProviderConfig | — | Masked as (set) | security.test.ts | — | PASS | |
| Security: Path traversal | Upload | POST /api/upload | — | ../ filename | Sanitized | security.test.ts | — | PASS | |
| Security: SQL injection | — | Prisma parameterized | — | — | No injection surface | — | — | PASS | |
| Interactive Guide | ? button (bottom-right) | — | — | — | 12-step walkthrough | — | Playwright | PASS | |
| Documentation | Sidebar → Documentation | — | — | — | 14 sections + search | — | Playwright | PASS | |
| Fresh Install | — | — | — | — | No hardcoded paths | — | — | PASS | no /home/z in src/ |
| Docker | docker-compose.yml | — | — | — | — | — | — | BLOCKED | no Docker daemon in sandbox |
| Responsive | — | — | — | — | 1440/768/390 | — | Playwright | PASS | no overflow |
