# A2-29 — Sprint Review & Retrospective: biên bản xác nhận

Đây là **mẫu biên bản cần nhóm xác nhận**, chưa phải bản ghi sự kiện đã diễn ra. Bám theo yêu cầu Task 5.4 của Assignment 2 và hồ sơ [Sprint Review/Retro trước đó](sprint-review-retrospective.md).

## Sprint Review

| Nội dung | Điền sau khi họp/review |
| --- | --- |
| Ngày/giờ, hình thức/kênh | `Nhóm đã thống nhất nghiệm thu nội bộ Sprint 2; ngày, giờ và kênh họp cụ thể chưa được ghi nhận.` |
| Người tham dự, vai trò | `Nhóm gồm Danh (CI/CD, release), Bảo (frontend, E2E, deploy) và Khoa (SRS, DB, UML). Chưa có danh sách tham dự buổi họp được lưu riêng.` |
| Sprint Goal / Increment trình diễn | Next.js + NestJS + PostgreSQL, menu → cart → checkout → thanh toán → lịch sử; production `https://brewlite-2-web.onrender.com` |
| SHA ứng dụng đã triển khai | `52e0883a081422a9718f51097a32f44b301d9850` |
| Video / screenshot | https://drive.google.com/drive/folders/1LYnzuF58uFC6ikL7jz4c8rYVX-k1RtJm?usp=sharing |
| Phản hồi stakeholder/PO/giảng viên (nếu có) | `Nhóm đã thống nhất nghiệm thu nội bộ. Chưa ghi nhận phản hồi riêng từ giảng viên hoặc stakeholder.` |
| Quyết định Review (đạt/yêu cầu sửa; người chấp thuận) | `Nhóm thống nhất nghiệm thu nội bộ Sprint 2 dựa trên kết quả kiểm thử và demo production đã xác nhận. Không thay thế nghiệm thu chính thức của giảng viên.` |
| PR Docs A2-29 và reviewer | `PR #60 đã MERGED: https://github.com/ncd426/BrewLite-2/pull/60 ; merge commit 2540f81611222c444ac82a7ffe8ad81a26024a2c. Chưa xác minh danh tính reviewer.` |

## Đóng góp và xác nhận theo phân công

| Người | Vai trò trong bảng phân công | Tuyên bố đóng góp, phản hồi & xác nhận |
| --- | --- | --- |
| Danh | Điều phối, CI/CD, release | `Nhóm đã thống nhất nghiệm thu nội bộ theo xác nhận của người điều phối; chưa đính kèm xác nhận cá nhân riêng của Danh.` |
| Bảo | Yêu cầu/use-case, E2E, frontend/deploy | `Nhóm đã thống nhất nghiệm thu nội bộ; chưa đính kèm xác nhận cá nhân riêng của Bảo.` |
| Khoa | SRS, DB, truy vết, UML | `Nhóm đã thống nhất nghiệm thu nội bộ; chưa đính kèm xác nhận cá nhân riêng của Khoa.` |

Thành viên cần xác nhận bằng comment trên PR, issue/team meeting record hoặc hình thức nhóm thống nhất; không tự coi tên trong bảng là chữ ký/phê duyệt.

## Sprint Retrospective — điền sự kiện thật

| Câu hỏi | Nhận xét/ quyết định thực tế |
| --- | --- |
| What went well? | `Backend tests 165/165 PASS; Browser E2E 5/5 PASS; GHCR publish và Render deploy/smoke PASS (GitHub Actions run 43625066012); demo production thành công; PR tài liệu #60 đã merge.` |
| What didn't go well? | `Một script PowerShell từng gặp lỗi call depth overflow; các script kiểm tra URL video yêu cầu định dạng quá chặt; minh chứng demo và hồ sơ nghiệm thu cần được đồng bộ tốt hơn.` |
| What to improve next? | `Chuẩn hóa preflight cho script; quản lý minh chứng trong docs/evidence; kiểm tra quyền truy cập video bằng tài khoản người xem; rà soát tài liệu, CI và deployment gate trước release.` |
| Người phụ trách và deadline | `Chưa ghi nhận người phụ trách và deadline riêng cho từng hành động cải tiến; cần bổ sung nếu nhóm quyết định triển khai.` |
| Hình thức xác nhận của ba thành viên | `Nhóm đã thống nhất nghiệm thu nội bộ Sprint 2 theo xác nhận của người điều phối; chưa đính kèm biên bản có chữ ký hoặc xác nhận riêng từng thành viên.` |

**Đầu vào thảo luận có nguồn:** CI phát hiện lỗi và PASS sau sửa; payment fixture/concurrency thất bại rồi DB regression 165/165 PASS theo log; source UML/ADR đã chỉnh; CD digest-pinned Render PASS; các lỗi script PowerShell trong bước backup/gh run đã được sửa và thử lại; cuối kỳ có nhu cầu đồng bộ evidence theo SHA. Đây là **gợi ý nội dung**, không tự điền làm kết luận nhóm.

Sau khi điền các trường còn trống, kiểm tra links, quyền truy cập, reviewer và commit qua PR A2-29. Không dùng tên hoặc chữ ký giả.
