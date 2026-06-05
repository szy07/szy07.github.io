const THEME_KEY = "supabase_admin_theme";

const sampleAppUsers = [
  { name: "张三", role: "管理员", email: "admin@example.com", status: "active" },
  { name: "李四", role: "运营", email: "operation@example.com", status: "active" },
  { name: "王五", role: "访客", email: "guest@example.com", status: "pause" }
];

const sampleProjects = [
  { name: "官网改版", owner: "张三", status: "进行中", budget: 8000, deadline: "2026-07-10" },
  { name: "数据看板", owner: "李四", status: "待开始", budget: 5200, deadline: "2026-07-25" },
  { name: "移动端适配", owner: "王五", status: "已完成", budget: 3600, deadline: "2026-06-20" }
];

let client = null;
let session = null;
let state = { appUsers: [], projects: [] };
let currentPage = "dashboard";
let editing = null;
let keyword = "";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function getSupabaseConfig() {
  return window.SUPABASE_CONFIG || {};
}

function isConfigured() {
  const { url, key } = getSupabaseConfig();
  return Boolean(
    url &&
    key &&
    !url.includes("YOUR_SUPABASE_URL") &&
    !key.includes("YOUR_SUPABASE")
  );
}

function createSupabaseClient() {
  if (!isConfigured()) {
    $("#setupWarning").classList.remove("hidden");
    return null;
  }

  const { url, key } = getSupabaseConfig();
  return window.supabase.createClient(url, key);
}

async function init() {
  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "dark") document.body.classList.add("dark");

  bindEvents();
  client = createSupabaseClient();

  if (!client) {
    showLogin();
    $("#loginError").textContent = "Supabase 尚未配置，不能登录。";
    return;
  }

  const { data, error } = await client.auth.getSession();
  if (error) {
    showToast(error.message);
  }

  session = data?.session || null;

  client.auth.onAuthStateChange(async (_event, newSession) => {
    session = newSession;
    if (session) {
      showApp();
      await loadCloudData();
    } else {
      state = { appUsers: [], projects: [] };
      showLogin();
    }
  });

  if (session) {
    showApp();
    await loadCloudData();
  } else {
    showLogin();
  }
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", login);
  $("#logoutBtn").addEventListener("click", logout);
  $("#themeBtn").addEventListener("click", toggleTheme);
  $("#refreshBtn").addEventListener("click", loadCloudData);

  $$(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => changePage(btn.dataset.page));
  });

  $("#globalSearch").addEventListener("input", (event) => {
    keyword = event.target.value.trim().toLowerCase();
    renderUsers();
    renderProjects();
    renderRecentProjects();
  });

  $("#addUserBtn").addEventListener("click", () => openUserModal());
  $("#addProjectBtn").addEventListener("click", () => openProjectModal());
  $("#cancelModal").addEventListener("click", () => $("#modal").close());
  $("#modalForm").addEventListener("submit", saveModal);

  $("#exportBtn").addEventListener("click", exportData);
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", importData);
  $("#seedBtn").addEventListener("click", seedData);
  $("#clearBtn").addEventListener("click", clearCloudData);
}

async function login(event) {
  event.preventDefault();
  $("#loginError").textContent = "";

  if (!client) {
    $("#loginError").textContent = "Supabase 尚未配置。";
    return;
  }

  const email = $("#email").value.trim();
  const password = $("#password").value.trim();

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    $("#loginError").textContent = "登录失败：" + error.message;
  }
}

async function logout() {
  if (!client) return;
  await client.auth.signOut();
}

function showLogin() {
  $("#loginPage").classList.remove("hidden");
  $("#appPage").classList.add("hidden");
}

function showApp() {
  $("#loginPage").classList.add("hidden");
  $("#appPage").classList.remove("hidden");
  $("#currentUser").textContent = session?.user?.email || "-";
  renderAll();
}

async function loadCloudData() {
  if (!client || !session) return;

  showToast("正在读取 Supabase 数据...");

  const [usersResult, projectsResult] = await Promise.all([
    client.from("app_users").select("*").order("created_at", { ascending: false }),
    client.from("projects").select("*").order("deadline", { ascending: true })
  ]);

  if (usersResult.error) {
    showToast("读取用户失败：" + usersResult.error.message);
    return;
  }

  if (projectsResult.error) {
    showToast("读取项目失败：" + projectsResult.error.message);
    return;
  }

  state.appUsers = usersResult.data || [];
  state.projects = projectsResult.data || [];
  renderAll();
  showToast("数据已更新");
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
  drawStatusChart();
}

function changePage(page) {
  currentPage = page;
  $$(".page").forEach(item => item.classList.remove("active"));
  $(`#${page}`).classList.add("active");

  $$(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.page === page));

  const titles = {
    dashboard: ["仪表盘", "查看 Supabase 云端数据"],
    users: ["用户管理", "维护账号、角色与状态"],
    projects: ["项目管理", "维护项目进度、预算与截止日期"],
    settings: ["系统设置", "管理 Supabase 连接和云端数据"]
  };

  $("#pageTitle").textContent = titles[page][0];
  $("#pageSubTitle").textContent = titles[page][1];
}

