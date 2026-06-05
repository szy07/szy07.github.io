const ROLE_LABELS = {
  admin: "学校管理员",
  teacher: "教师",
  student: "学生"
};

const STATUS_LABELS = {
  published: "已发布",
  draft: "草稿",
  active: "启用",
  disabled: "禁用",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回"
};

const MENU_BY_ROLE = {
  admin: [
    ["overview", "数据总览"],
    ["news", "新闻管理"],
    ["notices", "通知公告"],
    ["departments", "院系专业"],
    ["applications", "学生申请"],
    ["users", "用户与权限"],
    ["settings", "系统设置"]
  ],
  teacher: [
    ["overview", "工作台"],
    ["news", "新闻管理"],
    ["notices", "通知公告"],
    ["courses", "课程管理"]
  ],
  student: [
    ["overview", "学生首页"],
    ["studentNotices", "通知查看"],
    ["myApplications", "我的申请"]
  ]
};

const demoData = {
  departments: [
    { id: "d1", name: "智能制造学院", description: "面向智能制造、自动化控制、工业机器人等领域培养应用型人才。", major_count: 8 },
    { id: "d2", name: "电子信息学院", description: "覆盖电子信息工程、物联网、软件技术、大数据技术等专业方向。", major_count: 10 },
    { id: "d3", name: "经济管理学院", description: "建设现代物流、电子商务、财务管理、市场营销等专业群。", major_count: 7 }
  ],
  news: [
    { id: "n1", title: "学校召开数字校园建设推进会", category: "学校要闻", summary: "会议围绕智慧教学、数据治理、校园服务一体化等工作进行部署。", content: "", status: "published", publish_at: "2026-06-01" },
    { id: "n2", title: "我校学生在创新创业大赛中获奖", category: "校园动态", summary: "参赛团队围绕绿色校园、智能硬件、数字服务等方向展示项目成果。", content: "", status: "published", publish_at: "2026-05-28" },
    { id: "n3", title: "校企合作实训基地正式启用", category: "产教融合", summary: "基地将为学生提供真实项目训练和岗位能力提升平台。", content: "", status: "published", publish_at: "2026-05-20" }
  ],
  notices: [
    { id: "no1", title: "关于开展期末教学检查的通知", content: "请各二级学院按要求完成课程材料归档与课堂质量检查。", status: "published", publish_at: "2026-06-03" },
    { id: "no2", title: "2026 年暑期社会实践报名通知", content: "学生可登录学生入口提交报名申请，学院审核后统一发布结果。", status: "published", publish_at: "2026-06-02" }
  ],
  courses: [],
  applications: [],
  profiles: []
};

let client = null;
let isSupabaseReady = false;
let selectedLoginRole = "admin";
let currentUser = null;
let currentProfile = null;
let currentBackendPage = "overview";
let entitySubmitHandler = null;
let publicCache = structuredClone(demoData);

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", init);

async function init() {
  initSupabase();
  bindEvents();
  await loadPublicData();
  renderPublicSite();
  await restoreSession();
}

function initSupabase() {
  const config = window.SUPABASE_CONFIG || {};
  const hasConfig =
    config.url &&
    config.key &&
    !config.url.includes("YOUR_PROJECT_ID") &&
    !config.key.includes("YOUR_");

  if (hasConfig && window.supabase) {
    client = window.supabase.createClient(config.url, config.key);
    isSupabaseReady = true;
  }
}

function bindEvents() {
  $("#openLoginBtn").addEventListener("click", () => openLogin("admin"));
  $("#openLoginBtn2").addEventListener("click", () => openLogin("admin"));
  $("#studentApplyBtn").addEventListener("click", () => openLogin("student"));
  $("#closeLoginBtn").addEventListener("click", () => $("#loginDialog").close());
  $("#loginForm").addEventListener("submit", handleLogin);

  $$(".role-tab").forEach(tab => {
    tab.addEventListener("click", () => selectLoginRole(tab.dataset.role));
  });

  $("#logoutBtn").addEventListener("click", logout);
  $("#backToSiteBtn").addEventListener("click", showPublicSite);
  $("#closeEntityBtn").addEventListener("click", closeEntityDialog);
  $("#cancelEntityBtn").addEventListener("click", closeEntityDialog);
  $("#entityForm").addEventListener("submit", handleEntitySubmit);
}

