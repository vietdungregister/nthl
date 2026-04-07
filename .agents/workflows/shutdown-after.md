---
description: Tắt máy sau khi hoàn thành task (dùng buổi tối khi muốn máy tự tắt)
---

# /shutdown-after

Workflow này được dùng khi bạn muốn tôi tắt máy sau khi hoàn thành xong task.

## Cách dùng

Chỉ cần nhắn kèm ở cuối request, ví dụ:
- *"...xong thì tắt máy cho tôi"*
- *"/shutdown-after"*
- *"...done thì bye machine"*

## Các bước thực hiện

1. Hoàn thành toàn bộ task được giao trước.

2. Thông báo cho user biết task đã xong và chuẩn bị tắt máy.

3. Chạy script shutdown:

```bash
osascript /Users/duongvietdung/Documents/Projects/baitapcuoikhoa/.agents/scripts/shutdown.applescript
```

4. Nếu bước 3 thất bại (lỗi permission, dialog không phản hồi, v.v.), fallback sang force shutdown:

```bash
sudo shutdown -h now
```

> **Lưu ý bảo mật:** Nếu `sudo shutdown` yêu cầu mật khẩu, hãy bỏ qua bước 4 và thông báo cho user.

