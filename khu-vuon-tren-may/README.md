# Khu vườn trên mây – KHTN 6

Web học Hóa KHTN 6 (Bài 9–17) theo bản kế hoạch "Khu vườn trên mây – bản nháp 2".
Code thuần HTML/CSS/JS: **không cần cài thư viện, không cần build**. Vercel chỉ việc phục vụ file tĩnh, Supabase lưu dữ liệu.

## Bản này đã có (Giai đoạn 1–3, cùng Bài 9 và Bài 10)

| Phần | Đã làm |
|---|---|
| Đăng nhập | Mã lớp 6 kí tự + chọn tên + 3 hình bí mật (12 hình mây/hóa học). Sai 5 lần khóa 1 phút. Phiên chỉ trong tab, tự đăng xuất sau 20 phút không thao tác. |
| Bản đồ 3D (laptop) | Màn hình từ 900 px trở lên: bản đồ Three.js, 9 đảo nổi nối bằng cầu gỗ, chú cừu mây đi bộ tới từng khu, Tí Nị bay theo, Bác Giọt Sương và Cô Thợ Mây đi dạo, bấm "Vào khu" để học. Máy yếu hoặc mất mạng tới thư viện 3D thì tự dùng bản đồ 2D. |
| Đi lại tự do | Phím W A S D hoặc mũi tên, hoặc bấm chuột vào chỗ muốn tới. Vương quốc rộng hơn, có đảo trung tâm lớn và 9 đảo bài học. |
| Nhân vật & Tủ đồ | Học sinh là bạn chibi nam hoặc nữ. Tủ đồ (Tiệm áo mây) đổi màu da, tóc, áo, mũ, phụ kiện; vài món mở khi học đủ hạt giống. |
| Cùng online | Các bạn cùng lớp đang vào web thấy nhau đi lại trong vương quốc (Supabase Realtime, kênh riêng từng lớp). Chế độ thử có 4 bạn ảo, và các tab trên cùng máy thấy nhau. |
| Trò chuyện lớp | Khung chat có lọc từ tục, giới hạn 120 kí tự, chậm 3 giây giữa 2 tin. Cô tắt được trò chuyện của lớp. Tin lưu trong bảng chat_messages, thầy cô xem và xóa được. |
| Bảng xếp hạng | Điểm mây = hạt giống đã học × 10 + cỏ dại đã tự sửa × 5, xếp trong lớp. |
| Bản đồ 2D (điện thoại) | 9 khu trên mây, cầu cầu vồng, khu chưa mở phủ sương, khu học xong nở hoa và hiện cầu vồng. Vừa một màn hình ở 390 px và 1366×768. |
| Bài 9, Bài 10 | Mỗi bài 3 hạt giống × (Khám phá → 3 câu Biết/Hiểu/Vận dụng). Đủ 4 dạng câu: trắc nghiệm, điền khuyết, ghép thẻ, phân loại. Mọi đáp án sai có mã hiểu nhầm. Gợi ý 3 bậc "Hỏi Tí Nị" (gợi ý soạn sẵn). Sai 2 lần mới hiện nút xem lời giải. |
| Thí nghiệm ảo | Đun nước đá: Dự đoán → Làm (đồ thị nhiệt độ vẽ dần, đoạn nằm ngang ở 0 °C và 100 °C) → Kết luận, Tí Nị nhận xét theo 3 tiêu chí, ghi vào Nhật ký. Không tính vào số liệu. |
| Vườn Mây | 5×5 ô, gieo hạt mây, hạt → mầm → cây non → cây lớn, thu hoạch ra nguyên liệu của bài, thẻ lý thuyết bay vào Sổ tay. |
| Cỏ dại | Sai lần đầu thì mọc cỏ mang tên hiểu nhầm (vd "Cỏ Nước-đá-nóng-chảy-vẫn-tăng-nhiệt"). Nhổ cỏ = làm lại đúng câu đó (không dùng Tí Nị, có nút xem lại lý thuyết). Đúng thì cỏ thành bong bóng, +1 hạt mây, ghi "Đã tự sửa". Cỏ để lâu thì to hơn và làm cây trên ô đó lớn chậm hơn chút, không làm mất gì. |
| Sổ tay | Thẻ lý thuyết, túi nguyên liệu, nhật ký thí nghiệm, danh sách cỏ đã tự sửa. |
| Âm thanh | Nhạc nền chill tự tạo (hợp âm êm, bass nhẹ, chuông lấp lánh). "ting", "bụp", "tách tách", mưa lách tách, "xèo", chuông, nhạc reo – tạo bằng Web Audio nên không lo bản quyền. Âm lượng về 5% mỗi lần đăng nhập, có nút loa và công tắc "Tắt nhạc cả lớp". |
| Góc thầy cô | 4 mục. **Hôm nay**: 4 số (đã vào, đúng ngay, tự sửa, còn cỏ), 3 cỏ cả lớp hay mắc kèm gợi ý giảng lại, em cần kèm, Chiếu lên tivi (có "cỏ dại khổng lồ"), Trực tiếp. **Lớp của tôi**: mã lớp to, công tắc mở từng khu, tắt nhạc, thời gian cây lớn, thêm/xóa học sinh, đổi hình, in thẻ đăng nhập. **Trò chơi và kiểm tra**: chỗ chờ cho giai đoạn 7–8. **Báo cáo**: phiếu phụ huynh, sao chép dán Zalo hoặc in. |
| Giảm chuyển động | Máy bật "giảm chuyển động" thì mọi hình đứng yên. |

