# Sprint Review & Retrospective — BrewLite Assignment 2

> **A2-29 · Bản tổng hợp kỹ thuật, chờ nhóm xác nhận.**
> Baseline code: `506eaeb`. Tài liệu ghi nhận sản phẩm và đóng góp có thể đối chiếu trong repository. Thông tin cuộc họp, phản hồi và quyết định thực tế còn chờ xác nhận.

## Phạm vi và nguồn đối chiếu

- [Backlog A2](a2-backlog.md): Sprint 1 gồm Task 1–4; Sprint 2 gồm Task 5. Thứ tự Gate theo kế hoạch cần được đối chiếu với hồ sơ review thực tế.
- [Bảng phân công gốc](https://docs.google.com/spreadsheets/d/131s5akKM1lP_xvgYH4q4W3_8CoGzghcEBhnSk6t5YXo/edit?gid=433607833): tab **Tổng quan** có ba thành viên, mỗi người 10 đầu việc; tab **Phân công 5 ngày** ghi phạm vi và trạng thái công việc.
- [Kickoff](a2-kickoff.md), [bản xác nhận kickoff](a2-kickoff-confirmation.md) và [Definition of Done](a2-definition-of-done.md) đang ghi trạng thái dự thảo/chờ xác nhận.
- [Ma trận FR → UC/US → UML → code → test](../traceability-matrix.md) xác định bằng chứng và khoảng trống; [kiểm tra hệ thống](../evidence/sprint-2/system-verification-2026-11-14.md) ghi kết quả chạy lại cùng giới hạn môi trường.
- Các commit và PR dưới đây lấy từ lịch sử Git. Merge commit không tự chứng minh đã có người khác approve.

## Sprint Review

### Sprint 1: yêu cầu, UML, kiến trúc, menu và CI

**Mục tiêu:** làm rõ yêu cầu và thiết kế, đưa menu MVP vào quy trình PR/CI để làm nền cho checkout. Mục tiêu lấy từ backlog, chưa có biên bản Sprint Planning xác nhận.

| Hạng mục | Increment và bằng chứng | Giới hạn nghiệm thu |
| --- | --- | --- |
| Task 1 — Context/SRS/use case | [Context/scope](../requirements/context-and-scope.md), [SRS](../requirements/srs.md), [checkout UC](../requirements/use-case-checkout.md), [use-case UML](../diagrams/usecase-overview.puml). Commit `d8ac4b6`, `8de2f8a`, `92e2d58`. | Cần hồ sơ review/phê duyệt Gate Task 1. |
| Task 2 — UML hành vi/domain | [Activity](../diagrams/activity-checkout.puml), [sequence](../diagrams/sequence-checkout.puml), [class](../diagrams/class-domain.puml) cùng SVG. Commit `6f623c9`, `40113d7`, `5ec9653`; `3d3be10` chỉnh lý ba sơ đồ. | Cần đối chiếu code theo ma trận và xác nhận Gate Task 2. |
| Task 3 — Kiến trúc/deployment | [Overview/ADR](../architecture/overview.md), [deployment](../diagrams/deployment.puml); commit `49d8349`, `9f67272`; PR [#39](https://github.com/ncd426/BrewLite-2/pull/39), [#41](https://github.com/ncd426/BrewLite-2/pull/41). | ADR-003 còn mô tả mock MOMO/CARD trong khi SRS/code dùng VNPay Sandbox; cần đồng bộ quyết định kiến trúc. |
| Task 4 — Menu MVP và CI | [Smoke API](../evidence/sprint-1/api-smoke-results.json), [ảnh menu](../evidence/sprint-1/menu-demo.png), [PR-status](../evidence/sprint-1/PR-status.txt); commit `23504ee`, `0a5d5e6`. [CI evidence](../evidence/sprint-1/ci-evidence.md) ghi FAIL có kiểm soát rồi PASS tại PR [#46](https://github.com/ncd426/BrewLite-2/pull/46). | Cần hồ sơ review/Gate Task 4 và xác nhận required checks; bằng chứng lịch sử không thay kết quả chạy lại. |

`README-evidence.txt` vẫn ghi “No Sprint 1 PR”, nhưng `PR-status.txt` đã có PR [#45](https://github.com/ncd426/BrewLite-2/pull/45), và Git có merge `e56c690` (#45), `57f588f` (#47). Các log `docker-compose.log`, `docker-build.log`, `screenshot-capture.log` được liệt kê nhưng không có trong bộ file Git đã đối chiếu; chưa coi là evidence đính kèm.

### Sprint 2: kiểm thử, database, CD và bàn giao

**Mục tiêu:** hoàn thiện luồng khách mua hàng và hồ sơ phát hành sau Gate Task 4.

| Hạng mục | Increment và bằng chứng | Giới hạn nghiệm thu |
| --- | --- | --- |
| Luồng mua hàng/thanh toán | `57bb839` chuyển checkout online sang VNPay; `ad42796` sửa tự thử lại sau thất bại. Xem [SRS](../requirements/srs.md), [ma trận](../traceability-matrix.md). | Cần xác nhận thay đổi baseline mock và video demo hoàn chỉnh. |
| A2-23 — Kiểm thử API/DB | `9a40d25` thêm runner/DB riêng. E2E hiện nằm tại `tests/e2e/`. [Log unit/integration lịch sử](../evidence/sprint-1/unit-integration-tests.log): 19 suites PASS/6 skipped, 132 tests PASS/18 skipped. [Log E2E lịch sử](../evidence/sprint-1/e2e-order-flow.log): 3 suites/3 tests PASS. | E2E dừng ở đơn `PENDING`, không gọi `/payments` hoặc chạy trình duyệt; không chứng minh thanh toán thành công/thất bại. Test skip chưa được coi là PASS. |
| A2-24 — Migration/seed/Compose | `997db6d` ghi [bằng chứng local](../evidence/compose-database-health-2026-11-10.md): 9 migrations, seed lặp không tạo bản ghi, backend/DB healthy và `/health` 200. | Đối chiếu thêm lượt tái tạo DB/restart trong báo cáo hệ thống; không thay evidence migration production. |
| A2-25/26 — CI/CD/HTTPS | `94f9e6d`, `237b633` bổ sung GHCR/Render và smoke. [Hồ sơ production](../evidence/sprint-2/a2-25-ci-cd-production.md) ghi run [#43549122315](https://github.com/ncd426/BrewLite-2/actions/runs/43549122315) thành công cho `8b9b060`, web/API HTTPS 200. | Health/smoke không thay E2E. Hồ sơ ghi `RENDER_DEPLOY_ENABLED=false` sau kiểm tra; cần đối chiếu cấu hình thật khi release. |
| A2-27 — Rollback | Hồ sơ production liên kết các run phục hồi sau thử rollback frontend; [runbook](../deployment.md) hướng dẫn bàn giao. | Chưa có drill rollback API + restore DB production. |
| A2-29/30 — Tài liệu/release | Ma trận, README, bản Review/Retro và [PR docs](../pr-a2-29.md). | Chờ xác nhận sự kiện, reviewer, các evidence còn thiếu và release/tag/video trước Gate Task 5. |

Lượt full DB được ghi trong [báo cáo hệ thống](../evidence/sprint-2/system-verification-2026-11-14.md) còn lỗi: bốn payment suite thiếu `PaymentsWebhookController` trong fixture nên IPN trả 404; `orders.concurrency` gặp `P2028`/HTTP 500 và chạy riêng vẫn tái hiện. Không dùng log PASS cũ thay kết quả này hoặc kết luận toàn bộ Gate đã đạt.

## Đóng góp của ba thành viên

Các nhãn dưới đây gắn với ba phạm vi công việc trong bảng phân công. Commit là bằng chứng thay đổi kỹ thuật; mỗi thành viên cần xác nhận phần đóng góp tương ứng và nội dung đã trình bày. Không quy đổi số commit hoặc đầu việc thành tỷ lệ công sức.

| Thành viên / vai trò | Đóng góp kỹ thuật có bằng chứng | Xác nhận còn thiếu |
| --- | --- | --- |
| Thành viên 1 — Điều phối/CI-CD | [d2a64bb](https://github.com/ncd426/BrewLite-2/commit/d2a64bb) backlog/kickoff/DoD; [6f623c9](https://github.com/ncd426/BrewLite-2/commit/6f623c9) activity; [49d8349](https://github.com/ncd426/BrewLite-2/commit/49d8349) overview/ADR; [0a5d5e6](https://github.com/ncd426/BrewLite-2/commit/0a5d5e6) CI; [237b633](https://github.com/ncd426/BrewLite-2/commit/237b633) Render/smoke; [c846819](https://github.com/ncd426/BrewLite-2/commit/c846819) hồ sơ production. | Phần đóng góp/trình bày thực tế và sign-off Review/Retro. |
| Thành viên 2 — Yêu cầu/UML/E2E | [8de2f8a](https://github.com/ncd426/BrewLite-2/commit/8de2f8a) scope/UC; [40113d7](https://github.com/ncd426/BrewLite-2/commit/40113d7) sequence; [9f67272](https://github.com/ncd426/BrewLite-2/commit/9f67272) deployment; [23504ee](https://github.com/ncd426/BrewLite-2/commit/23504ee) menu/log; [9a40d25](https://github.com/ncd426/BrewLite-2/commit/9a40d25) runner DB và E2E. | Phần đóng góp/trình bày thực tế và phản hồi Review/Retro. |
| Thành viên 3 — SRS/DB/truy vết | [d8ac4b6](https://github.com/ncd426/BrewLite-2/commit/d8ac4b6) SRS/use case; [5ec9653](https://github.com/ncd426/BrewLite-2/commit/5ec9653) class; [57bb839](https://github.com/ncd426/BrewLite-2/commit/57bb839) VNPay; [461d5a1](https://github.com/ncd426/BrewLite-2/commit/461d5a1) Docker health; [997db6d](https://github.com/ncd426/BrewLite-2/commit/997db6d) migration/seed/Compose. | Phần đóng góp/trình bày thực tế và xác nhận tài liệu A2-29. |

Có thể đối chiếu phạm vi thay đổi bằng `git show --stat <commit>`. Việc trình bày demo hoặc phản hồi tại sự kiện Scrum cần nguồn xác nhận riêng.

### Trạng thái bảng phân công

Tab **Phân công 5 ngày** có các cột **H = Trạng thái, I = Tiến độ, J = Link PR/tài liệu, K = Giờ, M = Review xác nhận, N = Tiêu chí**; khác ghi chú I/K/N trong backlog/DoD bản cũ.

| Phạm vi | Trạng thái ở bản đã đối chiếu | Việc cần làm |
| --- | --- | --- |
| A2-01 đến A2-25 | H `Hoàn thành`, I `0%`, J trống, M `Chưa review`. | Đồng bộ evidence và review; không dùng riêng H để kết luận qua Gate. |
| A2-26 đến A2-30 | H `Chưa bắt đầu`. | Đối chiếu artifact thực có trước khi cập nhật; không suy ra chưa có code/triển khai. |
| A2-29, dòng 33 (`A33:N33`) | H `Chưa bắt đầu`, I `0%`, J trống, M `Chưa review`. | Bổ sung link docs/PR ở J và trạng thái sau review, không tự điền xác nhận nghiệm thu. |

Reviewer A2-29 theo backlog cần xác nhận phân công và phê duyệt trên PR.

## Sprint Retrospective

Các nhận định sau là đầu vào thảo luận từ artifact/lịch sử, chưa phải quyết định nhóm đã thống nhất.

| Quan sát | Hành động đề xuất / tiêu chí hoàn tất | Vai trò theo dõi / mốc |
| --- | --- | --- |
| Có nguồn `.puml` cùng SVG và PR tách theo việc. | PR thiết kế ghi FR/UC, source/SVG và sai khác với code; reviewer xác nhận. | Phụ trách UML và SRS; trước khi chốt UML. |
| Có DB test riêng và minh chứng CI FAIL rồi PASS. | Chạy các suite DB bị skip, ghi SHA/lệnh/pass/fail/skip và giới hạn. | Phụ trách kiểm thử; trước Gate Task 5. |
| Full DB còn lỗi fixture IPN và transaction cạnh tranh. | Bổ sung webhook trong fixture; điều tra pool/maxWait/transaction và hợp đồng lỗi; chạy lại DB suite, lưu kết quả trước/sau sửa. | Phụ trách kiểm thử/backend/DB; trước nghiệm thu FR-05/06/08/10. |
| ADR-003 còn mô tả mock, checkout đã dùng VNPay. | Bổ sung quyết định thay thế, xác nhận baseline và đồng bộ UC/UML/README/AC. | Phụ trách kiến trúc, reviewer docs; trước nghiệm thu. |
| E2E dừng ở `PENDING`; health/smoke không thay checkout. | Demo PAID và fail/cancel trên Sandbox, cart/history, browser/mobile; gắn SHA và video. | Phụ trách E2E và DB; trước A2-28/Gate Task 5. |
| README-evidence có danh mục/trạng thái PR lỗi thời. | Đối chiếu file thực có, sửa danh mục, phân biệt kết quả lịch sử và lần chạy lại. | Điều phối và phụ trách evidence; trước bàn giao. |
| Kickoff/sign-off còn pending. | Xác nhận Sprint thực tế, Gate đã review, owner/reviewer và link quyết định; cập nhật board. | Điều phối; tại Review thực tế. |

Chưa có dữ liệu story points theo ngày để tính velocity/burndown hoặc tỷ lệ hoàn thành.

## Biên bản sự kiện thực tế — chờ xác nhận

| Nội dung | Trạng thái |
| --- | --- |
| Sprint thực tế; thời gian/hình thức/kênh Review và Retrospective | Chưa xác nhận. |
| Thành viên/stakeholder tham dự; người trình bày và SHA/URL/video | Chưa có hồ sơ xác nhận. |
| Phản hồi, quyết định nghiệm thu, yêu cầu sửa | Chưa có nguồn. |
| Cải tiến được chọn, vai trò nhận việc và hạn | Chưa xác nhận; bảng trên chỉ là đề xuất. |
| Issue/PR ghi nhận sự kiện | Chưa bổ sung. |

| Thành viên | Nội dung cần xác nhận | Nguồn phản hồi / trạng thái |
| --- | --- | --- |
| Thành viên 1 | Phần đóng góp/trình bày, phản hồi về Increment và cải tiến được đồng ý. | Chờ xác nhận. |
| Thành viên 2 | Phần đóng góp/trình bày, phản hồi về Increment và cải tiến được đồng ý. | Chờ xác nhận. |
| Thành viên 3 | Phần đóng góp/trình bày, phản hồi về Increment và cải tiến được đồng ý. | Chờ xác nhận. |

**Trạng thái A2-29:** hồ sơ kỹ thuật và bằng chứng ba nhóm đóng góp đã được chuẩn bị; phần sự kiện và xác nhận còn mở. Chưa tự đánh dấu `Hoàn thành/Đạt` hoặc đóng Gate Task 5.
