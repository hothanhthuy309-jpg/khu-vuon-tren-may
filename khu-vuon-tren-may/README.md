# Khu vườn trên mây – KHTN 6

Web học Hóa KHTN 6 (Bài 9–17) theo bản kế hoạch "Khu vườn trên mây".
Code thuần HTML/CSS/JS: **không cần cài thư viện, không cần build**. Vercel phục vụ file tĩnh và 1 hàm nhỏ cho Tí Nị AI, Supabase lưu dữ liệu.

**Admin tổng: hothanhthuy309@gmail.com** (đã ghi sẵn trong `supabase/schema.sql` và `js/config.js`). Cô đăng kí tài khoản thầy cô bằng đúng email này thì sẽ thấy mục **Quản trị**.

## Phiên bản 4.7
- 📘 Sách bài tập KHTN 6 (Bài 9–17): 49 bài trong `data/sbt.json` (31 trắc nghiệm, nối, điền từ tự chấm; tự luận có đáp án gợi ý). Vào từ trang mỗi khu bài học. Câu trắc nghiệm SBT cũng được dùng trong trò chơi, cỏ dại, UFO. Làm xong cả bài +1 hạt mây.

## Phiên bản 4.6
- Giọng đọc Ông Kể Chuyện tạo sẵn: Góc thầy cô → Quản trị → 🎙️ Tạo bằng AI (hoặc tải file ghi âm của cô) cho 9 câu chuyện. File lưu ở Supabase Storage, học sinh nghe ngay. Cần chạy lại schema.sql.

## Phiên bản 4.5
- Ông Kể Chuyện: chờ giọng AI tối đa 15 giây, quá lâu hoặc lỗi thì tự chuyển sang giọng của máy; cho hàm AI trên Vercel chạy tối đa 60 giây.

## Phiên bản 4.4
- Đảo Trò Chơi: 2 trò cả lớp + 4 trò riêng: 🎂 Tiệm bánh mây (trả lời đúng nhận nguyên liệu, nướng bánh), 🐭 Đập chuột khoa học (4 chuột = 4 đáp án, 15 giây/câu), 🃏 Lật thẻ ghép đôi, ⚡ Đúng hay Sai (60 giây).
- Giọt mây 💧 nhận từ trò chơi (tối đa 80/ngày) để mua đồ ở Tủ đồ: vương miện, mũ phù thủy, áo choàng, áo blouse, vest, võ phục, váy công chúa, váy hoa, áo dài…
- Đặt tên cho nhân vật trong Tủ đồ (hiện trên đầu nhân vật).
- Đảo Giam Giữ: cô bấm 🔒 Giam ở danh sách học sinh, hoặc máy tự giam khi em rời trang bài kiểm tra 2 lần. Em phải trả lời đúng 5 câu mới về quảng trường. Sáng thứ Hai có bảng tin danh sách bị giam.
- Thí nghiệm và mô phỏng 3D to rộng hơn.

## Phiên bản 4.3
- Trang đầu kiểu mới: mây Tí Nị ở giữa, tên web, 2 thẻ chọn Học sinh / Thầy cô, đồi cỏ và hoa ở dưới; bấm thẻ thì hiện khung đăng nhập.

## Phiên bản 4.2
- Báo cáo → 📊 Phân tích đúng/sai: % đúng ngay theo từng em × từng bài (tô màu xanh/vàng/đỏ) và các câu cả lớp hay sai kèm hiểu nhầm, gợi ý giảng lại.
- Sửa lỗi nhập đúng mã lớp mà báo \"Không tìm thấy bạn này\".

## Phiên bản 4.1
- Hiện số phiên bản ở chân trang đầu và góc thầy cô. Mã lớp dạng 6A1-AB, mật khẩu chung của lớp, học sinh tự tạo mật khẩu riêng.

## Cập nhật bản 3
- **Không còn Chế độ thử**: web chỉ chạy với Supabase thật. Chưa điền khóa trong `js/config.js` thì trang đầu hiện hướng dẫn cài đặt.
- **Trang mở đầu mới**: 3 hòn đảo hoạt hình chuyển động, khung đăng nhập có 2 thẻ Học sinh / Giáo viên.
- **Giao diện sắc nét, gọn**: viền đậm, chữ nhỏ lại; Góc thầy cô vừa một màn hình (Lớp của tôi chia thẻ Tổng quan · Học sinh · Mở bài; Duyệt gợi ý chia theo từng hạt).
- **Thêm lớp** bằng nút ＋ cạnh ô chọn lớp (mỗi lớp tự có mã 6 kí tự riêng); **thêm học sinh** ở thẻ Học sinh (dán cả danh sách).
- **9 thí nghiệm mô phỏng 3D** trên bàn thí nghiệm: cốc thủy tinh, đèn cồn, kiềng, nhiệt kế, phễu lọc, phễu chiết, mạch điện…; xoay, phóng to bằng chuột.
- **Ông Kể Chuyện có giọng đọc**: ưu tiên giọng AI Gemini (trầm ấm, diễn cảm) khi Vercel có `GEMINI_API_KEY` (không cần bật chế độ AI cho Tí Nị); nếu chưa có khóa thì dùng giọng tiếng Việt của máy (tốt nhất trên trình duyệt **Microsoft Edge**: giọng NamMinh). Cần chạy lại `schema.sql`.

