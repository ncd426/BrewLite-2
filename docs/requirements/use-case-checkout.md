# Đặc tả Use Case: Đặt hàng & Thanh toán (Checkout)

## 1. Thông tin Use Case
* **Use Case ID:** UC-CHECKOUT
* **Use Case Name:** Đặt hàng và Thanh toán
* **Actor:** Khách hàng (User đã đăng nhập hợp lệ với vai trò `CUSTOMER`)
* **Trigger:** Khách hàng nhấn nút "Tiến hành thanh toán" từ màn hình giỏ hàng hoặc nhấn nút "Tiếp tục đến mã QR" / "Xem lại đơn & xác nhận" tại trang `/checkout`.
* **Mức độ ưu tiên:** Must (Bắt buộc) - Tham chiếu `FR-05`, `FR-06`, `FR-08`.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Khách hàng đã đăng nhập tài khoản hợp lệ vào hệ thống (tồn tại JWT Access Token trong cookie/storage).
2. Giỏ hàng có ít nhất 1 sản phẩm hợp lệ (`items.length > 0`).
3. Sản phẩm và nguyên vật liệu pha chế tương ứng còn tồn kho khả dụng trong CSDL.

---

## 3. Hậu điều kiện (Post-conditions)
* **Thành công:**
  1. Bản ghi `Order` được tạo với trạng thái `PENDING`, sau đó chuyển thành `PAID` khi thanh toán hoàn tất.
  2. Bản ghi `Payment` được tạo với `status = SUCCESS`, gắn với `idempotencyKey` tương ứng.
  3. Điểm thưởng sử dụng (nếu có) bị trừ khỏi tài khoản; điểm thưởng tích lũy mới được cộng vào user sau khi đơn chuyển `PAID`.
  4. Các mặt hàng thanh toán thành công được loại bỏ khỏi giỏ hàng phía Frontend.
  5. Khách hàng được chuyển hướng đến màn hình xác nhận đơn (`/order-success`).
* **Thất bại / Hủy:**
  1. Bản ghi đơn hàng chuyển sang `PAYMENT_FAILED` hoặc bị hủy `CANCELLED`.
  2. Giỏ hàng của khách hàng **được giữ nguyên vẹn**, không bị xóa để khách có thể thử lại.

---

## 4. Luồng sự kiện chính (Main Flow)

| Bước | Tác nhân (Actor) | Phản hồi của Hệ thống (System) | Mapping FR/NFR |
| :---: | :--- | :--- | :--- |
| **1** | Khách hàng mở trang `/checkout`. | Hệ thống kiểm tra JWT. Nếu hợp lệ, tải thông tin điểm thưởng (`fetchMyProfile`), hiển thị danh sách món đã chọn, đơn giá, tổng tạm tính và các lựa chọn thanh toán. | `FR-04`, `NFR-02` |
| **2** | *(Tùy chọn)* Khách nhập mã khuyến mãi (VD: `GIAM10`) và nhấn "Áp dụng". | Hệ thống gửi `POST /promotions/preview`, kiểm tra điều kiện áp dụng, trả về số tiền được giảm (`discountAmount`) và cập nhật lại tổng tiền thanh toán hiển thị. | Task 10 / Promotion |
| **3** | *(Tùy chọn)* Khách tick chọn "Dùng điểm cho đơn này" và nhập số điểm muốn đổi. | Hệ thống quy đổi điểm (1 điểm = 1.000đ, tối đa không vượt quá tổng đơn) và tính lại số tiền thanh toán cuối cùng. | Task 10 / Loyalty |
| **4** | Khách chọn phương thức thanh toán (`MOMO` hoặc `CARD`) và nhấn nút xác nhận đặt hàng. | Hệ thống kiểm tra tính hợp lệ của giỏ hàng, điểm thưởng và mã giảm giá ở Client trước khi gọi API. | `FR-05` |
| **5** | Frontend gửi request `POST /orders` tạo đơn hàng. | Hệ thống tạo bản ghi `Order` với trạng thái ban đầu là `PENDING`, lưu trữ danh sách `OrderItem`, tự tính lại tổng tiền từ Database. | `FR-05`, `AC-05.1` |
| **6** | Hệ thống chuyển hướng khách hàng sang màn hình xác nhận thanh toán (`/checkout/qr` đối với MOMO hoặc `/checkout/confirm` đối với CARD). | Frontend sinh mã UUID duy nhất gán vào header `Idempotency-Key` và gửi request `POST /payments`. | `FR-06`, `AC-06.1` |
| **7** | Khách hàng xác nhận thanh toán trên giao diện mô phỏng (hoặc nhận phản hồi callback xác thực). | Backend kiểm tra `Idempotency-Key`, kiểm tra tồn kho, thực thi thanh toán thành công (`SUCCESS`), cập nhật trạng thái đơn hàng từ `PENDING` $\to$ `PAID`. | `FR-06`, `FR-08`, `AC-08.1` |
| **8** | Hệ thống trả về kết quả thanh toán thành công. | Frontend dọn sạch các món đã mua khỏi giỏ hàng (`clearCart`), chuyển hướng khách sang màn hình thành công hiển thị mã đơn hàng. | `FR-03`, `FR-07` |

