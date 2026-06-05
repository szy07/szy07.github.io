# GitHub Pages + Supabase 云端后台管理系统

这是一个可以部署到 GitHub Pages 的静态后台管理系统，数据接入 Supabase。

## 功能

- Supabase Auth 邮箱密码登录
- Supabase Postgres 云端数据存储
- 仪表盘统计
- 用户管理：新增、编辑、删除、搜索
- 项目管理：新增、编辑、删除、搜索
- 项目状态图表
- JSON 数据导入 / 导出
- 明暗主题切换
- GitHub Pages 静态部署

## 文件说明

```text
index.html          页面结构
style.css           页面样式
app.js              系统逻辑与 Supabase CRUD
config.js           Supabase 项目配置，需要你填写
config.example.js   配置模板
database.sql        Supabase 建表与 RLS 策略
README.md           使用说明
.nojekyll           避免 GitHub Pages 额外处理
```

## 第一步：创建 Supabase 项目

1. 打开 Supabase 官网并新建 Project。
2. 进入项目后，打开 SQL Editor。
3. 把 `database.sql` 文件中的全部 SQL 复制进去并执行。
4. 打开 Authentication。
5. 创建一个登录用户，例如：

```text
Email: admin@example.com
Password: 你自己设置的密码
```

建议在课程作业或演示场景中，直接在 Supabase Dashboard 的 Authentication -> Users 里手动创建用户。

## 第二步：填写 config.js

打开 `config.js`，把里面的内容改成你的 Supabase 信息：

```js
window.SUPABASE_CONFIG = {
  url: "https://你的项目ID.supabase.co",
  key: "你的 publishable key 或 anon public key"
};
```

注意：

- 可以放 publishable key 或 anon public key。
- 不要放 secret key。
- 不要放 service_role key。
- 前端网页里的 key 是公开可见的，所以必须开启 RLS。

## 第三步：本地测试

因为浏览器有时会限制本地文件访问，建议用 VS Code 的 Live Server 打开，或者在项目目录运行：

```bash
python -m http.server 5500
```

然后访问：

```text
http://localhost:5500
```

## 第四步：部署到 GitHub Pages

1. 在 GitHub 新建仓库，例如 `management-system-supabase`。
2. 上传本项目所有文件，确保 `index.html` 在仓库根目录。
3. 进入仓库 Settings。
4. 打开 Pages。
5. Source 选择 `Deploy from a branch`。
6. Branch 选择 `main`，目录选择 `/root`。
7. 保存，等待 GitHub Pages 自动发布。

访问地址一般是：

```text
https://你的GitHub用户名.github.io/management-system-supabase/
```

## 关于安全

当前 SQL 策略适合课程作业、演示系统、小型作品集：只要是登录用户，就可以管理全部数据。

如果后续要做真实项目，建议：

- 增加 `owner_id uuid` 字段。
- 数据写入时绑定 `auth.uid()`。
- RLS 改成“只能管理自己的数据”。
- 管理员权限放到后端或 Supabase Edge Functions 中处理。
- 永远不要在前端暴露 service_role key。
