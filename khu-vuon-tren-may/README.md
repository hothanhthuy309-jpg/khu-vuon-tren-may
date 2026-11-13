# Khu vườn trên mây – KHTN 6

Web học Hóa KHTN 6 (Bài 9–17) theo bản kế hoạch "Khu vườn trên mây".
Code thuần HTML/CSS/JS: **không cần cài thư viện, không cần build**. Vercel phục vụ file tĩnh và 1 hàm nhỏ cho Tí Nị AI, Supabase lưu dữ liệu.

**Admin tổng: hothanhthuy309@gmail.com** (đã ghi sẵn trong `supabase/schema.sql` và `js/config.js`). Cô đăng kí tài khoản thầy cô bằng đúng email này thì sẽ thấy mục **Quản trị**.

## Phiên bản 5.1
- Báo cáo: bảng % đúng đổi thành đồ thị thanh so sánh từng em (lọc theo bài, có trung bình lớp).
- Màn chọn tên: trải ngang toàn màn hình, tất cả tên trong một khung, không cuộn.
- Trò chuyện lớp: che thêm từ bạo lực, xúc phạm; chặn đường link, chữ lặp, chữ gõ linh tinh. Cần chạy lại schema.sql.

## Phiên bản 5.0
- Trò chơi cả lớp: cô chọn thời gian mỗi câu 15/20/25/35 giây; mỗi em tự đi theo tốc độ riêng, trả lời xong (đúng hay sai) tự sang câu tiếp, không chờ bạn. Màn chiếu của cô hiện bảng xếp hạng cả lớp (số câu đã làm, số câu đúng). Cần chạy lại schema.sql.
- Màn chọn tên khi đăng nhập chiếm toàn màn hình.

## Phiên bản 4.9
- Cô mở Hack Mật Mã Mây / Đua khinh khí cầu hoặc giao bài kiểm tra (đầu bài, cuối bài, bài cô giao) thì tất cả học sinh đang online tự động được đưa vào (trong khoảng 8 giây).
- Màn chọn tên khi đăng nhập: tên xếp hàng ngang, khung rộng, dễ nhìn.

## Phiên bản 4.8
- Web không mở được thì hiện lời nhắn kèm tên file bị lỗi, thay vì trang trắng.

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

## Phiên bản 5.2
- Cô giao bài kiểm tra: học sinh đăng nhập phải làm bài trước mới vào được giao diện chính.
- Câu hỏi ít lặp hơn: mỗi em bắt đầu ở một vị trí khác trong trò chơi cả lớp; trò chơi riêng ưu tiên câu em chưa gặp.
- Đảo giam giữ: tổng kết vào Chủ nhật hằng tuần (không vào học, nhắn bậy, không làm bài được giao) và ghi rõ lý do.
- Nhạc Hack và Đua khinh khí cầu nhanh, dồn dập hơn.
- Gợi ý của Tí Nị: câu nào cũng có nút ✅ Duyệt.
- Gọi kiểm tra bài cũ: UFO và Đua vịt chỉ bốc tên, không hỏi câu nào.
- Báo cáo có biểu đồ cột so sánh theo ngày (14 ngày).
- Dọn cỏ, làm thí nghiệm và mô phỏng đều nhận giọt mây.
- Tính điểm: đúng ngay lần đầu được đủ điểm, mỗi lần sai bị trừ 25% (thấp nhất còn 25%).
- Trò chơi cả lớp: chọn "Nội dung có sẵn" hoặc "Bộ câu hỏi của cô".
- **Cần chạy lại supabase/schema.sql.**

## Phiên bản 5.3
- Gộp Đảo Thí Nghiệm và Đảo Mô Phỏng thành một đảo, có đủ thí nghiệm của mọi bài; bỏ ô "Phòng thí nghiệm mây" trong trang bài học.
- Lò Mây và Xây nhà: thu hoạch hạt mây của bất kì bài nào (từ Bài 9) đều được thêm 1 nguyên liệu xây nhà; đơn nhà đầy đủ luôn mở.
- Em bị giam bị nhốt ngay trong nhà giam trên bản đồ.
- Thông báo của cô (Lớp của tôi → Tổng quan): dòng chữ chạy trên màn hình học sinh, tự tắt sau 24 giờ.
- Bạn nam có thêm: quần đùi, quần dài jean, quần dài kaki.
- Sửa lỗi bản xem thử không lưu cài đặt của cô.
- Không cần chạy lại schema.sql (nếu đã chạy ở bản 5.2).

