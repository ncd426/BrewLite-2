# Ma trận truy vết BrewLite — A2-29

Đối chiếu ngày **14/11/2026**, baseline code `506eaeb`. Ma trận nối yêu cầu → use case/user story → UML → mã nguồn → kiểm thử. Có đường dẫn đến một test nghĩa là có kịch bản kiểm chứng trong repo; kết quả thực chạy, số test bị skip và giới hạn môi trường nằm trong [biên bản kiểm tra hệ thống][verification]. Không suy ra nghiệm thu toàn bộ AC từ một test backend hoặc một HTTP smoke thành công.

## Nguồn và quy ước định danh

- [SRS](requirements/srs.md) là baseline **FR-01…FR-10**, **NFR-01…NFR-04** và các AC tương ứng. [requirements.md](requirements/requirements.md) giữ inventory **REQ-001…REQ-007** cũ; bảng dưới đối chiếu các mã này, không ngầm đổi số REQ thành FR.
- [Đặc tả checkout](requirements/use-case-checkout.md) có ID chính thức **UC-CHECKOUT**. `Browse`, `Product`, `Auth`, `Cart`… là alias trong [UML tổng quan][overview], chưa có đặc tả UC riêng; alias không phải UC-ID đã được phê duyệt.
- **US-01…US-20** ở [catalog bên dưới](#catalog-user-story) được tóm tắt từ bản báo cáo cục bộ `output/bao-cao/source/us-traceability.tex` (báo cáo 11/11/2026, tham chiếu A1). Tệp User Stories DOCX gốc và xác nhận PO không nằm trong baseline Git được đối chiếu. Catalog giữ số story để review, chưa thay thế AC của bản gốc; PR này không phụ thuộc việc commit `output/`.
- **Có test**: có kiểm thử tự động được chỉ rõ; **thủ công**: cần thao tác trình duyệt/minh chứng; **còn thiếu**: chưa đủ kết luận đạt AC. Các sai khác mô hình/code/tiêu chí được ghi rõ, không tự đánh dấu Done.

## FR → UC/US → UML → code → test

| FR / REQ / AC | UC và US | UML liên quan | Mã nguồn triển khai | Kiểm thử và phần còn thiếu |
| --- | --- | --- | --- | --- |
| **FR-01** Menu; REQ-001; AC-01.1–01.2 | `Browse`; US-01 | [Overview][overview] `Browse`; [Activity][activity] bước menu; [Class][class] `Product` | [Web menu](../apps/web/app/page.tsx); [ProductsService][products] `findAll` | [products.service.spec.ts][products-test]: menu, danh sách rỗng, lỗi DB; [API E2E][e2e]: đọc menu có hàng. Test service mock Prisma; loading/empty/error trên web cần kiểm tra trình duyệt. |
| **FR-02** Chi tiết/tùy chọn; REQ-002 và phần tùy chọn REQ-003; AC-02.1–02.3 | `Product`; US-02, US-03 | [Overview][overview] `Product`; [Class][class] `Product`, `OrderItem` | [Trang sản phẩm][product-page]; [ProductsService][products] `findOne`; [pricing.ts][pricing] | [products.service.spec.ts][products-test]: ID hợp lệ/404; [orders.http.spec.ts][orders-test]: giá server. **Còn thiếu:** API không trả size/topping riêng cho sản phẩm, web dùng hằng `SIZE_OPTIONS`/`TOPPING_OPTIONS`. Chưa chứng minh đủ AC-02.1/02.3; cần UI test trang 404 và tùy chọn. |
| **FR-03** Giỏ hàng; REQ-003; AC-03.1–03.3 | `Cart`; UC-CHECKOUT tiền điều kiện, bước 1/8; US-03–US-05 | [Overview][overview] `Cart`; [Activity][activity] giỏ rỗng; [Sequence][sequence] dọn giỏ (luồng payment còn lệch) | [useCartStore.ts][cart-store]; [Trang sản phẩm][product-page]; [Trang giỏ](../apps/web/app/cart/page.tsx); [Trang QR](../apps/web/app/checkout/qr/page.tsx) | **Thủ công:** gộp/tách cấu hình, tăng/giảm/xóa, tổng tiền, tải lại, giữ giỏ khi lỗi, chỉ xóa món đã mua. Chưa có unit test cart store/browser E2E; API E2E không kiểm tra Zustand/localStorage. |
| **FR-04** Đăng ký/đăng nhập; REQ-004; AC-04.1–04.3 | `Auth`; UC-CHECKOUT bước 1, ngoại lệ 5.1; US-06, US-07 | [Overview][overview] `Auth`; [Activity][activity] đăng nhập; [Sequence][sequence] JWT; [Class][class] `User` | [Login UI](../apps/web/app/login/page.tsx); [AuthService](../apps/api/src/auth/auth.service.ts); [JWT strategy](../apps/api/src/auth/strategies/jwt.strategy.ts); [JwtAuthGuard](../apps/api/src/common/guards/jwt-auth.guard.ts) | [auth.service.spec.ts](../apps/api/src/auth/auth.service.spec.ts), [auth.http.spec.ts](../apps/api/src/auth/auth.http.spec.ts): hash, JWT, email/tên chuẩn hóa, sai mật khẩu, thiếu token; chưa có test riêng cho email chuẩn hóa bị trùng (AC-04.1); [auth E2E](../apps/api/tests/e2e/order-flow-auth.e2e-spec.ts): thiếu/sai JWT. Chuyển về checkout và giữ giỏ cần UI test. |
| **FR-05** Tạo đơn; phần tạo đơn REQ-005; AC-05.1–05.3 | `PlaceOrder`, `ValidateOrder`; UC-CHECKOUT bước 4–5, ngoại lệ 5.2/5.5; US-08, US-16 | [Checkout UC][checkout-uml] `ValidateCart`, `CalculateAmount`, `CheckStock`, `SavePending`; [Activity][activity]; [Sequence][sequence]; [Class][class] `Order`, `OrderItem`, nguyên liệu | [OrdersController](../apps/api/src/orders/orders.controller.ts); [OrdersService][orders] `create`; [pricing.ts][pricing]; [recipe-inventory.ts](../apps/api/src/inventory/recipe-inventory.ts); [schema.prisma][schema] | [orders.http.spec.ts][orders-test]: 201, giá server, sản phẩm sai, thiếu tồn; [orders.concurrency.int.spec.ts](../apps/api/src/orders/orders.concurrency.int.spec.ts): 10 người mua tranh tồn PostgreSQL; [recipe-inventory.spec.ts](../apps/api/src/inventory/recipe-inventory.spec.ts); [API E2E][e2e]: order/items `PENDING`. Test DB phải bật `RUN_DB_INTEGRATION=1`; mock concurrency không chứng minh cạnh tranh DB thật. |
| **FR-06** VNPay Sandbox; REQ-006 là mock lịch sử; AC-06.1–06.4 | `Pay`, `VerifyPayment`, `ProcessPayment`, `RecordPayment`, `Retry`; UC-CHECKOUT bước 6–7, ngoại lệ 5.6/5.7; US-09, US-10, US-15 | [Overview][overview] ghi VNPay; [Checkout UC][checkout-uml], [Activity][activity], [Sequence][sequence] còn trộn mô phỏng/IPN (G-02) | [PaymentsController](../apps/api/src/payments/payments.controller.ts); [PaymentsService][payments] `processPayment`, `handleVnpayIpn`, `expirePendingPayments`; [payment-gateways.ts](../apps/api/src/payments/payment-gateways.ts); [webhook controller](../apps/api/src/payments/payments-webhook.controller.ts); [QR UI](../apps/web/app/checkout/qr/page.tsx) | [payments.http.spec.ts](../apps/api/src/payments/payments.http.spec.ts): pending intent, validation, client không tự settle; [payments.service.spec.ts][payments-test]: IPN hợp lệ/sai chữ ký, expiry, amount mismatch, replay; [gateway signing](../apps/api/src/payments/payment-gateways.spec.ts); [idempotency DB][idempotency-test], [concurrent DB][payment-concurrent-test]. **Còn thiếu AC-06.3:** sau `PAID`, service kiểm tra payable trước tra key nên cùng key trả 409. Chưa có browser/cổng VNPay E2E thật; REQ-006 không tương đương nguyên trạng FR-06. |
| **FR-07** Lịch sử/chi tiết/xác nhận; phần lịch sử REQ-005, REQ-007; AC-07.1–07.3 | `History`; UC-CHECKOUT hậu điều kiện, bước 8; US-11, US-12 | [Overview][overview] `History`; [Activity][activity] theo dõi; [Sequence][sequence] mục 4; [Class][class] `User`–`Order` | [Orders UI](../apps/web/app/orders/page.tsx); [Success UI](../apps/web/app/checkout/success/page.tsx); [OrdersService][orders] `getMyOrders`, `getOrderById` | [orders.history.spec.ts](../apps/api/src/orders/orders.history.spec.ts): lọc người dùng, danh sách rỗng, chi tiết, đơn không tồn tại/của người khác; [persistence E2E](../apps/api/tests/e2e/order-flow-persistence.e2e-spec.ts): items/history. Sau thanh toán/trạng thái mới nhất trên web cần demo/UI test; API E2E hiện chỉ đến đơn `PENDING`. |
| **FR-08** Trạng thái đơn; AC-08.1–08.4 | `ManageOrders`, `RecordPayment`, `Retry`; UC-CHECKOUT bước 7/ngoại lệ; US-10, US-14, US-20 | [Overview][overview] `ManageOrders`; [Class][class] `OrderStatus`; [Activity][activity]/[Sequence][sequence] thiếu hủy/expiry hiện tại | [order-state-machine.ts](../apps/api/src/orders/order-state-machine.ts); [order-cancellation.ts](../apps/api/src/orders/order-cancellation.ts); [OrdersService][orders] `cancelMyOrder`; [BackofficeService](../apps/api/src/backoffice/backoffice.service.ts) `advanceOrder`, `cancelOrder`; [Staff UI](../apps/web/app/staff/page.tsx) | [state machine tests](../apps/api/src/orders/order-state-machine.spec.ts): cạnh hợp lệ/sai, terminal, xung đột trạng thái; [cancellation tests](../apps/api/src/orders/order-cancellation.spec.ts), [cancellation HTTP](../apps/api/src/orders/orders.cancellation.http.spec.ts): hủy/hoàn tồn một lần; [role tests][roles-test], [customer-only tests](../apps/api/src/backoffice/customer-only.http.spec.ts). Test state concurrency dùng dữ liệu giả, chưa phải hai worker DB thật cho AC-08.3. |
| **FR-09** Khuyến mãi; AC-09.1–09.3 | `Promotion`; UC-CHECKOUT bước 2, ngoại lệ 5.3; US-17 | [Overview][overview] `Promotion`; [Checkout UC][checkout-uml] `PreviewPromotion`, `CalculateAmount`; [Sequence][sequence] preview; [Class][class] `Promotion` | [Checkout UI](../apps/web/app/checkout/page.tsx); [promotion-preview.service.ts](../apps/api/src/orders/promotion-preview.service.ts); [promotion-rule.ts](../apps/api/src/orders/promotion-rule.ts); [OrdersService][orders] `create` | [promotion-rule.spec.ts](../apps/api/src/orders/promotion-rule.spec.ts): FIXED/PERCENT, min total, active/date, không âm; [promotion-preview.int.spec.ts](../apps/api/src/orders/promotion-preview.int.spec.ts): quote từ DB, không giữ tồn, tạo đơn có giảm; [promotion/loyalty DB](../apps/api/src/payments/payments.promotion-loyalty.int.spec.ts). Chưa có quota/lịch sử dùng mã từng người cho nhánh “mã đã dùng” US-17 trong báo cáo A1; nhánh đó chưa nằm trong AC FR-09 hiện tại. |
| **FR-10** Điểm thưởng; AC-10.1–10.4 | `Profile`, `RedeemPoints`, `AwardPoints`; UC-CHECKOUT bước 1/3/7; US-18 | [Overview][overview]; [Checkout UC][checkout-uml]; [Class][class] `User`, `Payment`, `Order`; `LoyaltyTransaction` chỉ là khái niệm | [Profile UI](../apps/web/app/profile/page.tsx); [UsersService](../apps/api/src/users/users.service.ts) `findPublicById`; [loyalty-points.ts](../apps/api/src/payments/loyalty-points.ts); [PaymentsService][payments] `settleProviderPayment`; [schema.prisma][schema] | [loyalty-points.spec.ts](../apps/api/src/payments/loyalty-points.spec.ts): 1 điểm/10.000 VND, không cộng khi lỗi/lặp; [redemption DB](../apps/api/src/payments/payments.loyalty-redemption.int.spec.ts): 1.000 VND/điểm, thiếu điểm, không trừ khi lỗi, key khác dữ liệu; [concurrent DB][payment-concurrent-test]. Profile/đổi điểm trên web cần UI test. Không có bảng ledger `LoyaltyTransaction` trong Prisma. |

## NFR và phần mở rộng vận hành

| Yêu cầu / US | UC và UML | Code / cấu hình | Kiểm chứng và giới hạn |
| --- | --- | --- | --- |
| **NFR-01** Hiệu năng; US-19 | `Browse`, `History`, `PlaceOrder`, `Pay`; [Deployment][deployment-uml] là mô hình cũ | [ProductsService][products], [OrdersService][orders], [PaymentsService][payments] | Chưa có bài load 100 VU/10 phút và báo cáo p50/p95/p99/5xx theo AC-NFR-01.1–01.2. Số đo smoke local lịch sử không chứng minh mục tiêu này. Cần PO/ops chốt mục tiêu rồi chạy/lưu báo cáo. |
| **NFR-02** Bảo mật; US-19 | `Auth`, `VerifyPayment`; [Sequence][sequence] JWT; [Class][class] `User` | [AuthService](../apps/api/src/auth/auth.service.ts), [JWT guard](../apps/api/src/common/guards/jwt-auth.guard.ts), [RolesGuard](../apps/api/src/common/guards/roles.guard.ts), [main.ts](../apps/api/src/main.ts), [payment-gateways.ts](../apps/api/src/payments/payment-gateways.ts) | Auth/ownership/role/payment negative tests trong FR-04/06/07/08. Unit tests chưa chứng minh toàn bộ secrets/log production đã được rà soát; runtime/cấu hình cần bằng chứng riêng. |
| **NFR-03** Khả dụng/phục hồi; US-13, US-19 | Không có UC nghiệp vụ riêng; [Deployment][deployment-uml] cần đồng bộ Render | [Compose](../docker-compose.yml); [health controller](../apps/api/src/app.controller.ts); [deploy guide](deployment.md) | [Compose 10/11](evidence/compose-database-health-2026-11-10.md), [CI/CD 14/11][cd-evidence] là ảnh chụp thời điểm. Chưa có probe theo tháng cho SLA 99,5% hoặc đo restart <=5 phút đầy đủ. Smoke HTTP 200 không chứng minh SLA. |
| **NFR-04** Compose/migration/seed/production; US-13 | [Deployment][deployment-uml] còn production TBD; [Class][class] ↔ [Prisma][schema] | [Compose](../docker-compose.yml); [migration/seed guide](database-migrations.md); [API Dockerfile](../apps/api/Dockerfile); [Web Dockerfile](../apps/web/Dockerfile); [CI](../.github/workflows/ci.yml); [CD](../.github/workflows/cd.yml) | [seed-data.test.mjs](../apps/api/prisma/seed-data.test.mjs) kiểm fixture; [Sprint 1 evidence](evidence/sprint-1/README-evidence.txt) ghi seed inventory lặp; [CI/CD 14/11][cd-evidence] ghi SHA/digest/smoke. Tái tạo DB, restart giữ volume, thời gian khởi động và secrets production đánh giá theo AC tại [kiểm tra hệ thống][verification]. |
| **US-16** Không vượt tồn (hỗ trợ FR-05) | `ValidateOrder`; [Checkout UC][checkout-uml] `CheckStock`; [Class][class] `Ingredient`, `ProductIngredient` | [OrdersService][orders] transaction/conditional decrement; [recipe-inventory.ts](../apps/api/src/inventory/recipe-inventory.ts) | [orders.concurrency.int.spec.ts](../apps/api/src/orders/orders.concurrency.int.spec.ts) dùng PostgreSQL thật khi bật cờ DB; hoàn tồn khi hủy có test riêng trong FR-08. |
| **US-20** Nhân viên/barista ngoài MVP A1; hỗ trợ FR-08 | `ManageOrders`, `CounterSale`, `ManageCatalogInventory`, `ManageRoles`; [Overview][overview]; [Class][class] `UserRole`, `OrderChannel` | [BackofficeService](../apps/api/src/backoffice/backoffice.service.ts); [counter-sales.service.ts](../apps/api/src/backoffice/counter-sales.service.ts); [Staff UI](../apps/web/app/staff/page.tsx); [POS UI](../apps/web/app/staff/sales/page.tsx); [Admin UI](../apps/web/app/admin/page.tsx) | [role HTTP tests][roles-test]; [counter-sales tests](../apps/api/src/backoffice/counter-sales.service.spec.ts): PAID/SUCCESS, idempotency, thiếu tồn; [backoffice tests](../apps/api/src/backoffice/backoffice.service.spec.ts). Phần mở rộng không thay nghiệm thu luồng khách hàng/payment Sandbox. |

## Catalog User Story

Bảng đối chiếu theo số story trong báo cáo A1 cục bộ, không tự bổ sung AC của DOCX gốc. **US-09/10/15/17** cần review đặc biệt do khác baseline hoặc giới hạn hiện thực nêu trên.

| US | Nội dung tóm tắt | FR/NFR hoặc phạm vi |
| --- | --- | --- |
| US-01 | Xem menu đồ uống | FR-01 |
| US-02 | Xem chi tiết sản phẩm | FR-02 |
| US-03 | Chọn size/topping và xem giá | FR-02, FR-03, FR-05 |
| US-04 | Thêm/gộp dòng và giữ giỏ | FR-03 |
| US-05 | Sửa số lượng, xóa, tính tổng giỏ | FR-03 |
| US-06 | Đăng ký tài khoản | FR-04 |
| US-07 | Đăng nhập để tiếp tục checkout | FR-04 |
| US-08 | Tạo đơn hàng | FR-05 |
| US-09 | Thanh toán không tiền mặt (A1: mock Ví/Thẻ; code: VNPay Sandbox) | FR-06; khác REQ-006, cần xác nhận thay đổi phạm vi |
| US-10 | Thanh toán lỗi và thử lại | FR-06, FR-08 |
| US-11 | Xác nhận đặt hàng | FR-07, REQ-007 |
| US-12 | Lịch sử/chi tiết đơn của mình | FR-07 |
| US-13 | Chạy/bàn giao bằng Compose | NFR-03, NFR-04 |
| US-14 | State machine đơn hàng | FR-08 |
| US-15 | Idempotency thanh toán | FR-06 |
| US-16 | Đặt đồng thời không vượt tồn | FR-05 |
| US-17 | Kiểm tra khuyến mãi | FR-09; nhánh mã đã dùng chưa có trong schema |
| US-18 | Tích điểm sau thanh toán | FR-10; đổi điểm là khả năng hiện có được SRS mô tả thêm |
| US-19 | Bảo mật, hiệu năng, khả dụng, giao diện | NFR-01…NFR-04; chưa có bằng chứng PWA offline/browser matrix đầy đủ |
| US-20 | Vận hành nhân viên/barista | Ngoài MVP A1; hỗ trợ FR-08 |

## Khoảng trống cần chốt khi review

Phụ trách đề nghị theo [backlog A2](team/a2-backlog.md), chưa phải xác nhận đã hoàn thành. Kết quả và ý kiến ba thành viên ghi tại [Sprint Review & Retrospective](team/sprint-review-retrospective.md).

| Mã | Khoảng trống / ảnh hưởng | Bước tiếp theo / phụ trách đề nghị |
| --- | --- | --- |
| G-01 | Chưa có US DOCX gốc/AC và xác nhận đổi mock sang VNPay trong baseline | Khoa đối chiếu US gốc và quyết định phạm vi với PO; giữ REQ-006 là lịch sử đến khi có quyết định. |
| G-02 | UC §5.8 nói chưa hủy/expiry nhưng §6/code đã có; activity/sequence/checkout UML còn mô phỏng/IPN lẫn nhau | Danh/Bảo đồng bộ `.puml`, render lại `.svg`, review với service và IPN sai/expiry/hủy. Chữ ký sai phải bị từ chối, không tự ghi thanh toán thất bại chỉ vì chữ ký sai. |
| G-03 | Deployment UML ghi production/registry TBD, khác bằng chứng Render/GHCR | Bảo/Khoa đồng bộ source + SVG với hạ tầng, dẫn release evidence. |
| G-04 | FR-02 AC options từ API chưa khớp hằng phía web | Danh/Khoa thống nhất hợp đồng options hoặc sửa AC có phê duyệt; kiểm thử UI/giá server. |
| G-05 | FR-06 AC-06.3/US-15: replay sau `PAID` bị 409 | Danh/Bảo xác minh hợp đồng, test same-key sau IPN thành công và xử lý trong PR chức năng riêng. Kết quả DB payment hiện còn bị chặn bởi fixture IPN (G-10), chưa được coi là PASS. |
| G-06 | Chưa có browser E2E; API E2E chỉ tới đơn `PENDING` | Bảo lưu demo menu → giỏ → login → đặt → VNPay → xác nhận/lịch sử; thêm fail/retry/hủy/mobile theo A2-23/A2-28. |
| G-07 | Chưa có load/SLA/restart đáp ứng hết NFR-01/NFR-03 | Danh/Khoa chốt môi trường/mục tiêu, lưu kết quả đo; không đánh dấu đạt từ health/smoke. |
| G-08 | Nhánh “mã đã dùng” US-17; ledger `LoyaltyTransaction` chỉ khái niệm | Khoa chốt phạm vi quota/usage/ledger, không tính là model đã lưu hoặc AC đã test. |
| G-09 | File tài liệu chưa tự chứng minh PR review/demo/đóng góp thực tế ba thành viên | Hoàn thiện link/xác nhận trong [biên bản Sprint](team/sprint-review-retrospective.md) và [PR docs](pr-a2-29.md); reviewer chốt A2-29 theo bằng chứng. |
| G-10 | Full DB suite có 9 test payment lỗi: fixture 4 suite thiếu `PaymentsWebhookController`, IPN trả 404 | Bảo sửa đăng ký webhook trong test app, chạy lại toàn bộ DB suite; chưa dùng kết quả hiện tại để nghiệm thu FR-06/FR-09/FR-10. Chi tiết tên suite tại [system verification][verification]. |
| G-11 | `orders.concurrency.int.spec.ts` thất bại: Prisma `P2028`, 9 HTTP 500 khi 10 người mua cạnh tranh; chạy riêng vẫn lỗi | Danh/Bảo điều tra thời gian chờ transaction/pool và hợp đồng lỗi khi cạnh tranh, chạy lại PostgreSQL concurrency; FR-05/US-16 chưa đạt kiểm chứng này. |

## Kết quả kiểm tra ngày 14/11/2026

Kết quả do lượt kiểm tra hệ thống của đợt A2-29 ghi nhận, khác các log Sprint 1 lịch sử. Toàn bộ lệnh/môi trường/log và bước chưa chạy được lưu trong [system verification][verification].

| Phạm vi | Kết quả ghi nhận | Ý nghĩa cho ma trận |
| --- | --- | --- |
| API mặc định (chưa bật toàn bộ DB integration) | 143 test PASS, 18 SKIP | Không tính 18 test bị bỏ qua là bằng chứng đạt yêu cầu DB. |
| API full DB integration | 20 suite PASS, 5 suite FAIL; 151 test PASS, 10 FAIL / 161 | 9 lỗi payment fixture/IPN 404 (G-10), 1 lỗi stock concurrency/P2028 (G-11); chưa đạt quality gate toàn bộ hệ thống. |
| API E2E | 3/3 PASS | Đăng ký/menu/JWT/tạo và đọc đơn/lịch sử; dừng ở `PENDING`, chưa kiểm chứng thanh toán/xác nhận web. |
| Seed fixtures | 8/8 PASS | Tính nhất quán fixture; không thay kiểm tra restart/persistence/production seed. |
| CD adapter offline | 9/9 PASS | Kiểm thử Python không gọi Render; không chứng minh deploy production của PR này. |
| API build, Web build | PASS | Biên dịch thành công; không thay kiểm thử hành vi hoặc đóng các khoảng trống AC. |

## Chạy kiểm chứng

Từ repo root, theo [README](../README.md) để chuẩn bị dependency, DB test riêng `localhost:5434/brewlite_test` và `apps/api/.env.test`. Setup reset **DB test riêng**; không đổi URL sang DB local/production. Luồng isolated/E2E sau đây chạy **không bật** DB integration; các lệnh không phải kết quả PASS sẵn:

```powershell
Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
npm --prefix apps/api run test:db:setup
npm --prefix apps/api run test:isolated
npm --prefix apps/api run test:e2e
node --test apps/api/prisma/seed-data.test.mjs
python -m unittest discover -s scripts/cd -p 'test_*.py'
```

Full DB integration dùng **DB thứ hai** có tên `brewlite_task10_*` trên service `db-test`, migrate riêng rồi bật `RUN_DB_INTEGRATION=1` và chạy trực tiếp `npm test -- --runInBand` trong `apps/api`, theo [README — DB integration](../README.md#db-integration-cạnh-tranh-idempotency-promotion-loyalty). Không bật cờ này qua `test:isolated`: guard của runner bắt buộc `/brewlite_test`, trong khi guard của các suite integration yêu cầu tên DB khác.

Lint/build, smoke deploy, rollback nằm trong [README](../README.md), [deployment.md](deployment.md), [database-migrations.md](database-migrations.md). [System verification][verification] ghi kết quả thực chạy 14/11/2026 và các phần chưa chạy; [CI/CD lịch sử][cd-evidence] không tự trở thành test run của PR này.

[overview]: diagrams/usecase-overview.puml
[checkout-uml]: diagrams/usecase-checkout.puml
[activity]: diagrams/activity-checkout.puml
[sequence]: diagrams/sequence-checkout.puml
[class]: diagrams/class-domain.puml
[deployment-uml]: diagrams/deployment.puml
[products]: ../apps/api/src/products/products.service.ts
[product-page]: <../apps/web/app/products/[id]/page.tsx>
[cart-store]: ../apps/web/lib/useCartStore.ts
[pricing]: ../apps/api/src/orders/pricing.ts
[orders]: ../apps/api/src/orders/orders.service.ts
[payments]: ../apps/api/src/payments/payments.service.ts
[schema]: ../apps/api/prisma/schema.prisma
[products-test]: ../apps/api/src/products/products.service.spec.ts
[orders-test]: ../apps/api/src/orders/orders.http.spec.ts
[payments-test]: ../apps/api/src/payments/payments.service.spec.ts
[idempotency-test]: ../apps/api/src/payments/payments.idempotency.int.spec.ts
[payment-concurrent-test]: ../apps/api/src/payments/payments.concurrent.int.spec.ts
[roles-test]: ../apps/api/src/backoffice/roles-access.http.spec.ts
[e2e]: ../apps/api/tests/e2e/order-flow.e2e-spec.ts
[verification]: evidence/sprint-2/system-verification-2026-11-14.md
[cd-evidence]: evidence/sprint-2/a2-25-ci-cd-production.md
