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