## Cập nhật bản 2
- **Vương quốc chia theo chức năng**: Quảng trường lớn ở giữa (Tiệm áo mây, Bảng xếp hạng, Bảng tin, Góc kể chuyện, cỏ dại) và 6 đảo: 📚 Quần đảo Học Tập (mỗi bài là một đảo nhỏ, bài chưa mở phủ sương) · ⚗️ Đảo Thí Nghiệm · 🔭 Đảo Mô Phỏng · 🎮 Đảo Trò Chơi · 🌱 Đảo Vườn Mây · 🔥 Xưởng Mây (Lò Mây + Công trường).
- **Bài học chỉ hiện khi cô mở**, xếp theo 3 chủ đề. Câu hỏi trò chơi, cỏ dại quảng trường và UFO đều lấy từ các bài cô đã mở.
- **Cỏ dại ở quảng trường**: bấm vào cỏ → trả lời câu hỏi, đúng ngay lần đầu được +5 điểm bảng xếp hạng. Cỏ mọc lại dần (tối đa 6 bụi).
- **Vườn Mây 3D** với Cô Mây đội nón rơm, cầm bình tưới đi trông vườn.
- **Ông Kể Chuyện** kể bằng giọng đọc (giọng AI Gemini khi cô bật chế độ AI, không thì giọng tiếng Việt của máy), nhạc nền tự tắt khi ông kể, nghe xong có câu đố.
- **Tí Nị là khung chat bên cạnh câu hỏi**: gợi ý 3 bậc đã duyệt, không lộ đáp án.
- **Gọi kiểm tra bài cũ** (Góc thầy cô → 🛸): UFO bốc ngẫu nhiên tên một cư dân mây, không gọi trùng, kèm câu hỏi có hình minh họa.
- Mọi trang tự thu nhỏ cho vừa màn hình, không phải kéo lên kéo xuống.
- Thẻ trong câu hỏi có hình minh họa nhỏ (🪨 Hòn đá, 📒 Quyển vở…).

## Bản này có đủ 8 giai đoạn

