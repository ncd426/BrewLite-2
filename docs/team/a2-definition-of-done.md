# BrewLite Assignment 2 — Definition of Done (DoD)

> **Dự thảo** chờ Bảo/Khoa review. Chỉ đánh dấu hoàn thành khi có minh chứng thật.

## DoD chung cho một đầu việc

- [ ] Kết quả đáp ứng mô tả và acceptance criteria trong bảng phân công `BrewLite_Assignment2.xlsx`.
- [ ] Source/tài liệu nằm đúng thư mục, được commit vào branch phù hợp, không có secret `.env`, khóa API, token hoặc dữ liệu cá nhân trong Git.
- [ ] Nếu có code: build/lint/unit test liên quan PASS; hành vi lỗi/biên được test; các thay đổi database dùng migration an toàn, không reset DB.
- [ ] Nếu có tài liệu/diagram: đồng nhất SRS, use-case và implementation; `.puml` có bản `.svg` tương ứng khi yêu cầu.
- [ ] Có Pull Request mô tả thay đổi, ảnh/log test, liên kết Issue và checklist kiểm tra.
- [ ] Reviewer được chỉ định đã xem và xác nhận; tranh luận trong PR được xử lý; CI xanh nếu workflow đã chạy.
- [ ] Có URL PR/commit/log trong cột **K** của bảng phân công; **I = 'Hoàn thành'** chỉ khi **N = 'Đạt'**.

## Gate theo thứ tự

1. **Task 1:** Context/scope + SRS FR/NFR + use-case checkout + UML use-case `.puml`/`.svg`; PR review và merge.
2. **Task 2:** Activity + sequence + class diagram đủ nguồn và SVG, nhất quán tài liệu Task 1; PR review và merge.
3. **Task 3:** Overview + ADR + deployment phản ánh hạ tầng đã chọn và trade-off; PR review và merge.
4. **Task 4:** Repo, GitHub Issues/Project, MVP menu, CI `install → lint → unit → build`; ít nhất một bằng chứng PASS và một bằng chứng FAIL an toàn trên branch thử nghiệm; required checks nếu quyền repo cho phép.
5. **Task 5:** End-to-end checkout thành công và thanh toán thất bại, migration/seed/health, HTTPS production, CD/registry image tag SHA, smoke, rollback, video, release/tag/release notes, Sprint Review/Retro, traceability.

**Không tự nâng trạng thái 'Đạt'** chỉ vì code đã chạy local; cần reviewer và link minh chứng theo bảng.
