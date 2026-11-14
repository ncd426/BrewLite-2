# Sprint Review & Retrospective — BrewLite Assignment 2

> **A2-29 · Bản tổng hợp kỹ thuật ngày 14/11/2026 (Asia/Saigon), chờ nhóm xác nhận.**
> Mốc Git khi lập bản tổng hợp: `506eaeb`. Tài liệu ghi nhận sản phẩm và lịch sử đóng góp có thể kiểm tra trong repository. Ngày lập tài liệu không phải ngày diễn ra Sprint Review/Retrospective; thời gian họp, phát biểu, quyết định và phê duyệt thực tế chưa được cung cấp.

## Phạm vi và nguồn đối chiếu

- [Backlog A2](a2-backlog.md): Sprint 1 gồm Task 1–4, kế hoạch 04/11 đến trưa 07/11/2026; Sprint 2 gồm Task 5, kế hoạch chiều 07/11 đến 08/11/2026. Đây là lịch kế hoạch trong bảng phân công, chưa xác nhận là lịch thực tế.
- [Bảng phân công do người dùng cung cấp](https://docs.google.com/spreadsheets/d/131s5akKM1lP_xvgYH4q4W3_8CoGzghcEBhnSk6t5YXo/edit?gid=433607833), snapshot kiểm tra ngày 14/11/2026: tab **Tổng quan**, `A5:A7`, xác định ba thành viên Danh, Bảo, Khoa; mỗi người có 10 đầu việc. Người dùng đã xác nhận ba tên này; vai trò được ghi trong bảng phân công. Tab **Phân công 5 ngày** là nguồn trạng thái cần đối chiếu với artifact thực tế.
- [Kickoff](a2-kickoff.md), [bản xác nhận kickoff](a2-kickoff-confirmation.md) và [Definition of Done](a2-definition-of-done.md) đang ghi trạng thái dự thảo/chờ xác nhận.
- [Ma trận FR → UC/US → UML → code → test](../traceability-matrix.md) xác định bằng chứng và khoảng trống theo yêu cầu; [kiểm tra hệ thống ngày 14/11](../evidence/sprint-2/system-verification-2026-11-14.md) ghi kết quả chạy lại cùng giới hạn môi trường.
- Các commit và PR dưới đây là dấu mốc từ lịch sử Git local. URL PR giúp reviewer tìm hồ sơ gốc; merge commit không tự chứng minh đã có người khác approve.

## Sprint Review — kết quả kỹ thuật để nhóm nghiệm thu

### Sprint 1: yêu cầu, UML, kiến trúc, menu và CI

**Mục tiêu theo kế hoạch:** làm rõ yêu cầu và thiết kế, đưa menu MVP vào quy trình PR/CI để làm nền cho checkout. Mục tiêu này lấy từ backlog, chưa có biên bản Sprint Planning xác nhận.

| Hạng mục | Increment và bằng chứng quan sát được | Giới hạn nghiệm thu |
| --- | --- | --- |
| Task 1 — Context/SRS/use case | Có [context/scope](../requirements/context-and-scope.md), [SRS](../requirements/srs.md), [checkout UC](../requirements/use-case-checkout.md), [use-case UML](../diagrams/usecase-overview.puml). Dấu mốc: `d8ac4b6` (SRS), `8de2f8a` và `92e2d58` (scope/UC). | Cần đối chiếu review/phê duyệt Gate Task 1; sự tồn tại của tài liệu không tự chứng minh nghiệm thu đúng thứ tự. |
| Task 2 — UML hành vi/domain | Có [activity](../diagrams/activity-checkout.puml), [sequence](../diagrams/sequence-checkout.puml), [class](../diagrams/class-domain.puml) cùng SVG. Dấu mốc: `6f623c9`, `40113d7`, `5ec9653`; `3d3be10` chỉnh lý ba sơ đồ. | Đối chiếu khác biệt với code hiện tại theo ma trận; cần xác nhận người review và quyết định Gate Task 2. |
| Task 3 — Kiến trúc/deployment | Có [overview/ADR](../architecture/overview.md), [deployment](../diagrams/deployment.puml); commit `49d8349`, `9f67272`, PR [#39](https://github.com/ncd426/BrewLite-2/pull/39), [#41](https://github.com/ncd426/BrewLite-2/pull/41). | ADR-003 còn mô tả mock MOMO/CARD trong khi SRS/code hiện tại dùng VNPay Sandbox; cần cập nhật quyết định kiến trúc trước khi coi bộ hồ sơ đồng nhất. |
| Task 4 — Menu MVP và CI | [Smoke API](../evidence/sprint-1/api-smoke-results.json), [ảnh menu](../evidence/sprint-1/menu-demo.png), [PR-status](../evidence/sprint-1/PR-status.txt); `23504ee` bổ sung gói bằng chứng, `0a5d5e6` bổ sung lint/test/build CI. [CI evidence](../evidence/sprint-1/ci-evidence.md) ghi FAIL có kiểm soát rồi PASS tại PR [#46](https://github.com/ncd426/BrewLite-2/pull/46). | Đây là bằng chứng lịch sử; không thay kết quả chạy lại ngày 14/11. Cần hồ sơ review/Gate Task 4 và xác nhận required checks của repository. |

**Lưu ý khi đọc bằng chứng Sprint 1:** `README-evidence.txt` vẫn ghi “No Sprint 1 PR”, nhưng `PR-status.txt` đã có PR [#45](https://github.com/ncd426/BrewLite-2/pull/45), và Git có merge `e56c690` (#45), `57f588f` (#47). Ưu tiên đối chiếu từng artifact và commit; không dùng câu tổng hợp cũ để kết luận chưa có PR. Các file `docker-compose.log`, `docker-build.log`, `screenshot-capture.log` được README-evidence liệt kê nhưng không có trong bộ file Git hiện tại; chưa coi chúng là bằng chứng đính kèm.

### Sprint 2: kiểm thử, database, CD và bàn giao

**Mục tiêu theo kế hoạch:** hoàn thiện luồng khách mua hàng và hồ sơ phát hành, sau Gate Task 4. Lịch sử có các commit đến 14/11, muộn hơn hạn kế hoạch 08/11; chưa có dữ liệu để xác định ngày kết thúc Sprint thực tế hoặc tốc độ hoàn thành.

| Hạng mục | Increment và bằng chứng quan sát được | Giới hạn nghiệm thu |
| --- | --- | --- |
| Luồng mua hàng và thanh toán | Code có checkout VNPay Sandbox; `57bb839` chuyển checkout online sang VNPay, `ad42796` sửa tự thử lại sau thất bại. Xem [SRS FR-05/06/08](../requirements/srs.md), [ma trận](../traceability-matrix.md). | Khác baseline mock trong backlog/ADR-003; cần xác nhận thay đổi phạm vi và đồng bộ tài liệu. Không có video demo hoàn chỉnh trong bộ bằng chứng đã kiểm tra. |
| A2-23 — Kiểm thử API/DB | Commit `9a40d25` đưa E2E về `apps/api/tests/e2e`, thêm runner/DB test riêng. [Log unit/integration lịch sử](../evidence/sprint-1/unit-integration-tests.log): 19 suites PASS, 6 skipped; 132 tests PASS, 18 skipped, exit 0. [Log E2E lịch sử](../evidence/sprint-1/e2e-order-flow.log): 3 suites/3 tests PASS. | Test bị skip chưa được chứng minh PASS. E2E hiện tại kiểm tra đăng ký/JWT → menu → tạo đơn → chi tiết/lịch sử; đơn kết thúc ở `PENDING`, không gọi `/payments`, không chạy trình duyệt. Không suy diễn thành demo thanh toán thành công/thất bại. |
| A2-24 — Migration/seed/Compose | `997db6d` ghi [bằng chứng local ngày 10/11](../evidence/compose-database-health-2026-11-10.md): 9 migrations, không pending; seed chạy lại không tạo bản ghi; backend/DB healthy, `/health` 200. | Bằng chứng dùng database local hiện có; chưa chứng minh đầy đủ tái tạo từ DB trắng, thời gian khởi động <= 5 phút, restart không mất dữ liệu, hoặc migration production. |
| A2-25/26 — CI/CD/HTTPS | `94f9e6d`, `237b633` bổ sung GHCR/Render và smoke gate. [Bằng chứng production](../evidence/sprint-2/a2-25-ci-cd-production.md) ghi CD run [#43549122315](https://github.com/ncd426/BrewLite-2/actions/runs/43549122315) thành công cho `8b9b060`, web/API HTTPS 200. | Đây là kết quả ghi trong hồ sơ ngày 14/11, không phải xác nhận mới của buổi họp. Health/smoke không thay E2E; biến `RENDER_DEPLOY_ENABLED` được hồ sơ ghi đã đặt `false` sau kiểm tra. |
| A2-27 — Rollback | Hồ sơ production liên kết hai run phục hồi sau thử rollback frontend; [hướng dẫn deployment](../deployment.md) và README phục vụ bàn giao. | Chưa có bằng chứng drill rollback API + database hoặc phục hồi snapshot production; không kết luận toàn bộ hệ thống đã rollback thành công. |
| A2-29/30 — Tài liệu và release | Có ma trận, README, bản Review/Retro này và [nội dung PR docs](../pr-a2-29.md). | Chờ đủ xác nhận ba thành viên, phản hồi Review/Retro, reviewer docs, các bằng chứng còn thiếu và release/tag/video trước khi chốt Gate Task 5. |

**Kết luận đề nghị đưa ra Review:** có Increment và đóng góp kỹ thuật kiểm chứng được của ba Git author. Chưa đủ bằng chứng để ghi “tất cả Gate đạt”, “toàn bộ test PASS” hoặc “đã tổ chức Sprint Review/Retrospective”. Kết quả kiểm tra mới nhất phải đọc tại [báo cáo ngày 14/11](../evidence/sprint-2/system-verification-2026-11-14.md), tách khỏi các log lịch sử trên.

**Phát hiện khi chạy lại ngày 14/11:** lint/build, seed fixture test, test script CD và E2E API cơ bản đã chạy được; khi bật toàn bộ DB integration, bộ test còn lỗi. Bốn payment suite không đăng ký `PaymentsWebhookController` trong testing module nên yêu cầu IPN trả `404`; đây là thiếu sót fixture kiểm thử, chưa phải bằng chứng endpoint production trả `404`. Test `orders.concurrency` còn gặp Prisma `P2028`/hết thời gian chờ transaction và HTTP `500` dưới 10 yêu cầu đồng thời; chạy riêng vẫn tái hiện. Cần xử lý và chạy lại trên DB test trước khi nghiệm thu cạnh tranh/idempotency/loyalty. Số lượng pass/fail/skip, lệnh, môi trường và log đầy đủ lấy từ báo cáo kiểm tra hệ thống; không dùng log PASS cũ để thay kết quả này.

## Đóng góp của ba thành viên: phân công và bằng chứng tác giả

Ba thành viên Danh, Bảo, Khoa đã được người dùng xác nhận và có trong tab **Tổng quan** của [bảng phân công gốc](https://docs.google.com/spreadsheets/d/131s5akKM1lP_xvgYH4q4W3_8CoGzghcEBhnSk6t5YXo/edit?gid=433607833). Vai trò trong bảng này phù hợp với [backlog trong repo](a2-backlog.md). Lịch sử Git ghi ba author `ncd426`, `Luu Bao`, `Joko`; chưa có xác nhận liên kết từng author với từng tên. Đối ứng dưới đây dựa vào phạm vi công việc tương ứng và **cần từng thành viên xác nhận**, không coi là danh tính đã được chứng thực. Không dùng số commit hoặc số đầu việc được giao để quy đổi thành tỷ lệ công sức.

| Thành viên theo backlog | Git author đối ứng cần xác nhận | Đóng góp kỹ thuật có bằng chứng | Vai trò review theo phân công / xác nhận thực tế |
| --- | --- | --- | --- |
| Danh | `ncd426` | [d2a64bb](https://github.com/ncd426/BrewLite-2/commit/d2a64bb) tạo backlog/kickoff/DoD/quy ước; [6f623c9](https://github.com/ncd426/BrewLite-2/commit/6f623c9) activity; [49d8349](https://github.com/ncd426/BrewLite-2/commit/49d8349) overview/ADR; [0a5d5e6](https://github.com/ncd426/BrewLite-2/commit/0a5d5e6) CI; [237b633](https://github.com/ncd426/BrewLite-2/commit/237b633) Render deploy/smoke và test script; [c846819](https://github.com/ncd426/BrewLite-2/commit/c846819) hồ sơ CI/CD production. | Điều phối/Gate, review A2-29 theo backlog. Chưa có sign-off Review/Retro hoặc approve PR docs được ghi tại đây. |
| Bảo | `Luu Bao` | [8de2f8a](https://github.com/ncd426/BrewLite-2/commit/8de2f8a) context/scope/UC; [40113d7](https://github.com/ncd426/BrewLite-2/commit/40113d7) sequence; [9f67272](https://github.com/ncd426/BrewLite-2/commit/9f67272) deployment; [23504ee](https://github.com/ncd426/BrewLite-2/commit/23504ee) ảnh/menu và log Sprint 1; [9a40d25](https://github.com/ncd426/BrewLite-2/commit/9a40d25) runner DB riêng, ba E2E và log unit/E2E. | Requirements/sequence/E2E, reviewer A2-24/25 theo backlog. Chưa có phản hồi Review/Retro được ghi tại đây. |
| Khoa | `Joko` | [d8ac4b6](https://github.com/ncd426/BrewLite-2/commit/d8ac4b6) SRS/use case; [5ec9653](https://github.com/ncd426/BrewLite-2/commit/5ec9653) class domain; [57bb839](https://github.com/ncd426/BrewLite-2/commit/57bb839) checkout VNPay; [461d5a1](https://github.com/ncd426/BrewLite-2/commit/461d5a1) sửa API Docker health; [997db6d](https://github.com/ncd426/BrewLite-2/commit/997db6d) log migration/seed/Compose. | SRS/class/DB/traceability, phụ trách A2-29 theo backlog. Bản tài liệu đang soạn không tự chứng minh Khoa đã xác nhận hoặc trình bày tại họp. |

Có thể tái kiểm tra tác giả và phạm vi sửa bằng `git show --format=short --stat <commit>`; kiểm tra các author bằng `git shortlog -sne HEAD`. Commit ghi tác giả của thay đổi, chưa chứng minh người đó trình bày demo hoặc đưa ra phản hồi trong một sự kiện Scrum.

### Đối chiếu trạng thái bảng phân công gốc

Snapshot ngày 14/11 của tab **Phân công 5 ngày** có các cột: **H = Trạng thái, I = Tiến độ, J = Link PR/tài liệu, K = Giờ, M = Review xác nhận, N = Tiêu chí**. Cách ghi cột này khác ghi chú I/K/N trong backlog/DoD bản cũ; khi cập nhật bảng cần dùng đúng header đang có.

| Phạm vi | Trạng thái trong snapshot | Đối chiếu và ý nghĩa |
| --- | --- | --- |
| A2-01 đến A2-25 | H ghi `Hoàn thành`, I ghi `0%`, J trống, M ghi `Chưa review`. | Các trường chưa đồng bộ với nhau; repo có artifact/commit nhưng bảng chưa chứa link và xác nhận review. Chưa dùng riêng H để kết luận đã qua Gate. |
| A2-26 đến A2-30 | H ghi `Chưa bắt đầu`. | Đây là trạng thái bảng tại thời điểm chụp; hồ sơ production và tài liệu đang có cho thấy cần đối chiếu/cập nhật, không suy ra chưa có code hay triển khai. |
| A2-29, dòng 33 (`A33:N33`) | Owner Khoa; H `Chưa bắt đầu`, I `0%`, J trống, M `Chưa review`. | Bộ tài liệu hiện tại là đầu vào review. Bổ sung link PR/tài liệu ở J và cập nhật tiến độ/trạng thái sau kiểm chứng; chưa tự điền xác nhận review. |

Bảng gốc chưa chỉ định tên reviewer riêng cho A2-29. Danh là reviewer theo [backlog trong repo](a2-backlog.md); nhóm cần xác nhận phân công review này khi chốt PR.

## Sprint Retrospective — nhận định và cải tiến đề xuất

Các nhận định sau lấy từ artifact/lịch sử; đây là đầu vào cho nhóm thảo luận, chưa phải lời phát biểu hay quyết định đã thống nhất.

| Quan sát từ bằng chứng | Điều cần giữ hoặc cải thiện | Hành động đề xuất và tiêu chí hoàn tất | Người theo dõi đề xuất / mốc kiểm tra |
| --- | --- | --- | --- |
| Có nguồn `.puml` cùng SVG; yêu cầu, kiến trúc và PR có commit tách theo việc. | Giữ việc bàn giao nguồn chỉnh sửa cùng hình và dẫn bằng chứng cụ thể. | Mỗi PR thiết kế ghi FR/UC, link source/SVG, sai khác với code và reviewer. Hoàn tất khi reviewer xác nhận trên PR. | Bảo + Khoa; trước khi chốt bộ UML. |
| Có DB test riêng và kiểm tra URL local trong runner; CI có thử FAIL rồi khôi phục PASS. | Giữ kiểm thử cô lập và kiểm tra nhánh lỗi. | Chạy các suite DB bị skip trên DB test; ghi SHA, lệnh, pass/fail/skip và giới hạn trong một báo cáo. | Bảo; trước Gate Task 5. |
| Lần chạy đầy đủ ngày 14/11 phát hiện payment fixture thiếu webhook controller và test cạnh tranh đơn hàng vẫn lỗi `P2028`/HTTP `500` khi chạy riêng. | Cần bổ sung đường callback vào fixture và kiểm tra khả năng xử lý tranh chấp transaction. | Bổ sung controller/provider cần thiết cho testing module, xác nhận các ca IPN đi tới handler; phân tích `maxWait`/pool/transaction và xử lý lỗi cạnh tranh theo hợp đồng API; chạy lại toàn bộ DB suite, giữ log cả lần lỗi và lần sửa. | Bảo kiểm thử, Danh/Khoa phối hợp phân tích transaction; trước nghiệm thu FR-05/06/08/10. |
| ADR-003 còn mô tả mock; SRS và checkout đã sang VNPay. | Cần đồng bộ quyết định thiết kế với thay đổi phạm vi. | Bổ sung ADR thay thế/supersede, xác nhận baseline với nhóm, kiểm tra lại UC/UML/README và các AC thanh toán. | Khoa soạn, Danh review; trước khi nghiệm thu docs. |
| E2E hiện tại dừng ở `PENDING`; health/smoke chỉ chứng minh dịch vụ phản hồi. | Cần tách kiểm tra dịch vụ, API nghiệp vụ và trải nghiệm trình duyệt. | Bổ sung minh chứng checkout tới PAID và payment fail/cancel trên Sandbox, kiểm tra lịch sử/cart và ảnh/video browser/mobile, gắn đúng SHA. | Bảo thực hiện, Khoa đối chiếu dữ liệu; trước A2-28/Gate Task 5. |
| README-evidence Sprint 1 có trạng thái PR và tên log lỗi thời; các log có số lượng test khác nhau. | Cần hồ sơ có ngày, SHA và một nơi tổng hợp rõ nguồn. | Đối chiếu từng file thực có, sửa danh mục thiếu, tách kết quả lịch sử với kết quả chạy lại và giải thích skip. | Danh điều phối, Bảo bổ sung artifact; trước khi gửi hồ sơ. |
| Kế hoạch kết thúc 08/11 nhưng commit kỹ thuật còn đến 14/11; kickoff/sign-off vẫn pending. | Cần cập nhật kế hoạch và nghiệm thu dựa trên trạng thái thực. | Ghi ngày Sprint thực tế, nguyên nhân thay đổi do nhóm cung cấp, Gate nào đã review, owner/reviewer và link quyết định; theo dõi việc còn lại trên board. | Danh; tại buổi Review thực tế. |

Không có số liệu story points còn lại theo ngày, nên chưa tính velocity/burndown hoặc tỷ lệ hoàn thành từ số commit.

## Phần biên bản sự kiện thực tế — chờ ba thành viên xác nhận

Phần này cần điền từ cuộc họp, trao đổi có nguồn, hoặc phản hồi trực tiếp của người tham gia. Có thể dùng họp hoặc thảo luận bất đồng bộ nếu nhóm xác nhận hình thức đó.

| Trường | Nội dung thực tế |
| --- | --- |
| Sprint và khoảng thời gian thực tế | Chưa xác nhận cho Sprint 1 và Sprint 2. |
| Thời gian/hình thức/kênh Sprint Review | Chưa cung cấp. |
| Thời gian/hình thức/kênh Retrospective | Chưa cung cấp. |
| Thành viên và stakeholder tham dự | Chưa có danh sách xác nhận. |
| Người trình bày, nội dung demo, SHA/URL/video | Chưa có hồ sơ trình bày thực tế. |
| Phản hồi, quyết định nghiệm thu, yêu cầu sửa | Chưa có phản hồi/biểu quyết có nguồn. |
| Cải tiến được nhóm chọn, người nhận việc, hạn | Chưa xác nhận; bảng trên chỉ là đề xuất. |
| Issue/PR ghi nhận sự kiện và người ghi biên bản | Chưa bổ sung. |

| Thành viên | Nội dung cần xác nhận bằng phản hồi của chính thành viên | Link phản hồi / ngày / trạng thái |
| --- | --- | --- |
| Danh | Author có phải `ncd426`? Đã làm/trình bày phần nào? Phản hồi về Increment và cải tiến nào được đồng ý? | Chờ xác nhận. |
| Bảo | Author có phải `Luu Bao`? Đã làm/trình bày phần nào? Phản hồi về Increment và cải tiến nào được đồng ý? | Chờ xác nhận. |
| Khoa | Author có phải `Joko`? Đã làm/trình bày phần nào? Phản hồi về Increment và cải tiến nào được đồng ý? | Chờ xác nhận. |

Để chốt biên bản, nhóm cần cung cấp ngày/kênh họp hoặc thảo luận, danh sách tham dự, xác nhận đối ứng tên–author, ít nhất một đóng góp và phản hồi cụ thể của mỗi người, quyết định nghiệm thu cùng các việc cải tiến đã nhận. Người review A2-29 theo backlog là Danh; phê duyệt cần được ghi trên PR docs hoặc nguồn xác nhận có thể kiểm tra.

**Trạng thái A2-29:** đã chuẩn bị hồ sơ kỹ thuật và truy nguồn đóng góp của ba Git author; phần biên bản sự kiện và xác nhận ba thành viên còn mở. Chưa tự đánh dấu `Hoàn thành/Đạt` trên backlog hoặc đóng Gate Task 5.