async function loadPublicData() {
  if (!isSupabaseReady) {
    publicCache = structuredClone(demoData);
    return;
  }

  const [departments, news, notices] = await Promise.all([
    selectRows("departments", "*", query => query.order("display_order", { ascending: true })),
    selectRows("news", "*", query => query.eq("status", "published").order("publish_at", { ascending: false }).limit(6)),
    selectRows("notices", "*", query => query.eq("status", "published").order("publish_at", { ascending: false }).limit(8))
  ]);

  publicCache = {
    ...demoData,
    departments: departments.data?.length ? departments.data : demoData.departments,
    news: news.data?.length ? news.data : demoData.news,
    notices: notices.data?.length ? notices.data : demoData.notices
  };
}

function renderPublicSite() {
  $("#departmentList").innerHTML = publicCache.departments.map(item => `
    <article class="info-card">
      <span class="tag">${Number(item.major_count || 0)} 个专业方向</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description || "")}</p>
    </article>
  `).join("");

  $("#newsList").innerHTML = publicCache.news.map(item => `
    <article class="news-card">
      <div class="news-thumb"></div>
      <div class="news-body">
        <span class="news-meta">${escapeHtml(item.category || "学校新闻")} · ${formatDate(item.publish_at || item.created_at)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary || "")}</p>
      </div>
    </article>
  `).join("");

  $("#noticeList").innerHTML = publicCache.notices.map(item => `
    <article class="notice-item">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.content || "")}</p>
      </div>
      <span class="news-meta">${formatDate(item.publish_at || item.created_at)}</span>
    </article>
  `).join("");
}

function openLogin(role = "admin") {
  selectLoginRole(role);
  $("#loginMessage").textContent = isSupabaseReady
    ? ""
    : "请先在 config.js 中填写 Supabase URL 和 Publishable/anon key。";
  $("#loginDialog").showModal();
}

function selectLoginRole(role) {
  selectedLoginRole = role;
  $$(".role-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.role === role));
}

async function handleLogin(event) {
  event.preventDefault();
  $("#loginMessage").textContent = "";

  if (!isSupabaseReady) {
    $("#loginMessage").textContent = "Supabase 尚未配置，无法登录后台。";
    return;
  }

  const email = $("#loginEmail").value.trim();
  const password = $("#loginPassword").value;

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    $("#loginMessage").textContent = `登录失败：${error.message}`;
    return;
  }

  const profileResult = await getProfile(data.user.id);
  if (profileResult.error || !profileResult.data) {
    await client.auth.signOut();
    $("#loginMessage").textContent = "登录成功，但未找到 profiles 身份记录。请先运行 database.sql 并配置用户身份。";
    return;
  }

  const profile = profileResult.data;
  if (profile.status !== "active") {
    await client.auth.signOut();
    $("#loginMessage").textContent = "该账号已被禁用，请联系管理员。";
    return;
  }

  if (profile.role !== selectedLoginRole) {
    await client.auth.signOut();
    $("#loginMessage").textContent = `身份不匹配：该账号实际身份是“${ROLE_LABELS[profile.role] || profile.role}”。`;
    return;
  }

  currentUser = data.user;
  currentProfile = profile;
  $("#loginDialog").close();
  showBackend();
}

async function restoreSession() {
  if (!isSupabaseReady) return;

  const { data } = await client.auth.getSession();
  if (!data.session?.user) return;

  const profileResult = await getProfile(data.session.user.id);
  if (profileResult.data?.status === "active") {
    currentUser = data.session.user;
    currentProfile = profileResult.data;
  }
}

async function getProfile(userId) {
  return client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
}

