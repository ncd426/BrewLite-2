# A2-30 — Checklist bàn giao Assignment 2

<!-- A2-29 STRUCTURE QA 2026-11-15 -->

**Bản đồ hồ sơ theo Task 1-5:** [docs/README.md](../../README.md). Những mục chờ video, team sign-off, DB private và release phải giữ trạng thái chưa xác minh.

Dựa trên Mục 9.1 và Task 5.4 trong **BrewLite – Assignment 2 REQUIREMENTS TO DEPLOYMENT VER 1.0**. Khi có bằng chứng/giảng viên truy cập được thì đánh dấu. Chưa có bằng chứng không đồng nghĩa mục đó thất bại, nhưng không được tự đánh dấu đạt.

| Checklist PDF | Link minh chứng và ghi chú | Trạng thái kiểm tra |
| --- | --- | --- |
| Link repository và quyền giảng viên truy cập | https://github.com/ncd426/BrewLite-2 | Kiểm tra quyền nếu repository private |
| SRS, use-case, ma trận truy vết | [SRS](../../requirements/srs.md), [checkout UC](../../requirements/use-case-checkout.md), [traceability](../../traceability-matrix.md) | Có file; reviewer xác nhận |
| Activity, sequence, class, deployment diagram | [diagrams](../../diagrams/), mỗi sơ đồ `.puml` + `.svg` | Có nguồn/ảnh; reviewer xác nhận |
| Source frontend/backend và migrations | `apps/web`, `apps/api`, `apps/api/prisma/migrations` | Có trong repo; 9 migration production đã xác minh |
| Unit, integration và E2E | [A2-29](a2-29-delivery-evidence-2026-11-15.md) | Local PASS 165/165; cần link run/log chuẩn |
| CI/CD pipeline chạy thành công | [CD production](https://github.com/ncd426/BrewLite-2/actions/runs/43625066012), [CI FAIL](https://github.com/ncd426/BrewLite-2/actions/runs/42478003839), [CI PASS](https://github.com/ncd426/BrewLite-2/actions/runs/42478290320) | Có liên kết |
| Production URL, API, health check | [Web](https://brewlite-2-web.onrender.com), [API](https://brewlite-api-49rx.onrender.com), [Health](https://brewlite-api-49rx.onrender.com/health) | Smoke PASS; kiểm tra lại lúc chấm |
| Release notes, README, rollback | [Release draft](../../releases/v1.0.0-a2.md), [README](../../../README.md), [deployment](../../deployment.md) | **Release/tag chưa tạo** |
| Video/demo và Sprint Retrospective | [A2-28 demo](a2-28-production-demo.md), [Review/Retro](../../team/a2-29-review-signoff.md) | **Cần link video và xác nhận nhóm** |

## Gate có thể gây mất điểm nếu thiếu

- [ ] Có URL production hoạt động tại thời điểm chấm (không chỉ tại thời điểm deploy).
- [ ] PostgreSQL production không mở public trực tiếp; API dùng Internal DB URL, secret quản lý ở nơi bảo mật, sao lưu mã hóa riêng có thể restore.
- [ ] Video end-to-end trên production + ảnh giao diện mobile và quyền xem cho giảng viên.
- [ ] Reviewer xác nhận 5 Gate/task theo đúng thứ tự trong repo; Sprint Review/Retrospective có phản hồi thực, không điền giả.
- [ ] Tạo tag/release GitHub **sau merge PR docs**; ghi release SHA/tag URL và CI của tag nếu có.
- [ ] Đối chiếu gap SRS/NFR/traceability và tiêu chí chấp nhận còn mở với người chịu trách nhiệm.

**Tag dự kiến:** `v1.0.0-a2` (chưa tạo, script phải kiểm tra chưa trùng). Việc tạo tag có thể kích hoạt CD publish image mới; Render deploy phải được giữ disabled. Không mặc nhiên coi tag docs mới là image đang Live; đối chiếu các SHA và digest trong [A2-29 evidence](a2-29-delivery-evidence-2026-11-15.md).