| Phần | Có gì |
|---|---|
| Giao diện | Toàn màn hình. Học sinh luôn đứng trong vương quốc 3D; mỗi trang (bài học, vườn, lò, xây nhà, thí nghiệm, kiểm tra, trò chơi) là một tấm kính trong suốt phủ lên trên, bấm ✕ hoặc phím Esc là về lại vương quốc. Tí Nị luôn ở góc phải dưới màn hình. |
| Vương quốc 3D (laptop) | 9 đảo bài học + **Đảo Thí Nghiệm** + đảo trung tâm lớn, cầu gỗ, mây, khinh khí cầu, chim. Đi bằng W A S D / mũi tên hoặc bấm chuột, bản đồ nhỏ góc phải (bấm để đi tới). Khu chưa mở phủ sương; khu đang học có ngôi sao; học xong hiện cầu vồng. Điện thoại hoặc máy yếu tự dùng bản đồ 2D. |
| Các công trình trên đảo trung tâm | **Lò Mây** (ngôi nhà mái cỏ có ống khói, cửa lò rực lửa) → nung nguyên liệu thành vật liệu · **Tiệm áo mây** → Tủ đồ · **Bảng xếp hạng** (bảng gỗ hiện top 3) · **Vườn Mây** (cổng vòm) · **Công trường** (4 lô đất, cần cẩu; nhà em xây hiện lên ở đây) · **Bảng tin** (sáng lên khi có bài kiểm tra). Đến gần bấm **E**. |
| NPC | Bác Giọt Sương (dẫn ra Vườn), Cô Thợ Mây (dẫn ra Công trường), **Ông Kể Chuyện** (kể chuyện lịch sử hóa học kèm câu đố). |
| Tủ đồ | Nút 👕 trên cùng bên phải, nút Tủ đồ ở dock, hoặc bước vào Tiệm áo mây: chọn bạn nam/nữ, da, tóc, áo, mũ, phụ kiện. |
| Cùng online · Chat · Xếp hạng | Thấy bạn cùng lớp đi lại, bong bóng chat trên đầu. Chat lọc từ tục, cô tắt được. Điểm mây = hạt × 10 + cỏ tự sửa × 5 + nhà × 15. |
| Bài 9–17 | Mỗi bài 3 hạt giống × 3 câu (Biết/Hiểu/Vận dụng), 4 dạng câu, mọi đáp án sai có mã hiểu nhầm, gợi ý 3 bậc. |
| Đảo Thí Nghiệm | 9 thí nghiệm mô phỏng, mỗi bài 1 cái: phân loại tính chất (B9), đun nước đá + đồ thị (B10), úp cốc lên nến (B11), thử dẫn điện/dẫn nhiệt (B12), thử nguyên liệu (B13), sự cháy và dập lửa (B14), xếp đĩa ăn cân bằng (B15), cho chất vào nước (B16), lọc – cô cạn – chiết (B17). Dự đoán → Làm → Kết luận, Tí Nị chấm 3 tiêu chí, ghi Nhật ký. |
| Vườn Mây · Cỏ dại | Như cũ: gieo hạt, cây lớn, thu hoạch nguyên liệu; sai lần đầu mọc cỏ mang tên hiểu nhầm, làm lại đúng thì nhổ được. |
| Lò Mây | 8 công thức (gạch, gốm, thủy tinh, xi măng, thép, cao su, nhựa, gỗ tấm). Chọn nhiên liệu (than/củi/gas) hoặc phơi nắng (chậm ×3). Mỗi mẻ Tí Nị hỏi 1 câu nhỏ. |
| Xây nhà | Nhận đơn của Cừu, Thỏ, Mèo; chọn vật liệu đúng tính chất cho móng, tường, mái, cửa, cửa sổ, lõi dây, vỏ dây. Chọn sai thì Tí Nị hỏi ngược lại. Nhà xây xong hiện trên Công trường. |
| Kiểm tra | Kiểm tra đầu bài / cuối bài (8 câu, không gợi ý, làm 1 lần) cô bật theo từng khu; bài kiểm tra cô giao riêng. Báo cáo hiệu quả trước → sau. |
| Trò chơi cả lớp | **Hack Mật Mã Mây** (trả lời đúng → tinh thể + hộp quà; hộp có khiên, gió, hack két bạn bằng câu đố xếp thứ tự 10 giây) và **Đua khinh khí cầu**. Màn chiếu tivi cho cô, nhạc nhanh dần 30 giây cuối, bục vinh danh, 3 câu cả lớp hay sai. Máy chủ làm trọng tài. |
| Tí Nị AI | Chế độ "Gợi ý đã duyệt" (mặc định, không cần AI) hoặc "AI" (Gemini, dự phòng Groq) qua `api/tini.js`. Không gửi tên học sinh, lọc để không lộ đáp án, mỗi em tối đa 30 lượt/ngày. Thầy cô dùng Tí Nị soạn nháp câu hỏi. |
| Góc thầy cô | Hôm nay · Lớp của tôi (mở khu, bật kiểm tra, tắt nhạc/chat, chế độ AI) · Trò chơi và kiểm tra · Bộ câu hỏi (gõ tay, dán từ Excel, nhập .xlsx) · Báo cáo (phiếu phụ huynh, biểu đồ, in PDF) · Duyệt gợi ý Tí Nị · Quản trị (chỉ admin). |
| Âm thanh | Nhạc nền tự tạo đổi theo nơi (vương quốc, vườn, phòng thí nghiệm, bài học, trò chơi) và ~20 tiếng hiệu ứng. |

## Xem trước nội bộ (không cần Supabase)

Chỉ dành cho người làm web kiểm tra giao diện: mở `http://localhost:8000/?preview` (dữ liệu lưu tạm trong trình duyệt):
- Học sinh: mã lớp **MAY666**, chọn Bông (hình ☁️ 🌈 ⭐), Mây hoặc Nắng. Lớp thử mở sẵn cả 9 khu.
- Thầy cô: **co@demo / 123456** (có cả mục Quản trị để xem thử).

Trong thư mục này chạy `python -m http.server 8000` rồi vào http://localhost:8000 (mở thẳng file index.html bằng chuột đôi sẽ không chạy).

## Đưa lên mạng

