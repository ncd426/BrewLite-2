# BrewLite Assignment 2 — Backlog Sprint 1 / Sprint 2

> Nguồn: sheet **Phân công 5 ngày**, `BrewLite_Assignment2.xlsx` (04–08/11/2026).
> Trạng thái dưới đây là **trạng thái trong file phân công lúc nhận**, không phải trạng thái GitHub thực tế.

## Sprint 1 — Task 1 đến Task 4 (04/11 → 07/11 trưa)

Các Gate Task 1 → Task 2 → Task 3 → Task 4 được nghiệm thu lần lượt; Task 4 chỉ bắt đầu nghiệm thu sau Gate Task 3.

| ID | Ngày | Task | Phụ trách | Review | Công việc | Minh chứng |
|---|---|---|---|---|---|---|
| A2-01 | 1 | Task 1 | Danh | Bảo | Khởi tạo repo BrewLite-2 từ code A1; mời Bảo/Khoa; kickoff, backlog Sprint 1/2, quy ước branch/PR và DoD. Khởi tạo hạ tầng sớm, chưa nghiệm thu Task 4. | Repo A2 có lịch sử A1; quyền collaborator; Issues/Project; DoD và biên bản kickoff |
| A2-02 | 1 | Task 1 | Bảo | Danh | Context & scope: vấn đề nghiệp vụ; stakeholder (khách hàng, quầy, quản lý, giảng viên, nhóm dev, thanh toán), mục tiêu; in/out scope, giả định, ràng buộc và rủi ro. | docs/requirements/context-and-scope.md; bảng stakeholder, in/out scope, assumptions, constraints |
| A2-03 | 1 | Task 1 | Khoa | Danh | SRS rút gọn: FR-01..., NFR-01...; MoSCoW; acceptance criteria kiểm chứng được; use-case tổng quát. Bao quát menu/giỏ hàng/auth/order/payment/state, hiệu năng/bảo mật/khả dụng/deploy. | docs/requirements/srs.md; use-case overview nguồn + SVG; FR/NFR có mã và tiêu chí đo |
| A2-04 | 1 | Task 1 | Bảo | Khoa | Đặc tả UC đặt và thanh toán: actor, trigger, pre/post, main flow, alt flow, ngoại lệ (hết hàng, chưa login, payment fail) và mapping FR. | docs/requirements/use-case-checkout.md; các nhánh và FR có thể viết test |
| A2-05 | 1 | Task 1 | Khoa | Danh | Use-case diagram tổng quát/trọng tâm; nguồn PlantUML + bản xuất SVG; liên kết với SRS và PR Task 1. | docs/diagrams/use-case-checkout.puml + .svg, PR Task 1 |
| A2-06 | 1 | Task 1 | Danh | Khoa | Cuối ngày 1: nghiệm thu Task 1 sau khi SRS, context/scope, use-case và bản xuất UML hoàn tất; review/merge PR trước khi mở Gate Task 2. | PR Task 1 đã được review/merge; đầy đủ tài liệu yêu cầu & use-case; liên kết FR/NFR. |
| A2-07 | 2 | Task 2 | Danh | Bảo | Activity diagram end-to-end có start/end, user/system, decision/merge, swimlane và nhánh hết hàng, chưa login, thanh toán thất bại. | docs/diagrams/activity-checkout.puml + .svg |
| A2-08 | 2 | Task 2 | Bảo | Danh | Sequence: Customer → Next.js → NestJS → DB → Payment; JWT, validate, transaction, idempotency, alt success/fail và response cuối. | docs/diagrams/sequence-checkout.puml + .svg |
| A2-09 | 2 | Task 2 | Khoa | Bảo | Domain class diagram ít nhất User/Product/Order/OrderItem/Payment/Promotion/LoyaltyTransaction; thuộc tính, association, multiplicity và trạng thái enum. | docs/diagrams/class-domain.puml + .svg |
| A2-10 | 2 | Task 2 | Danh | Khoa | Review activity với SRS, UC và nhánh lỗi; đảm bảo đã commit source và hình; tham gia review PR Task 2. | Review trong PR Task 2; source + SVG tồn tại |
| A2-11 | 2 | Task 2 | Bảo | Khoa | Review sequence đối chiếu API thật, JWT, stock transaction, retry/idempotency; merge PR Task 2 chỉ khi đủ nguồn và ảnh. | PR Task 2 đã review và merge, các lỗi/nhánh thay thế có trong sơ đồ |
| A2-12 | 2 | Task 2 | Khoa | Danh | Cuối ngày 2: kiểm tra cả 3 sơ đồ thống nhất SRS/Prisma, đủ nguồn .puml và .svg, review/merge PR; chốt Gate Task 2 trước khi bắt đầu Task 3. | Gate Task 2: PR UML đã merge; activity, sequence, class khớp với SRS. |
| A2-13 | 3 | Task 3 | Danh | Khoa | Thiết kế kiến trúc Next.js mobile-first/PWA, NestJS module, PostgreSQL/Prisma, mock pay, logging, health/config; phân tích ưu/nhược, trade-off và ADR. | docs/architecture/overview.md; docs/architecture/adr/001-*.md |
| A2-14 | 3 | Task 3 | Bảo | Danh | Vẽ deployment diagram dựa trên hosting thực chọn: người dùng/PWA, frontend/CDN, API, PostgreSQL persistent, registry, HTTPS, secrets, health/log, ranh giới local/CI/prod. | docs/diagrams/deployment.puml + .svg; sơ đồ khớp hạ tầng thật |
| A2-15 | 3 | Task 3 | Khoa | Bảo | Sáng ngày 3: chốt hosting/registry, migration/rollback và ADR; review + merge PR kiến trúc trước khi chuyển sang Task 4 buổi chiều. | Gate Task 3 trước buổi chiều: overview/ADR/deployment thực tế có commit và review. |
| A2-16 | 3 | Task 4 | Danh | Khoa | Chiều ngày 3, sau Gate Task 3: xác minh repo kế thừa A1 đã có code cần dùng; cấu trúc apps/web, apps/api, docs; README, .env.example, .gitignore; backlog, branch/PR/DoD. | Repository + Issues/Sprint board + branch/PR conventions; không commit secrets. |
| A2-17 | 3 | Task 4 | Bảo | Danh | MVP Sprint 1: rà GET /products, GET /products/:id, sample seed; test API và menu; kiểm tra đầu ra từ code kế thừa A1. | API test/log; menu demo; PR Sprint 1 |
| A2-18 | 3 | Task 4 | Khoa | Bảo | Chiều ngày 3, sau Gate Task 3: kiểm tra tài liệu Task 1–3 đã commit/merge đúng các mốc; bổ sung truy vết và lý do sửa; chuẩn bị bộ hồ sơ Sprint 1. | Docs đúng cấu trúc + PR Task 1–3 đã merge theo thứ tự. |
| A2-19 | 4 | Task 4 | Danh | Bảo | Thiết lập CI PR: install → lint → unit test → build, không merge khi checks FAIL; kiểm tra branch protection/required status. | .github/workflows/ci.yml; URL PR chạy CI PASS |
| A2-20 | 4 | Task 4 | Bảo | Danh | Tạo minh chứng CI PASS và CI FAIL có kiểm soát trên branch thử nghiệm; ghi cách sửa lỗi, không để mã lỗi trong main. | 2 GitHub Actions run URLs + ảnh/log; PR review |
| A2-21 | 4 | Task 4 | Khoa | Danh | Sáng ngày 4: nghiệm thu MVP Sprint 1 mobile-first/PWA, loading/empty/error, unit/API tests; chỉ chốt Task 4 khi CI PASS, có log CI FAIL thử nghiệm và PR đã review/merge. | Gate Task 4: PR CI/MVP được review; log CI PASS & CI FAIL; kiểm tra branch protection. |

