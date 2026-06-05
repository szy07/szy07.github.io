// 1. 到 Supabase 项目后台：Project Settings -> Data API / API
// 2. 复制 Project URL 到 url
// 3. 复制 publishable key 或 anon public key 到 key
// 注意：不要把 secret key / service_role key 写在前端代码里。
window.SUPABASE_CONFIG = {
  url: "YOUR_SUPABASE_URL",
  key: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
};