## Phiên bản 5.4
- Nhạc trò chơi cả lớp mới, dồn dập.
- Trả lời xong tự sang câu mới ngay.
- Hướng dẫn sử dụng cho học sinh (nút ❓).
- Trò chơi cả lớp: chỉ cô kết thúc được.
- iPad: nút mũi tên, chạy mượt hơn.
- Chặn thêm từ tục; nói tục bị nhốt vào nhà giam.
- Bác Giọt Sương: nhiệm vụ hằng ngày.
- Duyệt gợi ý theo từng bậc.

## Phiên bản 5.5
- Thêm ngân hàng câu hỏi Bài 9 (17 câu), Bài 10 (20 câu), Bài 11 (20 câu) vào data/sbt.json: dùng cho Sách bài tập, trò chơi, Đảo Giam Giữ, nhiệm vụ Bác Giọt Sương.

## Phiên bản 5.6
- Nút di chuyển sang bên phải, khung chat bên trái.
- Thông báo khẩn (Lớp của tôi → Tổng quan): chữ đỏ nhấp nháy, phát liên tục đến khi cô tắt.
- Cấm thêm từ: gay, lgbt, bê đê, thằng lọ…; nói bậy bị giam và ghi lý do.

## Phiên bản 5.7
- Sửa thí nghiệm trên iPad/máy cảm ứng: bỏ thu nhỏ zoom ở trang có 3D (Safari tính sai chỗ chạm), giảm độ nét, tắt đổ bóng, tự xoay màn hình, máy yếu tự chuyển hình 2D; vương quốc 3D dừng vẽ khi đang mở thí nghiệm.

## Phiên bản 5.8
- Trò chơi cả lớp có âm thanh: nhạc thi đấu luôn bật khi vào phòng (kể cả khi cô tắt nhạc lớp), to hơn; hiệu ứng đúng/sai đáng yêu, đếm ngược tích tắc 5 giây cuối mỗi câu; màn chiếu của cô có tiếng 3-2-1 bắt đầu, tiếng pop khi có bạn trả lời đúng, kèn khi đổi người dẫn đầu, tích tắc 10 giây cuối.

## Phiên bản 5.9
- iPad: thí nghiệm không còn chặn vuốt cuộn (máy cảm ứng không xoay hình 3D), nút "Sang câu hỏi" luôn hiện và tự cuộn tới; trang dài cuộn mượt.
- Trò Đúng hay Sai, Lật thẻ, Đập chuột bỏ các câu dạng "không đúng / sai / cả 3 đáp án trên" (tách đáp án ra khỏi câu hỏi sẽ bị hiểu sai).
- Thêm Xóa lớp học (Lớp của tôi → Tổng quan, phải gõ đúng tên lớp).
- Màn chiếu trò chơi của cô: nhạc tự bật, có nút bật/tắt nhạc.

## Phiên bản 6.0
- Cỏ dại quảng trường: tối đa 12 bụi, 1 phút mọc thêm 1 bụi; câu hỏi lấy cả câu hạt giống, Sách bài tập và ngân hàng câu hỏi, ít lặp lại.
- Tủ đồ: sửa lỗi đổi màu (váy đổi theo Màu áo/váy, thêm Màu quần cho bạn nam); thêm Kiểu tóc (5 kiểu nam, 5 kiểu nữ), Giày, Cặp & túi, Huy hiệu sticker gắn áo.

## Phiên bản 6.1
- Nhân vật cute hơn: chất liệu hoạt hình, mắt to long lanh, lông mi (bạn nữ), má hồng, miệng cười, tai.
- Luôn ưu tiên 3D: không tự mở bản đồ 2D; nếu 3D chưa mở được thì hiện nút Thử lại 3D / Mở bản đồ 2D.
- Thú cưng (🐾 trong thanh dưới): mua bằng giọt mây, đặt tên, cho ăn, bé đi theo nhân vật trong 3D.
- Hồ câu cá (🎣): mỗi con cá là một câu hỏi, đúng thì câu được cá và nhận giọt mây.

