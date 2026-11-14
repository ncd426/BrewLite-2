# A2-25 – Minh chứng CI/CD và triển khai production (Assignment 2)

> **Cập nhật:** 14/11/2026. Tài liệu tổng hợp minh chứng cho **Task 4.4, Task 5.3 và phần triển khai của Task 5.4** theo `Assignment2-BrewLite.pdf`. Các kết quả bên dưới được đối chiếu với GitHub Actions và lệnh kiểm tra của nhóm. Không lưu mật khẩu, token hoặc giá trị bí mật vào tài liệu.

## 1. Phiên bản triển khai

| Mục | Giá trị / minh chứng |
| --- | --- |
| Repository | [ncd426/BrewLite-2](https://github.com/ncd426/BrewLite-2) |
| Branch | `main` |
| Commit SHA | `8b9b0607d4b821de169d3a466866d9bdf7a1e8fd` |
| CD workflow | `.github/workflows/cd.yml` |
| CD run | [#43549122315 – SUCCESS](https://github.com/ncd426/BrewLite-2/actions/runs/43549122315) |
| PR hoàn thiện CD Render | [PR #53](https://github.com/ncd426/BrewLite-2/pull/53) |
| Issue A2-25 | [Issue #27 – CLOSED](https://github.com/ncd426/BrewLite-2/issues/27) |

## 2. Minh chứng CI trên Pull Request (Task 4.4)

Minh chứng **đã có sẵn** tại [`docs/evidence/sprint-1/ci-evidence.md`](../sprint-1/ci-evidence.md), nên không cần commit lại log CI thô:

- [CI FAIL có kiểm soát – run #42478003839](https://github.com/ncd426/BrewLite-2/actions/runs/42478003839): PR #46, API test phát hiện assertion sai.
- [CI PASS sau khi sửa – run #42478290320](https://github.com/ncd426/BrewLite-2/actions/runs/42478290320): cùng PR #46, API/Web checks thành công.
- [PR #54 – các CI checks đều thành công](https://github.com/ncd426/BrewLite-2/pull/54): ví dụ kiểm tra tự động khi cập nhật code ứng dụng.

## 3. Minh chứng CD trên production (Task 5.3)

Run [#43549122315](https://github.com/ncd426/BrewLite-2/actions/runs/43549122315) chạy bằng `workflow_dispatch` trên `main`, tại đúng commit `8b9b0607d4b821de169d3a466866d9bdf7a1e8fd`.

| Job | Kết quả |
| --- | --- |
| `CD / API quality` | `success` |
| `CD / Web quality` | `success` |
| `CD / Release configuration` | `success` |
| `CD / GHCR publish (SHA)` | `success` |
| `CD / Render deploy by digest + smoke` | `success` |
| `CD / Dockerfiles build check (PR)` | `skipped` (bình thường vì chạy trên `main`, không phải PR) |

Pipeline chạy quality gate, đóng gói/push Docker image theo commit SHA lên GHCR, triển khai bằng image digest lên Render và thực hiện smoke gate. Có thể kiểm tra từng job và log tại đường dẫn của run.

**Artifact:** `a2-25-render-release-evidence`, gồm `render-api-deploy.json`, `render-web-deploy.json`, `render-smoke.json`, tại mục *Artifacts* của [run #43549122315](https://github.com/ncd426/BrewLite-2/actions/runs/43549122315). Các file JSON/log gốc giữ trong môi trường kiểm thử hoặc tải lại từ GitHub Actions; không commit nguyên bản khi chưa rà soát dữ liệu nhạy cảm.

**Giới hạn về migration:** Pipeline có bước kiểm soát phát hành bằng `A2_27_MIGRATION_APPROVED_SHA`. So sánh thư mục `apps/api/prisma` giữa commit `82d6451` và `8b9b060` không có thay đổi được Git theo dõi. Điều này **không thay thế** bằng chứng migration/seed có thể tái tạo database và quy trình xử lý an toàn do A2-27 phụ trách.

## 4. URL production và health/smoke (Task 5.4)

- Frontend HTTPS: https://brewlite-2-web.onrender.com
- API HTTPS: https://brewlite-api-49rx.onrender.com
- API health: https://brewlite-api-49rx.onrender.com/health

Ở lần kiểm tra thủ công sau CD, frontend `/` và API `/health` đều trả **HTTP 200**. Job `Render deploy by digest + smoke` của run #43549122315 kết thúc `success`.

**Lưu ý:** HTTP 200 và smoke gate **không chứng minh** luồng nghiệp vụ end-to-end đã thành công (menu → giỏ hàng → đặt đơn → thanh toán → xác nhận). Minh chứng E2E thuộc Task 5.2/5.4, được nghiệm thu riêng.

## 5. Kiểm thử rollback và kiểm soát phát hành

- [CD run #42955572703](https://github.com/ncd426/BrewLite-2/actions/runs/42955572703): deploy và smoke thành công ở commit `82d6451`.
- [CD run #42956963533](https://github.com/ncd426/BrewLite-2/actions/runs/42956963533): CD thành công khi đưa bản triển khai trở lại sau thử rollback frontend.
- Nhóm đã thao tác rollback frontend trên Render Dashboard; tài liệu hướng dẫn rollback cần được đối chiếu trong `README.md` hoặc `docs/deployment.md` khi bàn giao.
- Sau khi run #43549122315 thành công, biến GitHub Actions `RENDER_DEPLOY_ENABLED` được đặt về `false` để tránh triển khai ngoài ý muốn. Biến này không tắt dịch vụ Render đang chạy.

## 6. Các đầu ra khác vẫn phải kiểm tra trước khi release

- [ ] Unit/integration/E2E của luồng đặt đơn và thanh toán (Task 5.2).
- [ ] Migration/seed có thể tái tạo DB, kiểm soát migration và rollback an toàn (Task 5.2–5.3).
- [ ] Database production không public trực tiếp; secrets không xuất hiện trong repository hoặc CI logs (Task 5.4).
- [ ] README đầy đủ cách chạy local, test, build, deploy, rollback; deployment diagram phản ánh Render thực tế (Task 3.2/5.4).
- [ ] Video/demo end-to-end, Sprint Review, Sprint Retrospective (Task 5.4).
- [ ] Git tag/release và release notes cho phiên bản nghiệm thu (Task 5.4) – thực hiện **sau khi** các đầu ra cần thiết đã được xác nhận.

Tài liệu này chỉ xác nhận **minh chứng CI/CD nêu trên**, không tự đánh dấu đạt các yêu cầu chưa có bằng chứng.