function matchKeyword(...values) {
  if (!keyword) return true;
  return values.some(value => String(value || "").toLowerCase().includes(keyword));
}

function renderAll() {
  renderStats();
  renderUsers();
  renderProjects();
  renderRecentProjects();
  drawStatusChart();
}

function renderStats() {
  const running = state.projects.filter(p => p.status === "进行中").length;
  const totalBudget = state.projects.reduce((sum, p) => sum + Number(p.budget || 0), 0);

  $("#userCount").textContent = state.appUsers.length;
  $("#projectCount").textContent = state.projects.length;
  $("#runningCount").textContent = running;
  $("#budgetTotal").textContent = formatMoney(totalBudget);
}

function renderUsers() {
  const users = state.appUsers.filter(user => matchKeyword(user.name, user.role, user.email, user.status));

  $("#userTable").innerHTML = users.map(user => `
    <tr>
      <td>${escapeHtml(user.name)}</td>
      <td>${escapeHtml(user.role)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${renderUserStatus(user.status)}</td>
      <td>
        <div class="row-actions">
          <button class="secondary" onclick="openUserModal('${user.id}')">编辑</button>
          <button class="danger" onclick="deleteUser('${user.id}')">删除</button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5">暂无数据</td></tr>`;
}

function renderProjects() {
  const projects = state.projects.filter(project =>
    matchKeyword(project.name, project.owner, project.status, project.deadline)
  );

  $("#projectTable").innerHTML = projects.map(project => `
    <tr>
      <td>${escapeHtml(project.name)}</td>
      <td>${escapeHtml(project.owner)}</td>
      <td>${renderProjectStatus(project.status)}</td>
      <td>${formatMoney(project.budget)}</td>
      <td>${escapeHtml(project.deadline)}</td>
      <td>
        <div class="row-actions">
          <button class="secondary" onclick="openProjectModal('${project.id}')">编辑</button>
          <button class="danger" onclick="deleteProject('${project.id}')">删除</button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6">暂无数据</td></tr>`;
}

function renderRecentProjects() {
  const list = state.projects
    .filter(project => matchKeyword(project.name, project.owner, project.status, project.deadline))
    .slice()
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  $("#recentProjects").innerHTML = list.map(project => `
    <div class="activity-item">
      <div>
        <strong>${escapeHtml(project.name)}</strong>
        <br />
        <span>负责人：${escapeHtml(project.owner)}</span>
      </div>
      <div>${renderProjectStatus(project.status)}</div>
    </div>
  `).join("") || `<p class="hint">暂无项目，可在“系统设置”里初始化演示数据。</p>`;
}

function renderUserStatus(status) {
  const map = {
    active: `<span class="badge active">启用</span>`,
    pause: `<span class="badge pause">停用</span>`
  };
  return map[status] || `<span class="badge pause">未知</span>`;
}

function renderProjectStatus(status) {
  const cls = status === "已完成" ? "done" : status === "进行中" ? "active" : "pending";
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function openUserModal(id = null) {
  const user = id ? state.appUsers.find(item => item.id === id) : null;
  editing = { type: "user", id };

  $("#modalTitle").textContent = id ? "编辑用户" : "新增用户";
  $("#modalFields").innerHTML = `
    <label>姓名 <input name="name" value="${escapeAttr(user?.name || "")}" required /></label>
    <label>角色 <input name="role" value="${escapeAttr(user?.role || "")}" required /></label>
    <label>邮箱 <input name="email" type="email" value="${escapeAttr(user?.email || "")}" required /></label>
    <label>状态
      <select name="status">
        <option value="active" ${user?.status === "active" ? "selected" : ""}>启用</option>
        <option value="pause" ${user?.status === "pause" ? "selected" : ""}>停用</option>
      </select>
    </label>
  `;
  $("#modal").showModal();
}

function openProjectModal(id = null) {
  const project = id ? state.projects.find(item => item.id === id) : null;
  editing = { type: "project", id };

  $("#modalTitle").textContent = id ? "编辑项目" : "新增项目";
  $("#modalFields").innerHTML = `
    <label>项目名称 <input name="name" value="${escapeAttr(project?.name || "")}" required /></label>
    <label>负责人 <input name="owner" value="${escapeAttr(project?.owner || "")}" required /></label>
    <label>状态
      <select name="status">
        <option value="待开始" ${project?.status === "待开始" ? "selected" : ""}>待开始</option>
        <option value="进行中" ${project?.status === "进行中" ? "selected" : ""}>进行中</option>
        <option value="已完成" ${project?.status === "已完成" ? "selected" : ""}>已完成</option>
      </select>
    </label>
    <label>预算 <input name="budget" type="number" min="0" value="${escapeAttr(project?.budget || 0)}" required /></label>
    <label>截止日期 <input name="deadline" type="date" value="${escapeAttr(project?.deadline || "")}" required /></label>
  `;
  $("#modal").showModal();
}

async function saveModal(event) {
  event.preventDefault();
  if (!client || !session) return;

  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  let result;
  if (editing.type === "user") {
    if (editing.id) {
      result = await client.from("app_users").update(data).eq("id", editing.id).select().single();
    } else {
      result = await client.from("app_users").insert(data).select().single();
    }
  }

  if (editing.type === "project") {
    const payload = { ...data, budget: Number(data.budget) };
    if (editing.id) {
      result = await client.from("projects").update(payload).eq("id", editing.id).select().single();
    } else {
      result = await client.from("projects").insert(payload).select().single();
    }
  }

  if (result?.error) {
    showToast("保存失败：" + result.error.message);
    return;
  }

  $("#modal").close();
  await loadCloudData();
  showToast("保存成功");
}

async function deleteUser(id) {
  if (!confirm("确定删除该用户吗？")) return;
  const { error } = await client.from("app_users").delete().eq("id", id);
  if (error) return showToast("删除失败：" + error.message);
  await loadCloudData();
}

async function deleteProject(id) {
  if (!confirm("确定删除该项目吗？")) return;
  const { error } = await client.from("projects").delete().eq("id", id);
  if (error) return showToast("删除失败：" + error.message);
  await loadCloudData();
}

function exportData() {
  const data = {
    app_users: state.appUsers,
    projects: state.projects
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `supabase-management-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const imported = JSON.parse(reader.result);
      const users = imported.app_users || imported.users || [];
      const projects = imported.projects || [];

      if (!Array.isArray(users) || !Array.isArray(projects)) {
        throw new Error("格式错误");
      }

      if (!confirm("导入会清空当前云端数据并写入 JSON 文件中的数据，确定继续吗？")) return;

      await deleteAllRows();
      const cleanUsers = users.map(({ id, created_at, ...item }) => item);
      const cleanProjects = projects.map(({ id, created_at, ...item }) => ({ ...item, budget: Number(item.budget || 0) }));

      if (cleanUsers.length > 0) {
        const { error } = await client.from("app_users").insert(cleanUsers);
        if (error) throw error;
      }

      if (cleanProjects.length > 0) {
        const { error } = await client.from("projects").insert(cleanProjects);
        if (error) throw error;
      }

      await loadCloudData();
      showToast("导入成功");
    } catch (error) {
      showToast("导入失败：" + error.message);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

async function seedData() {
  if (!confirm("这会清空当前云端数据并写入演示数据，确定继续吗？")) return;
  try {
    await deleteAllRows();
    const usersResult = await client.from("app_users").insert(sampleAppUsers);
    if (usersResult.error) throw usersResult.error;

    const projectsResult = await client.from("projects").insert(sampleProjects);
    if (projectsResult.error) throw projectsResult.error;

    await loadCloudData();
    $("#settingsMessage").textContent = "演示数据已初始化。";
  } catch (error) {
    $("#settingsMessage").textContent = "初始化失败：" + error.message;
  }
}

async function clearCloudData() {
  if (!confirm("确定清空 Supabase 中的用户和项目数据吗？此操作不可恢复。")) return;
  try {
    await deleteAllRows();
    await loadCloudData();
    $("#settingsMessage").textContent = "云端数据已清空。";
  } catch (error) {
    $("#settingsMessage").textContent = "清空失败：" + error.message;
  }
}

async function deleteAllRows() {
  const impossibleId = "00000000-0000-0000-0000-000000000000";
  const projectDelete = await client.from("projects").delete().neq("id", impossibleId);
  if (projectDelete.error) throw projectDelete.error;

  const userDelete = await client.from("app_users").delete().neq("id", impossibleId);
  if (userDelete.error) throw userDelete.error;
}

function drawStatusChart() {
  const canvas = $("#statusChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(rect.width, 320) * dpr;
  canvas.height = 220 * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, 220);

  const counts = ["待开始", "进行中", "已完成"].map(status => ({
    label: status,
    value: state.projects.filter(p => p.status === status).length
  }));

  const max = Math.max(...counts.map(item => item.value), 1);
  const width = Math.max(rect.width, 320);
  const barWidth = Math.max((width - 80) / counts.length - 18, 40);

  counts.forEach((item, index) => {
    const x = 40 + index * (barWidth + 18);
    const barHeight = (item.value / max) * 125;
    const y = 160 - barHeight;

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--primary").trim();
    roundRect(ctx, x, y, barWidth, Math.max(barHeight, 4), 10);
    ctx.fill();

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text").trim();
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(item.value, x + barWidth / 2 - 5, y - 10);

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted").trim();
    ctx.font = "14px sans-serif";
    ctx.fillText(item.label, x + barWidth / 2 - 20, 190);
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function formatMoney(num) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(Number(num || 0));
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

let toastTimer = null;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

window.addEventListener("resize", drawStatusChart);
window.openUserModal = openUserModal;
window.openProjectModal = openProjectModal;
window.deleteUser = deleteUser;
window.deleteProject = deleteProject;

init();