async function logout() {
  if (client) await client.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showPublicSite();
}

function showPublicSite() {
  $("#backendApp").classList.add("hidden");
  $("#publicSite").classList.remove("hidden");
  $(".site-header").classList.remove("hidden");
}

function showBackend() {
  $("#publicSite").classList.add("hidden");
  $(".site-header").classList.add("hidden");
  $("#backendApp").classList.remove("hidden");

  $("#currentRoleText").textContent = ROLE_LABELS[currentProfile.role] || currentProfile.role;
  $("#currentUserName").textContent = currentProfile.full_name || currentUser.email;
  $("#currentUserEmail").textContent = currentUser.email;

  buildBackendMenu();
  const firstPage = MENU_BY_ROLE[currentProfile.role][0][0];
  renderBackendPage(firstPage);
}

function buildBackendMenu() {
  $("#backendMenu").innerHTML = MENU_BY_ROLE[currentProfile.role].map(([id, label]) => `
    <button data-page="${id}">${label}</button>
  `).join("");

  $$("#backendMenu button").forEach(btn => {
    btn.addEventListener("click", () => renderBackendPage(btn.dataset.page));
  });
}

async function renderBackendPage(page) {
  currentBackendPage = page;
  $$("#backendMenu button").forEach(btn => btn.classList.toggle("active", btn.dataset.page === page));

  const titleMap = {
    overview: ["数据总览", "查看当前身份可访问的数据"],
    news: ["新闻管理", "维护学校官网新闻动态"],
    notices: ["通知公告", "维护面向师生的通知信息"],
    departments: ["院系专业", "维护官网院系和专业介绍"],
    applications: ["学生申请", "审核学生提交的申请"],
    users: ["用户与权限", "维护用户身份、状态和权限"],
    settings: ["系统设置", "查看配置和部署说明"],
    courses: ["课程管理", "教师维护课程信息"],
    studentNotices: ["通知查看", "查看学校发布的通知"],
    myApplications: ["我的申请", "提交和查看个人申请"]
  };

  $("#backendTitle").textContent = titleMap[page]?.[0] || "管理后台";
  $("#backendSubtitle").textContent = titleMap[page]?.[1] || "";

  if (page === "overview") return renderOverview();
  if (page === "news") return renderNewsManager();
  if (page === "notices") return renderNoticeManager();
  if (page === "departments") return renderDepartmentManager();
  if (page === "applications") return renderApplicationManager();
  if (page === "users") return renderUserManager();
  if (page === "settings") return renderSettings();
  if (page === "courses") return renderCourseManager();
  if (page === "studentNotices") return renderStudentNotices();
  if (page === "myApplications") return renderMyApplications();
}

