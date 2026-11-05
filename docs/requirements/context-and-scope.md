# Tài liệu Bối cảnh & Phạm vi Dự án BrewLite (Context & Scope)

## 1. Vấn đề nghiệp vụ (Business Problem)
Tại các quầy cà phê truyền thống, vào các khung giờ cao điểm thường xảy ra hiện tượng tắc nghẽn quầy:
* **Thời gian chờ đợi lâu:** Khách hàng mất nhiều thời gian xếp hàng để gọi món, tùy chỉnh kích thước (size), topping và thanh toán.
* **Sai sót trong truyền đạt đơn:** Nhân viên quầy dễ ghi nhận nhầm topping hoặc kích cỡ đồ uống trong lúc giao tiếp ồn ào.
* **Khó khăn quản trị:** Khó quản lý tức thời trạng thái pha chế, lịch sử tiêu dùng, điểm thưởng tích lũy và kiểm soát nguyên vật liệu/tồn kho theo thời gian thực.

**BrewLite** được xây dựng nhằm cung cấp giải pháp đặt món trước (pre-order) trực tuyến nhanh chóng, tự động hóa quy trình tính tiền, quản lý mã giảm giá, điểm tích lũy và hiển thị trạng thái đơn hàng xuyên suốt từ lúc tạo đơn đến khi hoàn thành.

---

## 2. Bảng các bên liên quan (Stakeholder Matrix)

| Stakeholder | Vai trò & Trách nhiệm | Kỳ vọng cốt lõi |
| :--- | :--- | :--- |
| **Khách hàng (Customer)** | Người đặt đồ uống trực tiếp qua web app. | Giao diện trực quan, tùy chọn size/topping linh hoạt, áp dụng khuyến mãi/điểm thưởng rõ ràng, biết chính xác trạng thái đơn. |
| **Nhân viên quầy / Pha chế (Staff)** | Tiếp nhận đơn từ hệ thống, pha chế và bàn giao món. | Đơn hàng hiển thị chuẩn xác (size, topping), nhận diện trạng thái thanh toán tự động, chuyển trạng thái chế biến mượt mà. |
| **Quản trị viên / Quản lý (Admin)** | Quản lý danh mục món, nguyên liệu, chương trình khuyến mãi. | Kiểm soát tồn kho chính xác, quản trị giá bán và mã ưu đãi chặt chẽ, không bị thất thoát doanh thu. |
| **Giảng viên / Hội đồng đánh giá** | Đánh giá kiến trúc kỹ thuật và tính tuân thủ quy trình Agile/Scrum. | Source code rõ ràng, tuân thủ nguyên tắc thiết kế, xử lý toàn vẹn dữ liệu (idempotency, transaction, concurrency), tài liệu SRS/Use Case khớp code. |
| **Nhóm phát triển (Dev Team)** | Thiết kế, lập trình Fullstack (Next.js + NestJS + PostgreSQL). | Kiến trúc phân tầng module hóa, hợp đồng API rõ ràng giữa Frontend - Backend, kiểm thử tự động đạt tiêu chuẩn. |
| **Cổng thanh toán mô phỏng (Mock Payment)** | Giả lập đối tác cung cấp dịch vụ thanh toán (MOMO / CARD). | Phản hồi đúng hợp đồng giao tiếp, hỗ trợ Idempotency-Key và mô phỏng được cả ca thành công lẫn thất bại phục vụ kiểm thử. |

---

## 3. Mục tiêu dự án (Project Goals)
1. **Trải nghiệm khách hàng:** Rút ngắn thời gian đặt món xuống dưới 1 phút; khách hàng chủ động chọn size, topping, voucher giảm giá và điểm thưởng.
2. **Toàn vẹn dữ liệu & Tính nhất quán:**
   * Ngăn chặn việc tạo đơn trùng lặp hoặc trừ tiền lặp bằng cơ chế **Idempotency-Key**.
   * Đơn giá và tổng tiền luôn do **Server tính toán độc lập**, không tin cậy dữ liệu giá gửi từ Client.
   * Xử lý xung đột đồng thời trong cập nhật trạng thái đơn hàng và kiểm soát nguyên vật liệu.
3. **Chất lượng kỹ thuật:** Đạt chuẩn hiệu năng p95 <= 2s đối với API xem menu, p95 <= 3s đối với tạo đơn và thanh toán; duy trì tỉ lệ lỗi 5xx < 1%.

---

## 4. Phạm vi dự án (In-scope & Out-of-scope)

### 4.1. Trong phạm vi (In-scope)
- **Xem thực đơn & Chi tiết:** Xem danh mục đồ uống (`GET /products`), hiển thị chi tiết size, topping phụ thu và hình ảnh.
- **Quản lý giỏ hàng:** Lưu trữ LocalStorage qua Zustand persist middleware, tạo khóa `itemKey` phân tách chính xác món theo cấu hình size và topping.
- **Xác thực người dùng:** Đăng ký, đăng nhập cấp JWT Access Token, bảo vệ route checkout và orders.
- **Tạo đơn & Khuyến mãi:** Áp dụng mã giảm giá (FIXED / PERCENT) và đổi điểm thưởng tích lũy (Loyalty Points: 1 điểm = 1.000đ).
- **Mô phỏng thanh toán:** Hỗ trợ cổng giả lập MOMO (quét mã QR) và CARD, sinh `idempotencyKey` UUID cho mỗi lượt thanh toán.
- **Vòng đời đơn hàng (State Machine):** Chuyển dịch trạng thái chuẩn: `PENDING` $\to$ `PAID` $\to$ `PREPARING` $\to$ `READY` $\to$ `COMPLETED` (hoặc `PAYMENT_FAILED` / `CANCELLED`).
- **Lịch sử đơn hàng:** Tra cứu danh sách và chi tiết các đơn thuộc chính tài khoản đăng nhập (`GET /orders/me`).
- **Triển khai tự động:** Đóng gói toàn bộ hệ thống bằng Docker Compose (`PostgreSQL`, `API NestJS`, `Web Next.js`).