## Phiên bản 6.2
- Sửa mất âm thanh: mở khóa âm thanh ở lần chạm/bấm đầu tiên trên mọi máy (iPad, điện thoại, máy tính), tự bật lại nhạc nền khi quay lại tab; âm lượng mặc định to hơn (8%).

## Phiên bản 6.3
- Đăng nhập trên điện thoại gọn, vừa màn hình: tên học sinh xếp 2 cột, ô nhập chữ to, không bị che.
- Hồ câu cá và Nhà thú cưng: thêm biển chỉ dẫn ở quảng trường 3D; thanh dưới vuốt ngang được nên không bị mất nút; bản đồ 2D cũng có nút Câu cá, Thú cưng, Trò chơi.

## Phiên bản 6.4
- Quảng trường 3D có Hồ câu cá (cá bơi, lá sen, cần câu) và Nhà thú cưng (mái hồng, mèo con nhảy) ở phía sau tượng giữa; bấm vào là đi tới.
- Trình duyệt luôn tải bản mới nhất của web (không giữ file cũ).

## Phiên bản 6.5
- Sửa Hồ câu cá không thấy cá trên máy tắt hiệu ứng chuyển động (Windows): cá bơi bằng JS; thêm dòng hướng dẫn câu cá. Thông báo của cô vẫn hiện trên các máy này.

## Phiên bản 6.6
- Vườn Mây làm lại kiểu nông trại vui vẻ: đất vuông, hàng rào gỗ, luống cày có rãnh, chuồng đỏ, tháp ủ, nhà vàng, chuồng bò–lợn–cừu, gà, rơm, bù nhìn, viền cây ăn quả.
- Sửa mất thú cưng (và giỏ cá, nhiệm vụ…) khi đăng xuất/đăng nhập lại.
- Thú cưng ăn: hạt (1💧), bánh mây (3💧), cá câu được, rau củ thu hoạch; mỗi bé có món khoái khẩu; lớn dần 4 giai đoạn, to dần trong 3D.
- Đảo Giam Giữ: trả lời sai bị mất 1 ổ khóa, câu sai quay lại, phải đọc đáp án 3 giây mới bấm tiếp.

## Phiên bản 6.7
- Hoàn thành bài cô giao: tặng 2 hạt mây.
- Khảo sát học sinh (Lớp của tôi → Tổng quan): cô bật thì học sinh phải đánh giá xong (6 câu mặt cười + góp ý) mới dùng được chức năng khác; cô xem điểm trung bình từng câu và góp ý.

## Phiên bản 6.8
- Nhân vật chibi: đầu to 1,3 lần, giày thể thao to có đế trắng, tất cao cổ; thêm Hoodie tai mèo, tai cáo (có đuôi), gấu; tóc bạc.
- NPC mới dạng chibi: Cô Thợ Mây (hoodie cáo, mũ lưỡi trai, ủng, cầm búa), Ông Kể Chuyện (hoodie gấu, tóc bạc, râu, kính, cầm sách và gậy).

## Phiên bản 6.9
- Quản trị: nút ✏️ Cập nhật cho từng admin (đổi email, đổi quyền admin phụ ↔ admin tổng). Không sửa được tài khoản admin chính.
- Thú cưng lớn dần sau mỗi lần cho ăn (to ra liên tục, hiện chiều cao và điểm lớn, có hiệu ứng lớn lên); trong 3D bé cũng to dần.

## Phiên bản 7.0
- Thú cưng đổi hình dạng theo tuổi (3D): Em bé đầu to không chân → Thiếu niên có chân, vòng cổ xanh → Lớn khỏe chân cao, thân dài, đuôi dài → Trưởng thành có vòng cổ đỏ, chuông vàng, vương miện.

## Phiên bản 7.1
- Bỏ giới hạn 80 giọt mây mỗi ngày.