---

## 5. Các luồng phụ & Ngoại lệ (Alternative & Exception Flows)

### 5.1. Ngoại lệ 1: Khách hàng chưa đăng nhập hoặc Token hết hạn (Unauthenticated)
* **Tại Bước 1:** Frontend kiểm tra không tìm thấy token đăng nhập (`!getAccessToken()`).
* **Xử lý:** Hệ thống tự động chuyển hướng khách hàng về trang đăng nhập: `router.push('/login?redirect=/checkout')`.
* **Kết quả:** Sau khi đăng nhập thành công, khách được đưa trở lại trang checkout với giỏ hàng nguyên vẹn.
* **Mapping:** `FR-04` (AC-04.3), `NFR-02`.

### 5.2. Ngoại lệ 2: Giỏ hàng trống khi truy cập Checkout
* **Tại Bước 1 hoặc 4:** Danh sách món `items.length === 0`.
* **Xử lý:** Hiển thị màn hình thông báo: "Giỏ hàng của bạn đang trống" cùng nút điều hướng "Khám phá thực đơn" (`/`). Khóa không cho thực hiện thao tác thanh toán.
* **Mapping:** `FR-03`, `FR-05` (AC-05.2).

### 5.3. Ngoại lệ 3: Mã giảm giá không hợp lệ hoặc hết hạn
* **Tại Bước 2:** Khách hàng nhập mã không tồn tại, hết hạn hoặc không đủ giá trị đơn tối thiểu (`minOrderTotal`).
* **Xử lý:** API trả lỗi 4xx. Giao diện hiển thị cảnh báo màu đỏ (`promotionError`). Số tiền tạm tính và tổng thanh toán giữ nguyên giá gốc. Khách hàng vẫn có thể tiếp tục thanh toán mà không dùng mã.
* **Mapping:** Task 10 Promotion Validation.

### 5.4. Ngoại lệ 4: Điểm thưởng sử dụng không hợp lệ
* **Tại Bước 3:** Số điểm nhập là số âm, số thập phân hoặc vượt quá `maxRedeemable` (số điểm hiện có hoặc vượt quá giá trị đơn hàng).
* **Xử lý:** Giao diện chặn thanh toán và hiển thị thông báo lỗi: *"Số điểm sử dụng không hợp lệ hoặc vượt số điểm hiện có."*
* **Mapping:** Task 10 Loyalty System.

### 5.5. Ngoại lệ 5: Hết hàng / Không đủ tồn kho (Out of Stock / Concurrency Conflict)
* **Tại Bước 5 hoặc 7:** Khi server xử lý tạo đơn/thanh toán, số lượng nguyên liệu trong bảng `Ingredient` không đủ đáp ứng.
* **Xử lý:** Server từ chối giao dịch, rollback transaction và trả về mã lỗi HTTP `400` hoặc `409 Conflict`. Frontend hiển thị thông báo lỗi chi tiết món hết hàng. Đơn hàng không chuyển sang `PAID`, giỏ hàng được giữ nguyên.
* **Mapping:** `FR-05`, `CV18` (Optimistic locking).

### 5.6. Ngoại lệ 6: Thanh toán thất bại (Payment Failed)
* **Tại Bước 7:** Cổng thanh toán trả về lỗi giao dịch hoặc mô phỏng thất bại.
* **Xử lý:**
  1. Trạng thái bản ghi `Payment` ghi nhận `FAILED`.
  2. Trạng thái bản ghi `Order` chuyển sang `PAYMENT_FAILED`.
  3. **Frontend giữ nguyên giỏ hàng**, không gọi `clearCart()`.
  4. Hiển thị thông báo: *"Thanh toán thất bại. Vui lòng kiểm tra lại phương thức thanh toán."* kèm nút cho phép đổi sang phương thức khác để thử lại.
