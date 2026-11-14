# BrewLite2 — Mục lục hồ sơ Assignment 2

> **Hướng dẫn cho giảng viên/người nghiệm thu.** Tài liệu này dẫn tới các tạo phẩm theo *BrewLite – Assignment 2: Requirements to Deployment, ver. 1.0* (mục 3–9), không thay thế SRS, ma trận truy vết hoặc biên bản Sprint.
>
> **Trạng thái:** Đã có source, UML, tài liệu CI/CD và kết quả triển khai. Link video, biên bản nhóm đã xác nhận, kiểm tra mạng database và GitHub Release cuối kỳ vẫn cần hoàn thiện trước khi đóng Gate Task 5.

## 1. Cấu trúc repository

| Thư mục/tệp | Nội dung | Quy ước |
| --- | --- | --- |
| [`apps/web/`](../apps/web/) | Frontend Next.js, mobile-first | Mã nguồn giao diện và nghiệp vụ phía client |
| [`apps/api/`](../apps/api/) | Backend NestJS, Prisma và migrations | Không commit `.env`, DB dump hoặc token |
| [`docs/requirements/`](requirements/) | Task 1: bối cảnh, SRS, use-case | Giữ nguyên các mã FR/NFR/AC đã ban hành |
| [`docs/diagrams/`](diagrams/) | Task 2 và deployment của Task 3 | Mỗi sơ đồ chính có cả **`.puml` + `.svg`** |
| [`docs/architecture/`](architecture/) | Task 3: kiến trúc, ADR | ADR-003 là quyết định lịch sử; ADR-004 mô tả VNPay Sandbox |
| [`docs/team/`](team/) | Backlog, Definition of Done, Review/Retro | Không tự điền xác nhận của thành viên |
| [`docs/evidence/sprint-1/`](evidence/sprint-1/) | Task 4: menu MVP, CI PASS/FAIL | Dẫn tới run/PR và file bằng chứng thực có |
| [`docs/evidence/sprint-2/`](evidence/sprint-2/) | Task 5: E2E, CD, production, demo | Phân biệt báo cáo **trước sửa** và **sau sửa** |
| [`docs/releases/`](releases/) | Release notes | Chỉ tạo tag sau khi đạt điều kiện phát hành |
| [`docs/traceability-matrix.md`](traceability-matrix.md) | FR/NFR → UC/US → UML → code/API → test | Có dẫn tới trạng thái hiện hành và kết quả lịch sử |
| [`docs/deployment.md`](deployment.md) | Local/Render, migration, backup, rollback | Làm theo runbook khi triển khai production |
| [`README.md`](../README.md) | Clone, local, test, build, deploy/rollback | Điểm bắt đầu cho người ngoài nhóm |
| [`.github/workflows/`](../.github/workflows/) | CI trên PR và CD cho bản phát hành | Job CD `skipped` trên PR là đúng thiết kế |

## 2. Bản đồ tạo phẩm theo 5 Task

| Task theo PDF | Tạo phẩm bắt buộc | Vị trí kiểm tra |
| --- | --- | --- |
| **Task 1 — Khai thác yêu cầu** | Stakeholder, phạm vi, SRS FR/NFR + MoSCoW + AC, use-case | [Context/scope](requirements/context-and-scope.md), [SRS](requirements/srs.md), [UC checkout](requirements/use-case-checkout.md), [use-case nguồn](diagrams/usecase-overview.puml) và [SVG](diagrams/usecase-overview.svg) |
| **Task 2 — Mô hình hóa** | Activity, sequence, class; source và hình kết xuất | [Activity](diagrams/activity-checkout.puml) / [SVG](diagrams/activity-checkout.svg); [Sequence](diagrams/sequence-checkout.puml) / [SVG](diagrams/sequence-checkout.svg); [Class](diagrams/class-domain.puml) / [SVG](diagrams/class-domain.svg) |
| **Task 3 — Kiến trúc** | Kiến trúc/ADR và deployment diagram đúng hạ tầng | [Tổng quan](architecture/overview.md), [ADR](architecture/adr/), [Deployment](diagrams/deployment.puml) / [SVG](diagrams/deployment.svg), [hướng dẫn](deployment.md) |
| **Task 4 — Sprint 1 và CI** | Repo/PR/board, menu MVP, CI PR install → lint → unit test → build, minh chứng PASS và FAIL | [Backlog](team/a2-backlog.md), [DoD](team/a2-definition-of-done.md), [CI evidence](evidence/sprint-1/ci-evidence.md), [ảnh menu](evidence/sprint-1/menu-demo.png) |
| **Task 5 — Sprint 2 và bàn giao** | Hoàn thiện luồng mua, unit/integration/E2E, migration/Compose, CD registry/deploy/smoke, HTTPS, video, release, Review/Retro | [Bằng chứng kỹ thuật mới nhất](evidence/sprint-2/a2-29-delivery-evidence-2026-11-15.md), [CI/CD lịch sử](evidence/sprint-2/a2-25-ci-cd-production.md), [video/demo](evidence/sprint-2/a2-28-production-demo.md), [Sprint Review](team/sprint-review-retrospective.md), [xác nhận nhóm](team/a2-29-review-signoff.md), [checklist bàn giao](evidence/sprint-2/a2-30-submission.md), [release notes dự thảo](releases/v1.0.0-a2.md) |