## Sprint 2 — Task 5 (sau Gate Task 4: 07/11 chiều → 08/11)

| ID | Ngày | Task | Phụ trách | Review | Công việc | Minh chứng |
|---|---|---|---|---|---|---|
| A2-22 | 4 | Task 5 | Danh | Khoa | Chiều ngày 4, sau Gate Task 4: hoàn thiện và rà luồng menu → size/topping → giỏ → JWT → đặt đơn → mock pay → trạng thái/lịch sử; kiểm tra NFR hiệu năng, bảo mật, khả dụng. | MVP end-to-end; checklist NFR + log demo/test; không bỏ qua payment fail. |
| A2-23 | 4 | Task 5 | Bảo | Danh | Chiều ngày 4: unit/integration trên DB test riêng; chạy E2E menu→xác nhận đơn (không dùng GET / làm E2E nghiệp vụ), thu log PASS. Chuẩn bị test smoke production ngày 5. | E2E full flow PASS; unit/integration logs; DB test tách biệt. |
| A2-24 | 4 | Task 5 | Khoa | Bảo | Chiều ngày 4: kiểm tra migration/seed tái tạo được DB, Docker Compose 3 service và GET /health; phối hợp chuẩn bị production DB/secret để triển khai ngày 5. | Log migrate/seed/Compose/GET /health; không mở DB production công khai. |
| A2-25 | 5 | Task 5 | Danh | Bảo | Sáng ngày 5: kích hoạt pipeline CD push/tag → lint/test/build → image tag SHA → registry → deploy → health/smoke; kiểm tra dừng khi lỗi và hướng rollback. | Workflow/CD PASS; Docker image tag rõ ràng; logs smoke và rollback. |
| A2-26 | 5 | Task 5 | Bảo | Khoa | Sáng ngày 5: đưa Next.js + NestJS lên production HTTPS; DB không public, secret trong env/CI; xác nhận URL web/API có thể truy cập ngoài máy nhóm. | Frontend & API URL HTTPS, bằng chứng secret không lưu repo/log. |
| A2-27 | 5 | Task 5 | Khoa | Danh | Sáng ngày 5: migration production có phương án dự phòng, kiểm tra health/smoke và rollback release/image, log trường hợp failure. | Rollback guide, migration evidence, health/smoke log; DB private. |
| A2-28 | 5 | Task 5 | Bảo | Khoa | Chiều ngày 5: quay video/demo thực tế trên URL production HTTPS từ menu đến xác nhận đơn; kiểm tra browser và giao diện điện thoại. | Video/demo + frontend/API HTTPS hoạt động, ảnh từ trình duyệt/mobile. |
| A2-29 | 5 | Task 5 | Khoa | Danh | Chiều ngày 5: hoàn thành ma trận FR→UC/US→UML→code→test; README local/test/build/deploy/rollback và biên bản Sprint Review/Retrospective đủ đóng góp 3 thành viên. | traceability-matrix.md; README; Sprint Review & Retrospective; PR docs. |
| A2-30 | 5 | Task 5 | Danh | Bảo | Cuối ngày 5: sau khi production/demo/tài liệu đạt yêu cầu, tạo release/tag & release notes; kiểm tra đủ 5 Gate theo thứ tự và toàn bộ link nộp bài. | Gate Task 5: release URL/tag; PR review; CI/CD; production; video; Sprint Review/Retro. |

## Nguyên tắc Issue/Project

- Mỗi dòng A2-XX thành một GitHub Issue: tiêu đề `[A2-XX][Task N] ...`, assign người phụ trách, ghi reviewer và acceptance criteria trong body.
- Field khuyến nghị: Status (`Todo`, `In progress`, `In review`, `Done`, `Blocked`), Task Gate, Sprint, Owner, Reviewer, PR URL.
- Chỉ đánh dấu `Done` khi PR/commit/log được reviewer chấp nhận và được phản ánh đúng ba cột **I/K/N** của bảng Excel.
- Không coi việc thiết lập CI sớm hoặc xây dựng POS là bằng chứng đã vượt qua các Gate Task 1–3.
