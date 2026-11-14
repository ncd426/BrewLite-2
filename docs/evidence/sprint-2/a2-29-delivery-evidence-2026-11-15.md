# A2-29 — Đối chiếu bằng chứng cuối kỳ (15/11/2026)

**Nguồn và mức độ xác nhận:** Các kết quả bên dưới tổng hợp từ log PowerShell/kiểm thử do người thực hiện cung cấp. Link GitHub Actions là nơi giảng viên kiểm tra được; bản dump production, kết quả local chi tiết và ảnh/video chưa được đưa vào Git. Tài liệu không tự chứng minh reviewer/PO đã phê duyệt.

## 1. Bản web/API production đang vận hành

| Hạng mục | Minh chứng đã ghi nhận |
| --- | --- |
| Repository | https://github.com/ncd426/BrewLite-2 |
| UI PR mới | https://github.com/ncd426/BrewLite-2/pull/59 |
| SHA application release | `52e0883a081422a9718f51097a32f44b301d9850` |
| CD có deploy Render thành công | https://github.com/ncd426/BrewLite-2/actions/runs/43625066012 |
| API image đang Live tại lần kiểm tra | `ghcr.io/ncd426/brewlite-2-api@sha256:6fb7e5282c7906e819cc1a0265ca8f25d335ebcc2dc8e4c13c289fa2157ddfd4` |
| Web image đang Live tại lần kiểm tra | `ghcr.io/ncd426/brewlite-2-web@sha256:35e06e22660a628b197b1c7ab5aa230c046d4725bab9148f229a35176bb000eb` |
| Public web | https://brewlite-2-web.onrender.com |
| Public API | https://brewlite-api-49rx.onrender.com |
| Health | https://brewlite-api-49rx.onrender.com/health |
| Deploy gate sau release | `RENDER_DEPLOY_ENABLED=false` theo log PowerShell |

CD run trên có API quality, Web quality, release configuration, GHCR publish và Render deploy+smoke `success`. Job kiểm tra Dockerfile dành cho PR bị `skipped` khi chạy từ `main` là bình thường, không phải lỗi pipeline.

## 2. Kiểm thử và truy vết

| Phạm vi | Bằng chứng / nhận xét |
| --- | --- |
| CI Task 4.4 — phát hiện lỗi | https://github.com/ncd426/BrewLite-2/actions/runs/42478003839 |
| CI Task 4.4 — sửa và PASS | https://github.com/ncd426/BrewLite-2/actions/runs/42478290320 |
| Backend full DB regression | **25/25 suites, 165/165 tests PASS** trên PostgreSQL disposable theo log developer; không phải kiểm thử DB production |
| Quality gates | **7/7 PASS** theo log developer; CI có thể đối chiếu ở PR/Run tương ứng |
| Browser E2E local | **5/5 checkpoints PASS** với signed simulated IPN; môi trường local/disposable |
| Production read-only smoke | `/health`, `/products` (8 items thời điểm kiểm tra trước UI release), `/` HTTPS PASS theo báo cáo địa phương |
| Production manual demo | Người thực hiện báo demo/test thành công trên Render; bằng chứng video/ảnh cần bổ sung tại [A2-28 demo](a2-28-production-demo.md) |
| Ma trận yêu cầu | [FR/NFR → UC/US → UML → code → test](../../traceability-matrix.md) |
| UML/kiến trúc | [Diagrams](../../diagrams/), [ADR](../../architecture/adr/), [deployment](../../deployment.md) |

## 3. Database/rollback trước phát hành

- Render Free PostgreSQL: `pg_dump` định dạng custom hoàn tất; phục hồi trên PostgreSQL Docker riêng **PASS**, kiểm tra `9` migration rows. Backup được giữ trong `work/A2-27/private-backups/`, **không đưa vào Git**.
- `9/9` production Prisma migrations khớp danh mục migration ở application release `69119fd`; PR #59 chỉ chỉnh 9 file giao diện.
- Hai image **cũ tại thời điểm trước release** được kiểm tra còn truy cập được trên registry, `2/2 PASS`. Đây là kiểm tra khả năng lấy image, **không phải diễn tập rollback mới**.
- Người chạy đã nhập xác nhận `BACKUP_SECURED` khi deploy; cần kiểm chứng thực tế bản sao mã hóa ở thiết bị/nơi lưu khác và khả năng giải mã/khôi phục.
- **Chưa có bằng chứng máy xác minh** rằng External PostgreSQL IP allowlist đã giới hạn và API dùng Internal DATABASE_URL. NFR bảo mật/điều kiện 'DB không public trực tiếp' phải được người phụ trách Render xác nhận riêng.

## 4. Phần nghiệm thu còn mở — không tự đánh dấu Đạt

- [ ] Link video MP4 có quyền xem cho giảng viên, kèm ảnh desktop/mobile; cập nhật [A2-28 demo](a2-28-production-demo.md).
- [ ] Review/Retrospective thực tế, người tham gia, feedback, phân công cải tiến, xác nhận của Danh/Bảo/Khoa; xem [biên bản](../../team/a2-29-review-signoff.md).
- [ ] Rà cấu hình DB private/network allowlist, API internal DB URL, secrets không lộ, bản backup mã hóa ở vị trí riêng.
- [ ] NFR-01 load/performance theo đúng AC của SRS (nếu nghiệm thu đầy đủ) và các gap còn mở trong [traceability matrix](../../traceability-matrix.md); không coi HTTP smoke là load test.
- [ ] Merge PR tài liệu A2-29, ghi reviewer và CI PASS; sau đó tạo tag/release/notes A2-30 trỏ tới commit đã merge.

**Lưu ý lịch sử:** các log thất bại trong `system-verification-2026-11-14.md` là baseline trước fix; không xóa hoặc viết lại kết quả lịch sử. Phân biệt 'đã sửa theo log mới' với 'đã được review/acceptance'.