### Bước 1 – Supabase
1. https://supabase.com → **New project** (vùng **Southeast Asia (Singapore)**).
2. **SQL Editor** → **New query** → dán toàn bộ `supabase/schema.sql` → **Run**. Đã có dự án cũ thì cứ chạy lại file mới, không mất dữ liệu (thêm bảng trò chơi, quản trị, bộ câu hỏi, giới hạn Tí Nị).
3. **Authentication → Sign In / Providers → Email**: tắt **Confirm email** nếu muốn đăng kí xong dùng ngay.
4. **Project Settings → API Keys**: chép **Project URL** và khóa **anon public**, dán vào `js/config.js`:
   ```js
   export const SUPABASE_URL = "https://xxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```
   **Không** dán khóa `service_role`/`secret` vào đây.
5. Đăng kí tài khoản thầy cô bằng **hothanhthuy309@gmail.com** → thấy mục **Quản trị**. Ở đó cô thêm được admin phụ, sửa dòng bản quyền và thông báo trang đầu.

### Bước 2 – Vercel
1. Đưa toàn bộ thư mục (cả `api/` và `package.json`) lên một repo GitHub.
2. https://vercel.com → **Add New… → Project** → chọn repo → **Framework Preset: Other**, để trống Build Command → **Deploy**.
3. (Tuỳ chọn, để bật Tí Nị AI) **Settings → Environment Variables**, thêm:
   | Tên | Giá trị |
   |---|---|
   | `SUPABASE_URL` | giống trong config.js |
   | `SUPABASE_ANON_KEY` | giống trong config.js |
   | `GEMINI_API_KEY` | lấy miễn phí ở https://aistudio.google.com/apikey |
   | `GROQ_API_KEY` | (không bắt buộc) dự phòng, lấy ở https://console.groq.com |
   | `TINI_DAILY_LIMIT` | (không bắt buộc) mặc định 30 |
   | `GEMINI_TTS_VOICE` | (không bắt buộc) giọng Ông Kể Chuyện, mặc định `Charon` |
   Lưu xong bấm **Redeploy**. Trong **Lớp của tôi** chọn chế độ Tí Nị = **AI**. Không thêm khóa thì Tí Nị vẫn chạy bằng gợi ý đã duyệt.

### Bước 3 – Kiểm tra nhanh
- [ ] Thầy cô đăng kí, đăng nhập; email admin thấy mục Quản trị.
- [ ] Tạo lớp, mở thêm khu, thêm học sinh, in thẻ đăng nhập.
- [ ] Học sinh vào bằng laptop: thấy vương quốc 3D, đi lại, mở Tủ đồ, chat, xem xếp hạng.
- [ ] Học 1 hạt, sai 1 câu → nhổ cỏ ở Vườn → nung gạch ở Lò Mây → xây nhà → nhà hiện ở Công trường.
- [ ] Đảo Thí Nghiệm: làm 1 thí nghiệm → Nhật ký có bài.
- [ ] Cô tạo Hack Mật Mã Mây, chiếu tivi; 2 học sinh vào chơi.

## Sửa nội dung
- Câu hỏi: `data/bai-09.json` … `data/bai-17.json` (đang để `"status": "cho-duyet"`, cô duyệt xong đổi thành `"chot"`).
- Lò Mây và đơn xây nhà: `data/workshop.json`. Câu đố hack: `data/puzzles.json`.
- Gợi ý Tí Nị: sửa thẳng trong mục **Duyệt gợi ý Tí Nị** của Góc thầy cô.

## Cấu trúc thư mục
```
index.html            trang duy nhất
css/style.css         giao diện toàn màn hình
js/app.js             điều hướng, giữ vương quốc 3D phía sau
js/map3d.js           vương quốc 3D Three.js
js/avatar.js          nhân vật chibi, Tủ đồ
js/online.js          thấy nhau online (Supabase Realtime)
js/shell.js           tấm kính trang, Tí Nị góc phải
js/student.js         đăng nhập, khu, hạt giống, Vườn, Sổ tay, Đảo Thí Nghiệm
js/experiment.js      9 thí nghiệm mô phỏng
js/workshop.js        Lò Mây, Xây nhà
js/tests.js           kiểm tra đầu/cuối, bài cô giao
js/games.js           Hack Mật Mã Mây, Đua khinh khí cầu, màn chiếu
js/gamelogic.js       luật trò chơi (Chế độ thử; bản Supabase viết bằng SQL)
js/teacher.js         Góc thầy cô, Quản trị
js/sound.js           nhạc nền và hiệu ứng (Web Audio)
api/tini.js           hàm Vercel gọi Gemini/Groq cho Tí Nị
data/*.json           nội dung
supabase/schema.sql   bảng, RLS, hàm cho học sinh, trò chơi, quản trị
```