### 4.2. Ngoài phạm vi (Out-of-scope & Kế hoạch mở rộng)
- **Thu tiền thực tế:** Kết nối mạng lưới ngân hàng thật và cổng trung gian thanh toán thực tế (chưa đối soát tiền thật ngoài đời thực).
- **Tích hợp VNPay Sandbox (Giai đoạn mở rộng):** Phiên bản hiện tại tập trung kiểm thử mô phỏng nội bộ (Mock Payment). Việc kết nối cổng VNPay Sandbox và cơ chế xử lý phản hồi xác nhận qua IPN/Webhook từ bên thứ ba sẽ được triển khai sau khi hoàn tất các task nền tảng.
- **Vận chuyển:** Tính năng giao hàng tận nơi (chưa tích hợp định vị tài xế, tính cước vận chuyển theo khoảng cách GPS; mặc định phí vận chuyển = 0đ).
- **Nền tảng khác:** Ứng dụng di động độc lập (Native Mobile App Android/iOS).
- **Quy mô:** Quản lý phân chuỗi nhiều chi nhánh cửa hàng.

---

## 5. Giả định (Assumptions)
- Khách hàng sử dụng trình duyệt web hiện đại có hỗ trợ JavaScript và LocalStorage.
- Khách hàng có kết nối mạng ổn định trong suốt quá trình duyệt menu, tạo đơn và xác nhận thanh toán.
- Môi trường thực thi của Server có cài đặt Docker & Docker Compose để đảm bảo tính nhất quán giữa môi trường phát triển và kiểm thử.
- Đơn hàng thanh toán bằng mã QR có giới hạn thời gian (TTL) trước khi bị hệ thống tự động hủy nếu không ghi nhận giao dịch.

---

## 6. Ràng buộc (Constraints)
- **Công nghệ bắt buộc:** Frontend sử dụng Next.js (App Router), TypeScript, TailwindCSS, Zustand; Backend sử dụng NestJS, Prisma ORM, PostgreSQL.
- **Bảo mật:** Mật khẩu bắt buộc mã hóa Bcrypt; các endpoint tạo đơn/thanh toán/lịch sử bắt buộc phải có `JwtAuthGuard`.
- **Idempotency:** Header `Idempotency-Key` có độ dài tối đa 128 ký tự; gửi lại cùng key phải trả kết quả cũ mà không tạo thêm bản ghi thanh toán thứ hai.
- **Quyền vận hành:** Chỉ nhân viên/quản trị viên (`STAFF`, `ADMIN`) mới có quyền đưa đơn từ `PAID` sang `PREPARING`, `READY`, `COMPLETED` hoặc hủy đơn do hết nguyên liệu.
- **Nguyên tắc xác thực thanh toán:** Trạng thái đơn hàng chỉ chuyển sang `PAID` khi có phản hồi xác thực thành công từ cổng thanh toán/sandbox (hoặc mock service nội bộ), không phụ thuộc vào trạng thái client tự báo.

---

## 7. Rủi ro & Giải pháp giảm thiểu (Risks & Mitigations)

| Rủi ro | Mức độ | Giải pháp giảm thiểu |
| :--- | :---: | :--- |
| **Khách hàng bấm thanh toán nhiều lần do mạng chập chờn** | Cao | Frontend sinh `Idempotency-Key` (UUID); Backend lưu unique key trong bảng `Payment`, từ chối tạo giao dịch trùng lặp. |
| **Client gian lận can thiệp sửa giá sản phẩm/tổng tiền** | Cao | Frontend chỉ gửi `productId`, `size`, `qty`, `toppings`; toàn bộ giá bán, tiền phụ thu và tổng đơn do Backend tự tính toán từ CSDL. |
| **Mất dữ liệu giỏ hàng khi người dùng tải lại trang (F5)** | Trung bình | Sử dụng Zustand `persist` middleware đồng bộ state vào `window.localStorage`. |
| **Thanh toán thất bại làm mất giỏ hàng gây bức xúc cho khách** | Trung bình | Phía Frontend **không xóa giỏ hàng** khi thanh toán trả về `PAYMENT_FAILED`, cho phép khách hàng đổi phương thức thanh toán thử lại ngay. |
| **Treo đơn PENDING và giữ khóa tồn kho ảo do không quét QR** | Trung bình | Thiết lập thời gian sống (TTL) cho mã QR (ví dụ: 15 phút); hệ thống tự động chuyển đơn sang `CANCELLED` khi hết thời gian chờ mà chưa thanh toán. |
| **Khách hủy hoặc nhân viên hủy đơn đột xuất** | Thấp | Hỗ trợ chuyển trạng thái sang `CANCELLED` từ phía khách hàng (trước khi thanh toán) hoặc nhân viên quầy, đồng thời cập nhật lý do và hoàn trả trạng thái giao dịch. |