async function renderOverview() {
  const role = currentProfile.role;
  let cards = [];

  if (role === "admin") {
    const [news, notices, departments, applications, profiles] = await Promise.all([
      selectRows("news"),
      selectRows("notices"),
      selectRows("departments"),
      selectRows("student_applications"),
      selectRows("profiles")
    ]);
    cards = [
      ["新闻数量", news.data?.length || 0],
      ["通知数量", notices.data?.length || 0],
      ["院系数量", departments.data?.length || 0],
      ["用户数量", profiles.data?.length || 0],
      ["待审申请", (applications.data || []).filter(x => x.status === "pending").length]
    ];
  }

  if (role === "teacher") {
    const [news, notices, courses] = await Promise.all([
      selectRows("news"),
      selectRows("notices"),
      selectRows("courses")
    ]);
    cards = [
      ["可见新闻", news.data?.length || 0],
      ["通知数量", notices.data?.length || 0],
      ["我的课程", courses.data?.length || 0],
      ["当前身份", "教师"]
    ];
  }

  if (role === "student") {
    const [notices, apps] = await Promise.all([
      selectRows("notices", "*", q => q.eq("status", "published")),
      selectRows("student_applications")
    ]);
    cards = [
      ["公开通知", notices.data?.length || 0],
      ["我的申请", apps.data?.length || 0],
      ["待审核", (apps.data || []).filter(x => x.status === "pending").length],
      ["当前身份", "学生"]
    ];
  }

  $("#backendContent").innerHTML = `
    ${configWarning()}
    <div class="dashboard-grid">
      ${cards.map(([label, value]) => `
        <div class="backend-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="table-card">
      <h3>权限说明</h3>
      ${permissionDescription(role)}
    </div>
  `;
}

function permissionDescription(role) {
  const map = {
    admin: `
      <p class="muted">管理员可以管理官网新闻、通知、院系专业、学生申请、用户身份与系统设置。</p>
      <p class="muted">注意：前端不能直接创建 Supabase Auth 用户。新增账号需要在 Supabase Authentication 中创建，然后在本后台修改 profiles 表里的身份。</p>
    `,
    teacher: `
      <p class="muted">教师可以维护自己发布的新闻、通知和课程信息，但不能管理用户权限、系统设置和学生身份。</p>
    `,
    student: `
      <p class="muted">学生可以查看公开通知，提交和查看自己的申请，不能修改官网公开内容。</p>
    `
  };
  return map[role] || "";
}

async function renderNewsManager() {
  const result = await selectRows("news", "*", q => q.order("created_at", { ascending: false }));
  const rows = result.data || [];

  renderTable("新闻管理", "新增新闻", ["标题", "栏目", "状态", "发布时间", "操作"], rows.map(item => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.category || "-")}</td>
      <td>${badge(item.status)}</td>
      <td>${formatDate(item.publish_at || item.created_at)}</td>
      <td>${rowActions([
        ["编辑", () => openNewsDialog(item)],
        ["删除", () => deleteRow("news", item.id)]
      ])}</td>
    </tr>
  `), () => openNewsDialog());
}

async function openNewsDialog(item = null) {
  openEntityDialog(item ? "编辑新闻" : "新增新闻", [
    inputField("title", "标题", item?.title || "", "text", true),
    inputField("category", "栏目", item?.category || "学校要闻", "text", true),
    textareaField("summary", "摘要", item?.summary || "", true),
    textareaField("content", "正文", item?.content || "", false),
    selectField("status", "状态", item?.status || "draft", [["draft", "草稿"], ["published", "已发布"]]),
    inputField("publish_at", "发布时间", toDateInput(item?.publish_at), "date", false)
  ], async data => {
    const payload = {
      title: data.title,
      category: data.category,
      summary: data.summary,
      content: data.content,
      status: data.status,
      publish_at: data.publish_at || new Date().toISOString().slice(0, 10),
      author_id: currentUser.id
    };
    await saveRow("news", payload, item?.id);
    renderNewsManager();
  });
}

async function renderNoticeManager() {
  const result = await selectRows("notices", "*", q => q.order("created_at", { ascending: false }));
  const rows = result.data || [];

  renderTable("通知公告", "新增通知", ["标题", "状态", "发布时间", "操作"], rows.map(item => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${badge(item.status)}</td>
      <td>${formatDate(item.publish_at || item.created_at)}</td>
      <td>${rowActions([
        ["编辑", () => openNoticeDialog(item)],
        ["删除", () => deleteRow("notices", item.id)]
      ])}</td>
    </tr>
  `), () => openNoticeDialog());
}

async function openNoticeDialog(item = null) {
  openEntityDialog(item ? "编辑通知" : "新增通知", [
    inputField("title", "标题", item?.title || "", "text", true),
    textareaField("content", "内容", item?.content || "", true),
    selectField("status", "状态", item?.status || "draft", [["draft", "草稿"], ["published", "已发布"]]),
    inputField("publish_at", "发布时间", toDateInput(item?.publish_at), "date", false)
  ], async data => {
    const payload = {
      title: data.title,
      content: data.content,
      status: data.status,
      publish_at: data.publish_at || new Date().toISOString().slice(0, 10),
      created_by: currentUser.id
    };
    await saveRow("notices", payload, item?.id);
    renderNoticeManager();
  });
}

async function renderDepartmentManager() {
  const result = await selectRows("departments", "*", q => q.order("display_order", { ascending: true }));
  const rows = result.data || [];

  renderTable("院系专业", "新增院系", ["院系名称", "专业数量", "排序", "操作"], rows.map(item => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${Number(item.major_count || 0)}</td>
      <td>${Number(item.display_order || 0)}</td>
      <td>${rowActions([
        ["编辑", () => openDepartmentDialog(item)],
        ["删除", () => deleteRow("departments", item.id)]
      ])}</td>
    </tr>
  `), () => openDepartmentDialog());
}

