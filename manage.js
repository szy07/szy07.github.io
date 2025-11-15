// 使用Supabase处理注册
registerForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;

  if (password !== confirmPassword) {
    alert('两次输入的密码不一致！');
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    alert('注册失败: ' + error.message);
  } else {
    alert('注册成功！请检查您的邮箱验证账户。');
    closeRegisterModalFunc();
    openLoginModal();
  }
});
// 使用Supabase处理登录
loginForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const email = document.getElementById('username').value; // 或改为email字段
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    alert('登录失败: ' + error.message);
  } else {
    // 登录成功
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    closeLoginModalFunc();
    showLoginSuccess();
    updateUI();
  }
});
// 添加到您的后端API中
app.get('/api/test-db', async (req, res) => {
  try {
    // 简单数据库查询测试
    const [result] = await pool.execute('SELECT 1 as test');
    res.json({ 
      status: 'success', 
      message: '数据库连接正常',
      data: result
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: '数据库连接失败',
      error: error.message 
    });
  }
});