**Chưa làm (các giai đoạn sau):** Lò Mây và Xây nhà (GĐ 4), nội dung Bài 11–17 và các thí nghiệm còn lại (GĐ 5), Tí Nị AI qua Gemini/Groq (GĐ 6), kiểm tra đầu/cuối và báo cáo PDF (GĐ 7), Hack Mật Mã Mây, Đua khinh khí cầu, tủ đồ, nhạc nền (GĐ 8). Nguyên liệu học sinh gom bây giờ vẫn được giữ cho Lò Mây sau này.

## Thử ngay trên máy (Chế độ thử)

Khi `js/config.js` còn để trống, web chạy ở Chế độ thử, lưu dữ liệu trong trình duyệt:
- Học sinh: mã lớp **MAY666**, chọn Bông (hình ☁️ 🌈 ⭐), Mây hoặc Nắng. Màn chọn hình có ghi sẵn hình của bạn mẫu.
- Thầy cô: **co@demo / 123456**.

Mở thử trên máy: trong thư mục này chạy `python -m http.server 8000` rồi vào http://localhost:8000 (mở thẳng file index.html bằng chuột đôi sẽ không chạy vì trình duyệt chặn đọc file JSON).

## Đưa lên mạng (khoảng 10 phút)

### Bước 1 – Supabase (dự án mới, riêng cho KHTN 6)
1. Vào https://supabase.com → **New project**, đặt tên ví dụ `khtn6-khu-vuon-tren-may`, chọn vùng **Southeast Asia (Singapore)**.
2. Mở **SQL Editor** → **New query** → dán toàn bộ file `supabase/schema.sql` → **Run**. Thấy "Success" là xong (chạy lại lần nữa cũng không sao).
3. Mở **Authentication → Sign In / Providers → Email**: nếu muốn thầy cô đăng kí xong dùng được ngay thì tắt **Confirm email**. Nếu để bật, thầy cô phải bấm link xác nhận trong email trước khi đăng nhập.
4. Mở **Project Settings → API Keys** (hoặc **Data API**): chép **Project URL** và khóa **anon public** (hoặc **publishable**).
5. Mở file `js/config.js`, dán vào:
   ```js
   export const SUPABASE_URL = "https://xxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```
   Khóa anon được phép để công khai: dữ liệu đã được khóa bằng bảo mật theo dòng (RLS). **Không** dán khóa `service_role` hay `secret` vào đây.

> Đã chạy schema.sql bản cũ? Chạy lại file mới một lần để thêm bảng trò chuyện và bảng xếp hạng. Realtime của Supabase dùng được ngay với khóa anon, không cần bật gì thêm.

### Bước 2 – Vercel (thư mục mới)
Cách dễ nhất, không cần cài gì:
1. Vào https://github.com → **New repository**, tên ví dụ `khtn6-khu-vuon-tren-may` → **uploading an existing file** → kéo toàn bộ nội dung thư mục này vào (giữ nguyên các thư mục `css`, `js`, `data`, `supabase`) → **Commit changes**.
2. Vào https://vercel.com → **Add New… → Project** → chọn repo vừa tạo → **Framework Preset: Other**, để trống Build Command và Output Directory → **Deploy**.
3. Vercel cho một đường link dạng `https://khtn6-khu-vuon-tren-may.vercel.app`. Từ nay mỗi lần sửa file trên GitHub, Vercel tự cập nhật.

Nếu máy cô có Node.js: mở Terminal trong thư mục này, gõ `npx vercel --prod` rồi làm theo hướng dẫn.

### Bước 3 – Kiểm tra nhanh sau khi lên mạng
- [ ] Mở link → **Thầy cô** → **Tạo tài khoản mới** → đăng nhập được.
- [ ] Tạo lớp → thấy mã lớp 6 kí tự. Bật thêm Bài 10 (lớp mới mặc định chỉ mở Bài 9).
- [ ] Thêm 2–3 tên học sinh → **In thẻ đăng nhập**.
- [ ] Trên điện thoại: **Em là học sinh** → mã lớp → tên → 3 hình → vào bản đồ.
- [ ] Học 1 hạt, cố ý sai 1 câu → ra Vườn Mây thấy cỏ → nhổ cỏ được → gieo hạt.
- [ ] Quay lại **Hôm nay** của thầy cô → số liệu đổi.

## Sửa nội dung câu hỏi
Mỗi bài một file trong `data/` (`bai-09.json`, `bai-10.json`). Mở bằng Notepad hoặc VS Code, sửa chữ trong dấu ngoặc kép, giữ nguyên dấu ngoặc và dấu phẩy. Toàn bộ nội dung đang để `"status": "cho-duyet"`; cô duyệt xong đổi thành `"chot"`. Bài mới: tạo `bai-11.json` theo cùng khuôn rồi điền `"file": "data/bai-11.json"` cho khu đó trong `data/lessons.json`.

Mã hiểu nhầm nằm trong mục `misconceptions` của từng bài: `label` là tên cỏ dại, `tip` là gợi ý giảng lại hiện ở mục Hôm nay.

## Cấu trúc thư mục
```
index.html            trang duy nhất
css/style.css         giao diện bông gòn
js/config.js          khóa Supabase, thời gian cây lớn, thời gian tự đăng xuất
js/api.js             kết nối Supabase (và Chế độ thử)
js/student.js         đăng nhập, bản đồ, khu, hạt giống, Vườn Mây, Sổ tay
js/quiz.js            4 dạng câu, gợi ý 3 bậc
js/experiment.js      thí nghiệm ảo đun nước đá
js/map3d.js           bản đồ 3D Three.js cho laptop
js/teacher.js         Góc thầy cô
data/*.json           nội dung bài học
supabase/schema.sql   bảng, bảo mật RLS, hàm đăng nhập học sinh
vercel.json           cấu hình Vercel
```
