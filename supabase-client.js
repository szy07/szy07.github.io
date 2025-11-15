// Supabase配置
const SUPABASE_URL = 'https://vkethnxciczquacvhisi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZXRobnhjaWN6cXVhY3ZoaXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzA3MTEsImV4cCI6MjA3ODcwNjcxMX0.n8gXVzcrypHjrBi6Q_fd99jv5YkLtF_PIKXO8elA__k';

// 初始化Supabase客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