* **Mapping:** `FR-06`, `FR-08` (AC-08.1), `CV19`.

### 5.7. Ngoại lệ 7: Khách hàng gửi lặp request thanh toán (Replay Request / Network Lag)
* **Tại Bước 6 & 7:** Khách hàng nhấn nút thanh toán nhiều lần liên tục hoặc mạng bị lặp gói tin.
* **Xử lý:** Nhờ header `Idempotency-Key`, Backend kiểm tra khóa đã tồn tại trong bảng `Payment`. Hệ thống trả về ngay kết quả của lần xử lý trước đó mà không trừ tiền/tạo giao dịch lần 2.
* **Mapping:** `FR-06` (AC-06.1, AC-06.3), `NFR-02`.

### 5.8. Ngoại lệ 8: Đơn hàng bị hủy (Order Cancelled)
Trạng thái đơn hàng có thể chuyển thành `CANCELLED` từ trạng thái `PENDING` theo 3 trường hợp:
1. **Khách hàng chủ động hủy:** Khách hàng nhấn "Hủy giao dịch" trên giao diện chờ thanh toán/quét mã QR. Hệ thống cập nhật trạng thái đơn thành `CANCELLED`.
2. **Hệ thống tự động hủy do hết hạn (Timeout):** Mã QR thanh toán chỉ có hiệu lực trong khoảng thời gian xác định (ví dụ: 15 phút). Nếu quá thời gian này mà hệ thống chưa nhận được tín hiệu thanh toán thành công, đơn hàng tự động chuyển sang `CANCELLED` để giải phóng tồn kho.
3. **Nhân viên quầy hủy:** Nhân viên thực hiện thao tác hủy đơn trên trang quản lý (do phát hiện thiếu nguyên liệu pha chế hoặc có yêu cầu trực tiếp từ quầy).
* **Xử lý phía Frontend:** Hiển thị thông báo đơn hàng đã bị hủy, vô hiệu hóa mã QR và cung cấp nút quay lại thực đơn để đặt đơn mới.
* **Mapping:** `FR-08` (AC-08.1).

---

## 6. Lưu ý về cơ chế cập nhật trạng thái qua bên thứ ba (VNPay Sandbox / Webhook)
* Hệ thống tuân thủ nguyên tắc không để Client tự ý chuyển trạng thái đơn sang `PAID`.
* Khi tích hợp Sandbox, backend sẽ mở endpoint nhận Webhook/IPN (Instant Payment Notification). Chỉ khi có chữ ký hợp lệ và phản hồi thành công từ bên thứ ba (VNPay), đơn hàng mới chính thức chuyển từ `PENDING` sang `PAID`.

---

## 7. Bảng ánh xạ Yêu cầu Chức năng (Mapping FR)

| Mã FR | Tên yêu cầu chức năng trong SRS | Điểm chạm trong Use Case Checkout |
| :--- | :--- | :--- |
| **FR-03** | Quản lý giỏ hàng | Lấy danh sách `items`, phân tách dòng theo `itemKey`, giữ nguyên giỏ khi lỗi và xóa giỏ khi thanh toán thành công. |
| **FR-04** | Đăng ký và đăng nhập | Kiểm tra trạng thái đăng nhập (JWT Guard) trước khi cho phép vào giao diện thanh toán. |
| **FR-05** | Tạo đơn hàng | Gửi payload tạo đơn `POST /orders`, server tính lại toàn bộ tiền độc lập từ CSDL và lưu trạng thái ban đầu `PENDING`. |
| **FR-06** | Mô phỏng thanh toán | Gửi `Idempotency-Key` UUID, chọn phương thức MOMO/CARD, xử lý mô phỏng kết quả thành công/thất bại. |
| **FR-07** | Xem lịch sử đơn hàng | Sau khi thanh toán hoàn tất, đơn hàng xuất hiện trong danh sách đơn của người dùng (`GET /orders/me`). |
| **FR-08** | Quản lý trạng thái đơn hàng | Quản lý chuyển đổi trạng thái nghiêm ngặt: `PENDING` $\to$ `PAID` (thành công), `PENDING` $\to$ `PAYMENT_FAILED` (thất bại), hoặc `PENDING` $\to$ `CANCELLED` (3 trường hợp hủy). |