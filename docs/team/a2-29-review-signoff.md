# A2-29 — Sprint Review & Retrospective: biên bản xác nhận

Đây là **mẫu biên bản cần nhóm xác nhận**, chưa phải bản ghi sự kiện đã diễn ra. Bám theo yêu cầu Task 5.4 của Assignment 2 và hồ sơ [Sprint Review/Retro trước đó](sprint-review-retrospective.md).

## Sprint Review

| Nội dung | Điền sau khi họp/review |
| --- | --- |
| Ngày/giờ, hình thức/kênh | `PENDING_REVIEW_DATE` |
| Người tham dự, vai trò | `PENDING_ATTENDEES` |
| Sprint Goal / Increment trình diễn | Next.js + NestJS + PostgreSQL, menu → cart → checkout → thanh toán → lịch sử; production `https://brewlite-2-web.onrender.com` |
| SHA ứng dụng đã triển khai | `52e0883a081422a9718f51097a32f44b301d9850` |
| Video / screenshot | `PENDING_VIDEO_URL` |
| Phản hồi stakeholder/PO/giảng viên (nếu có) | `PENDING_FEEDBACK` |
| Quyết định Review (đạt/yêu cầu sửa; người chấp thuận) | `PENDING_REVIEW_DECISION` |
| PR Docs A2-29 và reviewer | `PENDING_DOCS_PR` |

## Đóng góp và xác nhận theo phân công

| Người | Vai trò trong bảng phân công | Tuyên bố đóng góp, phản hồi & xác nhận |
| --- | --- | --- |
| Danh | Điều phối, CI/CD, release | `PENDING_DANH_CONFIRMATION` |
| Bảo | Yêu cầu/use-case, E2E, frontend/deploy | `PENDING_BAO_CONFIRMATION` |
| Khoa | SRS, DB, truy vết, UML | `PENDING_KHOA_CONFIRMATION` |

Thành viên cần xác nhận bằng comment trên PR, issue/team meeting record hoặc hình thức nhóm thống nhất; không tự coi tên trong bảng là chữ ký/phê duyệt.

## Sprint Retrospective — điền sự kiện thật

| Câu hỏi | Nhận xét/ quyết định thực tế |
| --- | --- |
| What went well? | `PENDING_RETRO_GOOD` |
| What didn't go well? | `PENDING_RETRO_ISSUE` |
| What to improve next? | `PENDING_RETRO_ACTION` |
| Người phụ trách và deadline | `PENDING_RETRO_OWNER_DATE` |
| Hình thức xác nhận của ba thành viên | `PENDING_RETRO_CONFIRMATION` |

**Đầu vào thảo luận có nguồn:** CI phát hiện lỗi và PASS sau sửa; payment fixture/concurrency thất bại rồi DB regression 165/165 PASS theo log; source UML/ADR đã chỉnh; CD digest-pinned Render PASS; các lỗi script PowerShell trong bước backup/gh run đã được sửa và thử lại; cuối kỳ có nhu cầu đồng bộ evidence theo SHA. Đây là **gợi ý nội dung**, không tự điền làm kết luận nhóm.

Sau khi điền các trường còn trống, kiểm tra links, quyền truy cập, reviewer và commit qua PR A2-29. Không dùng tên hoặc chữ ký giả.