async function openDepartmentDialog(item = null) {
  openEntityDialog(item ? "编辑院系" : "新增院系", [
    inputField("name", "院系名称", item?.name || "", "text", true),
    textareaField("description", "简介", item?.description || "", true),
    inputField("major_count", "专业数量", item?.major_count || 0, "number", true),
    inputField("display_order", "排序", item?.display_order || 0, "number", true)
  ], async data => {
    const payload = {
      name: data.name,
      description: data.description,
      major_count: Number(data.major_count || 0),
      display_order: Number(data.display_order || 0)
    };
    await saveRow("departments", payload, item?.id);
    await loadPublicData();
    renderDepartmentManager();
  });
}

async function renderApplicationManager() {
  const result = await selectRows("student_applications", "*", q => q.order("created_at", { ascending: false }));
  const rows = result.data || [];

  renderTable("学生申请", null, ["标题", "申请人ID", "状态", "时间", "操作"], rows.map(item => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.applicant_id)}</td>
      <td>${badge(item.status)}</td>
      <td>${formatDate(item.created_at)}</td>
      <td>${rowActions([
        ["查看/审核", () => openApplicationReviewDialog(item)],
        ["删除", () => deleteRow("student_applications", item.id)]
      ])}</td>
    </tr>
  `));
}

async function openApplicationReviewDialog(item) {
  openEntityDialog("审核申请", [
    inputField("title", "标题", item.title, "text", true),
    textareaField("description", "申请内容", item.description || "", true),
    selectField("status", "审核状态", item.status || "pending", [["pending", "待审核"], ["approved", "已通过"], ["rejected", "已驳回"]]),
    textareaField("reply", "审核意见", item.reply || "", false)
  ], async data => {
    await saveRow("student_applications", {
      title: data.title,
      description: data.description,
      status: data.status,
      reply: data.reply
    }, item.id);
    renderApplicationManager();
  });
}

async function renderUserManager() {
  const result = await selectRows("profiles", "*", q => q.order("created_at", { ascending: false }));
  const rows = result.data || [];

  renderTable("用户与权限", null, ["姓名", "邮箱", "身份", "状态", "操作"], rows.map(item => `
    <tr>
      <td>${escapeHtml(item.full_name || "-")}</td>
      <td>${escapeHtml(item.email || "-")}</td>
      <td>${badge(item.role)}</td>
      <td>${badge(item.status)}</td>
      <td>${rowActions([
        ["编辑权限", () => openProfileDialog(item)]
      ])}</td>
    </tr>
  `), null, `
    <p class="muted">新增账号请先到 Supabase 后台 Authentication → Users 创建用户；创建后会自动出现在 profiles 表，管理员可在这里调整身份。</p>
  `);
}

async function openProfileDialog(item) {
  openEntityDialog("编辑用户权限", [
    inputField("full_name", "姓名", item.full_name || "", "text", true),
    selectField("role", "身份", item.role || "student", [["admin", "学校管理员"], ["teacher", "教师"], ["student", "学生"]]),
    selectField("status", "状态", item.status || "active", [["active", "启用"], ["disabled", "禁用"]])
  ], async data => {
    await saveRow("profiles", {
      full_name: data.full_name,
      role: data.role,
      status: data.status
    }, item.id);
    renderUserManager();
  });
}

async function renderSettings() {
  $("#backendContent").innerHTML = `
    ${configWarning()}
    <div class="table-card">
      <h3>系统设置</h3>
      <p class="muted"><strong>部署方式：</strong>GitHub Pages 负责托管 HTML/CSS/JS，Supabase 负责登录、数据库和权限。</p>
      <p class="muted"><strong>前端配置：</strong>在 config.js 中填写 Supabase Project URL 和 Publishable/anon public key。</p>
      <p class="muted"><strong>权限核心：</strong>不同身份的菜单由前端控制，真正的数据权限由 database.sql 里的 RLS 策略控制。</p>
      <p class="muted"><strong>安全提醒：</strong>不要把 service_role key 或 secret key 写进前端文件。</p>
    </div>
  `;
}

async function renderCourseManager() {
  const result = await selectRows("courses", "*", q => q.order("created_at", { ascending: false }));
  const rows = result.data || [];

  renderTable("课程管理", "新增课程", ["课程名称", "学期", "学分", "状态", "操作"], rows.map(item => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.term || "-")}</td>
      <td>${Number(item.credit || 0)}</td>
      <td>${badge(item.status)}</td>
      <td>${rowActions([
        ["编辑", () => openCourseDialog(item)],
        ["删除", () => deleteRow("courses", item.id)]
      ])}</td>
    </tr>
  `), () => openCourseDialog());
}

