# A2-28 — Biên bản demo thực tế BrewLite2 trên production

**Mục đích:** lưu kết quả browser/mobile trên địa chỉ HTTPS thật và liên kết video demo phục vụ Task 5.4. Đây là biên bản để nhóm bổ sung bằng chứng; không thay thế log E2E tự động.

| Trường | Nội dung |
| --- | --- |
| Bản ứng dụng triển khai | `52e0883a081422a9718f51097a32f44b301d9850` (PR #59) |
| Web | https://brewlite-2-web.onrender.com |
| API/health | https://brewlite-api-49rx.onrender.com/health |
| CD deploy và smoke | https://github.com/ncd426/BrewLite-2/actions/runs/43625066012 (`success` theo log PowerShell do thành viên nhóm cung cấp) |
| Demo thủ công | Người thực hiện đã báo **test/demo thành công trên Render** ngày 15/11/2026; chưa có log chi tiết từng bước đính kèm repo |
| Video demo công khai cho giảng viên | `PENDING_VIDEO_URL` — tải MP4 lên Drive và thêm link chỉ xem; không commit MP4 vào Git |
| Ảnh desktop/mobile | `PENDING_SCREENSHOT_EVIDENCE` — đường dẫn ảnh đã ẩn thông tin nhạy cảm hoặc link Drive |

## Checklist xác nhận thủ công — đánh dấu khi có bằng chứng

- [ ] Web HTTPS hiển thị menu, dữ liệu đến từ API `/products`.
- [ ] Sản phẩm, tùy chọn size/topping, giỏ hàng và tổng tiền hoạt động.
- [ ] Đăng ký/đăng nhập (JWT), checkout và mã đơn hoạt động.
- [ ] Thanh toán trên **VNPay Sandbox** hoặc luồng thử nghiệm được phép; trạng thái hiển thị đúng thực tế.
- [ ] Lịch sử/chi tiết đơn cập nhật, không hiển thị dữ liệu người dùng khác.
- [ ] Giao diện điện thoại (ví dụ 390×844), không tràn ngang, nút bấm hoạt động.
- [ ] Lưu tên trình duyệt/phiên bản, ngày giờ, link video và ảnh bằng chứng.

**Cách lưu:** MP4, ảnh chụp và log thô nằm trong `work/A2-28/evidence/` (được Git ignore) hoặc nơi lưu trữ có chia sẻ. Chỉ commit URL hoặc tóm tắt đã rà soát vào tài liệu này. Không quay hoặc chia sẻ mật khẩu/JWT/secret, dữ liệu khách thật hay thông tin truy cập DB.

**Giới hạn:** E2E local trước đó sử dụng signed **simulated VNPay IPN**; không tự suy ra thanh toán ngân hàng thật. Không ghi trạng thái checklist `PASS` nếu không có bằng chứng tương ứng.
