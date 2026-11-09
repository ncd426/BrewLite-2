# CI/CD Pipeline Verification Evidence (Task A2-20)

- **Task ID:** `A2-20`
- **Related Issue:** #22
- **Pull Request Review:** [#46 (test: verify CI pipeline failure and recovery)](https://github.com/ncd426/BrewLite-2/pull/46)
- **Target Workflow:** `.github/workflows/ci.yml`
- **Verification Date:** 2026-11-08

---

## 1. Objectives & Verification Protocol

Xác thực tính toàn vẹn và độ tin cậy của quy trình tự động hóa kiểm thử (CI Pipeline) được định nghĩa trong `.github/workflows/ci.yml`:
1. **Kiểm tra khả năng chặn mã lỗi:** Giả lập lỗi assertion có kiểm soát trong bộ unit test để đảm bảo pipeline phát hiện và đánh dấu thất bại (CI FAIL), ngăn chặn merge code lỗi vào nhánh chính.
2. **Kiểm tra khả năng phục hồi:** Khôi phục assertion về trạng thái hợp lệ để kiểm tra pipeline kích hoạt lại và vượt qua toàn bộ các bước kiểm tra (CI PASS).
3. **Bảo vệ nhánh chính (`main`):** Toàn bộ quá trình thực nghiệm được cô lập trên nhánh `test/ci-verification` và Pull Request #46 được đóng mà không merge vào `main`.

---

## 2. Execution Runs & Evidence URLs

### A. Intentional CI Failure (Trạng thái FAIL có kiểm soát)
- **Commit:** `150f954` (`test: simulate intentional CI failure via broken assertion`)
- **CI FAIL Run URL:** https://github.com/ncd426/BrewLite-2/actions/runs/42478003839/job/128723556417?pr=46
- **Chi tiết kiểm thử:**
  - Bổ sung assertion sai `expect(true).toBe(false)` vào file test `apps/api/test/order-cancellation.spec.ts`.
  - Workflow chạy step `Run API unit tests` (`npm test -- --runInBand`).
  - Jest bắt lỗi bất đồng bộ: `Expected: false, Received: true` với `ProcessExitCode: 1`.
  - Job `api` dừng lập tức, báo trạng thái ❌ FAILED trên Pull Request #46.

### B. Resolution & CI Pass (Trạng thái PASS sau khắc phục)
- **Commit:** `a8d4857` (`fix: remove failing test assertion to restore green CI`)
- **CI PASS Run URL:** https://github.com/ncd426/BrewLite-2/actions/runs/42478290320/job/128724428722?pr=46
- **Chi tiết khắc phục:**
  - Xóa bỏ assertion kiểm thử `expect(true).toBe(false)`, khôi phục nghiệp vụ kiểm thử logic huỷ đơn hàng ban đầu.
  - GitHub Actions tự động kích hoạt lại cả 2 jobs:
    - **`api` job:** Lint API, Prisma generation, unit tests (125 tests passed), và API build thành công.
    - **`web` job:** Lint web và production build Next.js thành công.
  - Toàn bộ checks trên Pull Request #46 chuyển sang trạng thái tích xanh ✅ `All checks have passed`.

---

## 3. Pull Request Status & Review Sign-off

- **PR Lifecycle:** Pull Request #46 đã được review, ghi nhận log và ảnh minh chứng trực tiếp tại thread trao đổi.
- **Merge Status:** `CLOSED` (Không merge vào `main` để bảo toàn tính toàn vẹn của mã nguồn sản phẩm).
- **Kết luận:** Pipeline CI hoạt động chính xác, đảm bảo chất lượng mã nguồn trước khi tích hợp.