async function openCourseDialog(item = null) {
  openEntityDialog(item ? "编辑课程" : "新增课程", [
    inputField("name", "课程名称", item?.name || "", "text", true),
    inputField("term", "学期", item?.term || "2026-2027-1", "text", true),
    inputField("credit", "学分", item?.credit || 2, "number", true),
    selectField("status", "状态", item?.status || "active", [["active", "启用"], ["disabled", "停用"]])
  ], async data => {
    await saveRow("courses", {
      name: data.name,
      term: data.term,
      credit: Number(data.credit || 0),
      status: data.status,
      teacher_id: currentUser.id
    }, item?.id);
    renderCourseManager();
  });
}

async function renderStudentNotices() {
  const result = await selectRows("notices", "*", q => q.eq("status", "published").order("publish_at", { ascending: false }));
  const rows = result.data || [];

  $("#backendContent").innerHTML = `
    ${configWarning()}
    <div class="table-card">
      <div class="table-head">
        <h3>学校通知</h3>
      </div>
      <div class="notice-list">
        ${rows.map(item => `
          <article class="notice-item">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.content || "")}</p>
            </div>
            <span class="news-meta">${formatDate(item.publish_at || item.created_at)}</span>
          </article>
        `).join("") || `<div class="empty">暂无通知</div>`}
      </div>
    </div>
  `;
}

