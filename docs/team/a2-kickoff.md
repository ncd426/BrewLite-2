# BrewLite Assignment 2 — Kickoff (bản dự thảo)

> **Trạng thái:** Chưa họp/chưa xác nhận. Đây là khung biên bản để ba thành viên hoàn thiện, không phải bằng chứng cuộc họp đã diễn ra.  
> **Kế hoạch:** 04–08/11/2026 (lịch nước rút 5 ngày theo bảng phân công).  
> **Project:** BrewLite-2 — https://github.com/ncd426/BrewLite-2

## 1. Mục tiêu

- Kế thừa mã nguồn Assignment 1 có lịch sử Git, không tạo lại sản phẩm từ số 0.
- Chốt yêu cầu, UML, kiến trúc, MVP, CI/CD, bản deploy HTTPS và minh chứng bài nộp theo đúng thứ tự **Task 1 → 2 → 3 → 4 → 5**.
- Mỗi đầu việc có người phụ trách, reviewer, acceptance criteria, liên kết PR/commit và log trước khi được nghiệm thu.

## 2. Nhóm và phạm vi trách nhiệm

| Thành viên | Vai trò theo bảng phân công | Nhiệm vụ trọng tâm |
|---|---|---|
| Danh | Nhóm trưởng/điều phối | Backlog, review/Gate, activity, architecture/ADR, CI, CD, release |
| Bảo | Requirements, use-case, sequence | Context/scope, use-case checkout, sequence, E2E, deploy HTTPS, video |
| Khoa | SRS, class, ADR/DB/traceability | SRS, use-case UML, class domain, chốt hosting/ADR, kiểm chứng DB, docs bàn giao |

## 3. Nền tảng và phạm vi thống nhất

- **Frontend:** Next.js, giao diện mobile-first/PWA; danh mục, chi tiết sản phẩm, size/topping, giỏ hàng, checkout, theo dõi/lịch sử đơn.
- **Backend:** NestJS API, JWT, đơn hàng, kiểm soát kho/transaction, mock payment, idempotency, health, logging/config.
- **Database:** PostgreSQL và Prisma; migrations, seed tái tạo được; tách DB test và DB production.
- **Delivery:** Docker Compose local; GitHub PR + CI; image/registry/CD; production HTTPS và rollback.
- Chức năng quản trị, nhân viên và bán tại quầy là mở rộng code hiện có; không làm lệch trọng tâm **luồng mua hàng của khách** trong yêu cầu Assignment 2.

## 4. Timeline / nghiệm thu theo Gate

| Gate | Hạn theo kế hoạch | Tiêu chí bắt buộc |
|---|---|---|
| Task 1 | 04/11, cuối ngày | Context/scope, SRS FR/NFR, checkout UC, use-case nguồn và SVG, PR review/merge |
| Task 2 | 05/11, cuối ngày | Activity, sequence, class đồng nhất SRS/Prisma, mỗi sơ đồ có `.puml` + `.svg` |
| Task 3 | 06/11, trưa | Overview, ADR, deployment đúng với hạ tầng thực tế, PR merge |
| Task 4 | 07/11, trưa | Repo/board/PR, menu MVP, CI install → lint → unit → build, bằng chứng CI PASS/FAIL |
| Task 5 | 08/11, cuối ngày | E2E, CD, HTTPS production, smoke/rollback, video, release và tài liệu bàn giao |

**Nguyên tắc:** Có thể chuẩn bị công việc kỹ thuật sớm, nhưng **không nghiệm thu Gate sau khi Gate trước chưa ĐẠT**.

## 5. Quyết định nhóm cần xác nhận trong kickoff

- [ ] Cả ba thành viên xác nhận phân công và reviewer.
- [ ] Xác nhận lịch, giờ review hằng ngày và kênh liên lạc.
- [ ] Xác nhận nhánh gốc `main`, quy ước branch/PR và ít nhất một reviewer khác tác giả.
- [ ] Xác nhận Definition of Done tại `docs/team/a2-definition-of-done.md`.
- [ ] Xác nhận Sprint 1: Task 1–4; Sprint 2: Task 5 (mốc chuyển Sprint 2 sau Gate Task 4).
- [ ] Chọn nơi quản lý GitHub Issues/Projects; không đánh dấu hoàn thành nếu thiếu minh chứng.
- [ ] Chốt rủi ro: SRS/diagram chưa hoàn thiện, CI đỏ, migration/snapshot, secret, hosting HTTPS, dependency giữa Gates.

## 6. Biên bản sau họp (chỉ điền khi cuộc họp diễn ra)

- **Bắt đầu/kết thúc:** _chưa xác nhận_
- **Người tham dự:** _chưa xác nhận_
- **Quyết định:** _chưa xác nhận_
- **Việc cần theo dõi và hạn:** _chưa xác nhận_
- **Liên kết Issue/PR/Project:** _chưa bổ sung_
- **Người xác nhận:** _chưa xác nhận_
