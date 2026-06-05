# 学校官网 + 多身份权限后台

这是一个可以部署到 GitHub Pages 的学校官网项目，并接入 Supabase 实现登录、数据库和权限控制。

## 页面结构

### 前台官网

- 首页
- 学校概况
- 院系专业
- 新闻动态
- 招生就业
- 通知公告
- 联系我们

### 多身份登录

登录弹窗中有三种入口：

- 学校管理员
- 教师
- 学生

登录时会校验 Supabase `profiles` 表中的真实身份。即使用户点了“管理员入口”，如果账号在数据库中是学生，也不能进入管理员后台。

### 后台权限

| 身份 | 权限 |
|---|---|
| 学校管理员 | 新闻、通知、院系、学生申请、用户权限、系统设置 |
| 教师 | 新闻、通知、课程管理 |
| 学生 | 查看通知、提交和查看自己的申请 |

真正的数据权限写在 `database.sql` 的 Supabase RLS 策略中，不只是前端隐藏按钮。

## 文件说明

```text
index.html          官网和后台页面入口
style.css           页面样式
app.js              前台展示、登录、后台增删改查
config.js           Supabase 配置
config.example.js   配置模板
database.sql        建表、触发器、RLS 权限策略、演示数据
.nojekyll           让 GitHub Pages 按普通静态站点发布
```

## 使用步骤

### 1. 创建 Supabase 项目

打开 Supabase，新建一个项目。

### 2. 执行数据库脚本

进入 Supabase：

```text
SQL Editor -> New query
```

复制 `database.sql` 的全部内容，执行。

### 3. 配置 Supabase URL 和 Key

打开 `config.js`，把内容改为：

```js
window.SUPABASE_CONFIG = {
  url: "https://你的项目ID.supabase.co",
  key: "你的 Publishable key 或 anon public key"
};
```

不要填写 `service_role key` 或 `secret key`。

### 4. 创建账号

进入 Supabase：

```text
Authentication -> Users -> Add user
```

创建账号后，系统会自动在 `profiles` 表中生成记录，默认身份为 `student`。

### 5. 设置管理员和教师身份

在 SQL Editor 中执行：

```sql
update public.profiles
set role = 'admin', full_name = '学校管理员'
where email = '你的管理员邮箱';

update public.profiles
set role = 'teacher', full_name = '教师姓名'
where email = '教师邮箱';
```

学生账号不用改，默认就是 `student`。

### 6. 上传到 GitHub Pages

1. 新建 GitHub 仓库。
2. 上传本项目全部文件，确保 `index.html` 在仓库根目录。
3. 打开仓库 `Settings -> Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/root`。
6. 保存并等待发布。

访问地址通常是：

```text
https://你的GitHub用户名.github.io/仓库名/
```

## 重要说明

GitHub Pages 只能托管静态文件。登录、数据库、权限都由 Supabase 提供。

如果你要把这个项目改成某个真实学校，请重点改：

- `index.html` 里的学校名称、校训、联系方式
- `database.sql` 的演示数据
- `style.css` 的主色调