async function renderMyApplications() {
  const result = await selectRows("student_applications", "*", q => q.order("created_at", { ascending: false }));
  const rows = result.data || [];

  renderTable("我的申请", "提交申请", ["标题", "状态", "回复", "提交时间", "操作"], rows.map(item => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${badge(item.status)}</td>
      <td>${escapeHtml(item.reply || "-")}</td>
      <td>${formatDate(item.created_at)}</td>
      <td>${rowActions(item.status === "pending" ? [
        ["编辑", () => openStudentApplicationDialog(item)],
        ["删除", () => deleteRow("student_applications", item.id)]
      ] : [])}</td>
    </tr>
  `), () => openStudentApplicationDialog());
}

async function openStudentApplicationDialog(item = null) {
  openEntityDialog(item ? "编辑申请" : "提交申请", [
    inputField("title", "申请标题", item?.title || "", "text", true),
    textareaField("description", "申请内容", item?.description || "", true)
  ], async data => {
    const payload = {
      title: data.title,
      description: data.description,
      applicant_id: currentUser.id,
      status: item?.status || "pending"
    };
    await saveRow("student_applications", payload, item?.id);
    renderMyApplications();
  });
}

function renderTable(title, addLabel, headers, bodyRows, onAdd, extraTop = "") {
  $("#backendContent").innerHTML = `
    ${configWarning()}
    <div class="table-card">
      <div class="table-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${extraTop || ""}
        </div>
        <div class="table-tools">
          ${addLabel ? `<button id="addRowBtn" class="btn btn-primary">${escapeHtml(addLabel)}</button>` : ""}
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
          </thead>
          <tbody>${bodyRows.join("") || `<tr><td colspan="${headers.length}" class="empty">暂无数据</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;

  if (addLabel && onAdd) {
    $("#addRowBtn").addEventListener("click", onAdd);
  }
}

function rowActions(actions) {
  if (!actions.length) return "-";
  const id = `actions-${crypto.randomUUID()}`;
  setTimeout(() => {
    actions.forEach(([label, handler], index) => {
      const btn = document.querySelector(`[data-action-group="${id}"][data-action-index="${index}"]`);
      if (btn) btn.addEventListener("click", handler);
    });
  });
  return `<div class="row-actions">${actions.map(([label], index) => `
    <button class="btn btn-ghost" data-action-group="${id}" data-action-index="${index}">${escapeHtml(label)}</button>
  `).join("")}</div>`;
}

function openEntityDialog(title, fields, onSubmit) {
  $("#entityTitle").textContent = title;
  $("#entityFields").innerHTML = fields.join("");
  $("#entityMessage").textContent = "";
  entitySubmitHandler = onSubmit;
  $("#entityDialog").showModal();
}

function closeEntityDialog() {
  entitySubmitHandler = null;
  $("#entityDialog").close();
}

async function handleEntitySubmit(event) {
  event.preventDefault();
  if (!entitySubmitHandler) return;

  const data = Object.fromEntries(new FormData(event.target).entries());
  $("#entityMessage").textContent = "";

  try {
    await entitySubmitHandler(data);
    closeEntityDialog();
  } catch (error) {
    $("#entityMessage").textContent = error.message || "保存失败";
  }
}

async function selectRows(table, columns = "*", transform = null) {
  try {
    let query = client.from(table).select(columns);
    if (transform) query = transform(query);
    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

async function saveRow(table, payload, id = null) {
  let result;
  if (id) {
    result = await client.from(table).update(payload).eq("id", id);
  } else {
    result = await client.from(table).insert(payload);
  }

  if (result.error) throw result.error;
  await loadPublicData();
  renderPublicSite();
}

async function deleteRow(table, id) {
  if (!confirm("确定删除这条数据吗？")) return;

  const { error } = await client.from(table).delete().eq("id", id);
  if (error) {
    alert(`删除失败：${error.message}`);
    return;
  }

  await loadPublicData();
  renderPublicSite();
  renderBackendPage(currentBackendPage);
}

function inputField(name, label, value = "", type = "text", required = false) {
  return `
    <label>
      ${escapeHtml(label)}
      <input name="${escapeAttr(name)}" type="${escapeAttr(type)}" value="${escapeAttr(value)}" ${required ? "required" : ""} />
    </label>
  `;
}

function textareaField(name, label, value = "", required = false) {
  return `
    <label>
      ${escapeHtml(label)}
      <textarea name="${escapeAttr(name)}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea>
    </label>
  `;
}

function selectField(name, label, value, options) {
  return `
    <label>
      ${escapeHtml(label)}
      <select name="${escapeAttr(name)}">
        ${options.map(([val, text]) => `
          <option value="${escapeAttr(val)}" ${String(val) === String(value) ? "selected" : ""}>${escapeHtml(text)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function badge(value) {
  const text = STATUS_LABELS[value] || ROLE_LABELS[value] || value || "-";
  return `<span class="badge ${escapeAttr(value || "")}">${escapeHtml(text)}</span>`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function toDateInput(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function configWarning() {
  if (isSupabaseReady) return "";
  return `<div class="config-warning">当前是演示数据模式。请先配置 config.js 并执行 database.sql，才能使用真实登录和云端数据库。</div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