## 3. Bằng chứng production hiện hành

| Nội dung | Dẫn chứng | Trạng thái cần hiểu đúng |
| --- | --- | --- |
| Bản ứng dụng trên Render | SHA `52e0883a081422a9718f51097a32f44b301d9850`; [CD run PASS](https://github.com/ncd426/BrewLite-2/actions/runs/43625066012) | Có log operator và xác minh image digest tại thời điểm deploy |
| Web HTTPS | [brewlite-2-web.onrender.com](https://brewlite-2-web.onrender.com) | Người thực hiện báo test/demo thành công; cần kiểm tra lại tại thời điểm chấm |
| Backend health | [brewlite-api-49rx.onrender.com/health](https://brewlite-api-49rx.onrender.com/health) | Smoke PASS theo log phát hành |
| API full DB regression | 165/165 PASS theo log developer với PostgreSQL **test riêng** | [A2-29](evidence/sprint-2/a2-29-delivery-evidence-2026-11-15.md); cần giữ đường dẫn/log gốc để giảng viên đối chiếu |
| Browser E2E local | 5/5 checkpoints PASS theo log | Không thay thế video production; xem [A2-28](evidence/sprint-2/a2-28-production-demo.md) |
| Video/screenshot | [Biên bản A2-28](evidence/sprint-2/a2-28-production-demo.md) | **Cần URL video, ảnh desktop/mobile có thể xem được** |
| Review/Retro | [Mẫu xác nhận A2-29](team/a2-29-review-signoff.md) | **Chờ xác nhận thực tế của Danh/Bảo/Khoa** |
| Database/secret/backup | [Security gate A2-29](evidence/sprint-2/a2-29-delivery-evidence-2026-11-15.md) | **Chờ người vận hành xác minh allowlist, internal DB URL, backup mã hóa** |
| Tag/GitHub Release | [A2-30](evidence/sprint-2/a2-30-submission.md) | Chưa tạo tại thời điểm chuẩn bị hồ sơ |

## 4. Quy tắc lưu và nộp bằng chứng

- **Commit vào GitHub:** tài liệu yêu cầu, sơ đồ `.puml`/`.svg`, source, test, CI/CD, README, ma trận truy vết, biên bản và release notes, theo PR đã review.
- **Không commit:** MP4 lớn, ảnh/log thô chưa được kiểm tra, PostgreSQL dump, token/JWT, file `.env`, mật khẩu hay secret. Lưu chúng trong `work/A2-28/evidence/`, `work/A2-27/private-backups/` hoặc nơi riêng an toàn; chỉ đưa **link đã cấp quyền xem** và kết quả đã rà soát vào `docs/evidence/`.
- **Minh chứng thủ công không tự được tính PASS:** video, kết quả cấu hình DB private, chữ ký/ngày họp và quyết định review phải có nguồn xác nhận thực tế.
- **Báo cáo lịch sử không được xóa hoặc sửa số liệu:** `evidence/sprint-2/system-verification-2026-11-14.md` và `ci-cd-a2-25.md` phản ánh thời điểm cũ. Bản tổng hợp sau sửa nằm ở [A2-29](evidence/sprint-2/a2-29-delivery-evidence-2026-11-15.md).
- **Checklist bàn giao:** [9 mục theo PDF](evidence/sprint-2/a2-30-submission.md). Chỉ đóng khi có đủ liên kết, reviewer, production và release.

**Thứ tự chốt hồ sơ:** bổ sung video/ảnh A2-28 → xác nhận Review/Retro và bảo mật → đưa PR #60 sang Ready for review → merge docs → tạo tag `v1.0.0-a2` khi đủ điều kiện (giữ `RENDER_DEPLOY_ENABLED=false`) → bàn giao link repository, release, production và video.