## Phiên bản 7.2
- 🃏 Bộ sưu tập 12 thẻ chất hóa học (Thường/Hiếm/Siêu hiếm/Huyền thoại): rơi khi học xong hạt, câu cá, làm nhiệm vụ, đánh Boss; đủ bộ +50💧 và huy hiệu 🏅.
- 🎯 Nhiệm vụ hằng ngày (3 nhiệm vụ/ngày, +3💧 mỗi nhiệm vụ) và chuỗi ngày học (7 ngày liền +20💧 và 1 thẻ).
- 👾 Boss cả lớp: cô triệu hồi ở Lớp của tôi → Tổng quan, cả lớp trả lời đúng để trừ máu; thắng mỗi em +15💧 và 1 thẻ.

## Phiên bản 7.3
- Thú cưng đúng loài: rồng không chân, bay lơ lửng, thân dài uốn lượn, sừng và cánh lớn dần; gà 2 chân mảnh, có cánh, mào khi lớn; khủng long 2 chân sau to + 2 tay ngắn; mèo, cún, thỏ 4 chân.
- ⏱️ Kiểm tra 15 phút (Trò chơi và kiểm tra): trắc nghiệm máy tự chấm + tự luận cô chấm; đồng hồ 15 phút, hết giờ tự nộp; học sinh phải làm xong mới dùng chức năng khác; trang Chấm bài: nhập điểm tự luận, nhận xét, Xuất Excel, Công bố điểm cho học sinh xem.

## Phiên bản 7.4
- Bộ câu hỏi của tôi: thêm loại câu Đúng/Sai và Tự luận (có gợi ý đáp án, điểm). Dán Excel: ĐS | phát biểu | Đúng/Sai | giải thích; TL | câu hỏi | gợi ý | điểm. Câu Đúng/Sai dùng được trong trò chơi, giao bài, kiểm tra 15 phút; câu tự luận vào phần cô chấm của bài 15 phút.

## Phiên bản 7.5 (CẦN CHẠY LẠI supabase/schema.sql)
- Tự luận: mỗi câu một khung (giữ nguyên a, b, c trong cùng một câu), ở cả Kiểm tra 15 phút và Bộ câu hỏi.
- Bộ câu hỏi tự lưu sau khi dán Excel, nhập file hoặc Tí Nị soạn nháp.
- 🔔 Rung chuông vàng liên lớp: chọn nhiều lớp (hoặc thầy cô khác nhập mã phòng để đưa lớp vào), sai là rời sàn, cô công bố đáp án từng câu, cứu trợ cả sàn; bạn trụ đến cuối +20💧.

## Phiên bản 7.6 – Chạy trên Cloudflare Pages
Đã thêm: `functions/api/tini.js` (AI Tí Nị, giọng đọc), `_headers` (luôn tải bản mới), `wrangler.toml`. Vẫn chạy được trên Vercel như cũ.
1. Đưa thư mục dự án (chứa `index.html`) lên GitHub.
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → chọn kho.
   - Framework preset: None · Build command: để trống · Build output directory: `/` (nếu index.html nằm trong thư mục con thì ghi tên thư mục đó, đặt Root directory tương ứng).
3. Settings → Variables and Secrets: thêm SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY (tùy chọn GROQ_API_KEY, TINI_DAILY_LIMIT) → Deploy lại.
4. Supabase → Authentication → URL Configuration: thêm địa chỉ `https://<tên>.pages.dev` vào Site URL / Redirect URLs.

## Phiên bản 7.7 (CẦN CHẠY LẠI supabase/schema.sql) – tiết kiệm băng thông Supabase
- Học sinh hỏi thăm máy chủ bằng 1 gói rất nhỏ (student_poll) 10–15 giây/lần, chỉ tải lại cài đặt lớp khi cô thay đổi; tab ẩn thì ngừng hỏi.
- Trò chơi cả lớp, Rung chuông vàng: 1,5 giây/lần (trước 1 giây), tab ẩn thì ngừng.
- Vị trí nhân vật gửi 0,4 giây/lần (trước 0,15 giây); trang Hôm nay của cô làm mới 60 giây/lần.
