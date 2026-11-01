// ================================================================
// CẤU HÌNH – cô chỉ cần sửa 2 dòng dưới đây sau khi tạo dự án Supabase.
// Lấy ở Supabase → Project Settings → API:
//   SUPABASE_URL      = "Project URL"
//   SUPABASE_ANON_KEY = khóa "anon public" (khóa này được phép để công khai)
// Để trống cả hai thì web chạy ở "Chế độ thử": dữ liệu chỉ lưu trên máy đang dùng.
// ================================================================
export const SUPABASE_URL = "https://jtivgykewjjmsxnkxwhj.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_NUu7vT1eUFDhTrC6ROChEw_oRkKSzxv";

// Thời gian một cây lớn (giây) khi lớp chưa chỉnh trong Góc thầy cô.
export const DEFAULT_GROW_SECONDS = 45;

// Tự đăng xuất học sinh sau bao nhiêu phút không thao tác.
export const IDLE_LOGOUT_MINUTES = 20;

export const APP_NAME = "Khu vườn trên mây";
export const COPYRIGHT = "© 2026 Khu vườn trên mây · KHTN 6 · Nội dung đang chờ cô duyệt";

// Admin tổng của hệ thống (có thể thêm admin phụ trong Góc thầy cô → Quản trị).
export const ADMIN_EMAILS = ["hothanhthuy309@gmail.com"];

// Địa chỉ hàm AI của Tí Nị trên Vercel (thư mục api/). Để nguyên nếu dùng Vercel.
export const TINI_API = "/api/tini";
