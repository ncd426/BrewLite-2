# Quy ước Git / Branch / Pull Request — BrewLite Assignment 2

> **Đề xuất để nhóm xác nhận trong kickoff**, không giả định đã được áp dụng trên GitHub.

## Repository

- Assignment 2: `https://github.com/ncd426/BrewLite-2.git` (remote `origin`).
- Assignment 1: `https://github.com/ncd426/BrewLite.git` (remote `assignment1`) — tham chiếu, **không push code A2 sang đây**.
- Nhánh tích hợp: `main`; tránh commit trực tiếp lên `main` khi làm việc nhóm.

## Tên branch

- `docs/a2-01-kickoff`, `docs/a2-07-activity`, `docs/a2-13-architecture`
- `feat/<issue-or-topic>`, `fix/<issue-or-topic>`, `ci/<topic>`, `test/<topic>`
- Mỗi PR theo **một đầu việc** hoặc một nhóm thay đổi gắn cùng acceptance criteria; không trộn code chưa test với tài liệu nghiệm thu.

## Quy trình hợp tác

1. Fetch `origin`, kiểm tra branch local và working tree; tạo branch mới **từ `origin/main`** khi working tree sạch.
2. Commit thay đổi liên quan, đặt message rõ ràng: `docs: prepare A2-01 kickoff backlog and DoD`.
3. Push lên `origin` (BrewLite-2), mở PR vào `main`; gắn Issue ID, reviewer, test log và checklist.
4. Reviewer comment/approve; chỉ merge khi status checks đạt; không dùng `--force` để khắc phục lỗi xung đột.
5. Sau merge: cập nhật Issue/Project và link PR trong bảng Excel; Gate chỉ đạt khi toàn bộ điều kiện đúng.

## Mẫu PR title và body

**Title:** `[A2-01] Docs: kickoff, backlog, conventions, DoD`

```markdown
## Mục tiêu
Liên kết Issue: #...

## Thay đổi
- ...

## Kiểm chứng
- [ ] Tài liệu khớp phân công
- [ ] Không chứa secrets
- [ ] CI/build/test phù hợp PASS (đính kèm URL)

## Reviewer
Bảo (A2-01)

## Tiêu chí nghiệm thu
- [ ] Repo có lịch sử A1 và collaborator theo kế hoạch
- [ ] Backlog/Issues/Project, branch/PR/DoD, kickoff có minh chứng
```

## An toàn Git

- Không dùng `git add .` khi có ZIP, TXT snapshot hoặc `.env` chưa theo dõi.
- Không commit `node_modules`, `.next`, `dist`, `.env`, DB dump, token, private keys.
- Không `git push --force`, `docker compose down -v`, `prisma migrate reset` hoặc xóa DB đã có dữ liệu.
- Nếu `main` local đi trước `origin/main`, kiểm tra `git log origin/main..main` trước khi mở PR; tránh PR lẫn commit ngoài phạm vi.
