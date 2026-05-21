import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
window.XLSX = XLSX;

// ── Persistent Storage ──────────────────────────────────
const STORAGE_KEY    = "hr_timetrack_data";
const AUTH_KEY       = "hr_timetrack_session";
const DATA_VERSION   = "v3";  // bump this to force a fresh seed

function LoadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // If stored data uses old lowercase IDs (r1, r2...) force reset
    if (parsed._version !== DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return parsed;
  } catch (_) {}
  return null;
}
function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _version: DATA_VERSION })); } catch (_) {}
}
function loadSession() {
  try { const r = localStorage.getItem(AUTH_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return null;
}
function saveSession(s) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(s)); } catch (_) {}
}
function clearSession() {
  try { localStorage.removeItem(AUTH_KEY); } catch (_) {}
}

// ── Seed Data ─────────────────────────────────────────
// password = resourceId (uppercase) on first login, mustChangePassword = true
const SEED = {
  resources: [
    { id: "R1001", name: "Sridhar Atyam",  role: "Senior HR Manager",      managerId: null,    isManager: true,  isHR: true,  email: "sridhar@company.com", password: "R1001", mustChangePassword: false },
    { id: "R1002", name: "Priya Nair",      role: "HR Business Partner",    managerId: "R1001", isManager: false, isHR: false, email: "priya@company.com",   password: "R1002", mustChangePassword: true },
    { id: "R1003", name: "Arjun Mehta",     role: "Talent Acquisition Lead",managerId: "R1001", isManager: true,  isHR: false, email: "arjun@company.com",   password: "R1003", mustChangePassword: true },
    { id: "R1004", name: "Kavitha Rao",     role: "HR Operations Analyst",  managerId: "R1003", isManager: false, isHR: false, email: "kavitha@company.com", password: "R1004", mustChangePassword: true },
    { id: "R1005", name: "Rajan Suresh",    role: "L&D Specialist",         managerId: "R1003", isManager: false, isHR: false, email: "rajan@company.com",   password: "R1005", mustChangePassword: true },
  ],
  projects: [
    { id: "p1", name: "HRMS Digitization Initiative",  category: "Technology",        status: "Active", startDate: "2024-01-01", endDate: "2024-12-31" },
    { id: "p2", name: "TA Process Implementation",     category: "Talent Acquisition",status: "Active", startDate: "2024-03-01", endDate: "2024-09-30" },
    { id: "p3", name: "360° Performance Management",   category: "Performance",       status: "Active", startDate: "2024-04-01", endDate: "2024-10-31" },
    { id: "p4", name: "Employee Engagement Program",   category: "Engagement",        status: "Active", startDate: "2024-01-01", endDate: "2024-12-31" },
    { id: "p5", name: "L&D Framework Rollout",         category: "Learning",          status: "Active", startDate: "2024-06-01", endDate: "2025-03-31" },
  ],
  timeLogs: [
    { id: "t1",  resourceId: "R1002", projectId: "p1", date: "2024-12-02", hours: 3, description: "Requirements gathering with IT team",       status: "Approved", approverId: "R1001" },
    { id: "t2",  resourceId: "R1002", projectId: "p3", date: "2024-12-02", hours: 2, description: "Designed appraisal forms",                  status: "Approved", approverId: "R1001" },
    { id: "t3",  resourceId: "R1003", projectId: "p2", date: "2024-12-02", hours: 4, description: "Campus drive coordination",                 status: "Pending",  approverId: null },
    { id: "t4",  resourceId: "R1004", projectId: "p1", date: "2024-12-03", hours: 5, description: "Data migration testing",                    status: "Pending",  approverId: null },
    { id: "t5",  resourceId: "R1005", projectId: "p5", date: "2024-12-03", hours: 3, description: "LMS content development",                   status: "Approved", approverId: "R1001" },
    { id: "t6",  resourceId: "R1002", projectId: "p4", date: "2024-12-03", hours: 2, description: "Engagement survey design",                  status: "Approved", approverId: "R1001" },
    { id: "t7",  resourceId: "R1003", projectId: "p2", date: "2024-12-04", hours: 6, description: "Interview scheduling and coordination",     status: "Approved", approverId: "R1001" },
    { id: "t8",  resourceId: "R1004", projectId: "p1", date: "2024-12-04", hours: 4, description: "HRMS configuration and testing",            status: "Pending",  approverId: null },
    { id: "t9",  resourceId: "R1005", projectId: "p5", date: "2024-12-05", hours: 5, description: "Training calendar preparation",             status: "Approved", approverId: "R1001" },
    { id: "t10", resourceId: "R1002", projectId: "p3", date: "2024-12-05", hours: 3, description: "360 feedback questionnaire design",         status: "Approved", approverId: "R1001" },
  ],
  tasks: [
    // Tasks assigned by managers to employees: { id, assignedTo, assignedBy, projectId, title, dueDate, status }
    { id: "tk1", assignedTo: "R1002", assignedBy: "R1001", projectId: "p1", title: "Complete HRMS UAT checklist", dueDate: "2024-12-20", status: "Open" },
    { id: "tk2", assignedTo: "R1004", assignedBy: "R1003", projectId: "p1", title: "Prepare data migration report", dueDate: "2024-12-18", status: "Open" },
  ],
  passwordResets: [], // { id, resourceId, tempPassword, createdAt, used }
};

// ── Utils ──────────────────────────────────────────────
function uid() { return "x" + Math.random().toString(36).slice(2, 9); }

function fmt(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function isoWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}
function isoMonth(dateStr)    { return dateStr ? dateStr.slice(0, 7) : ""; }
function isoQuarter(dateStr)  {
  if (!dateStr) return "";
  const m = parseInt(dateStr.slice(5, 7));
  return `${dateStr.slice(0,4)}-Q${Math.ceil(m/3)}`;
}
function isoYear(dateStr)     { return dateStr ? dateStr.slice(0, 4) : ""; }

function genTempPassword() {
  return "TMP" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ══════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════
function LoginScreen({ data, onLogin, showToast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  function handleLogin() {
    setError("");
    const uname = username.trim();
    const pwd   = password.trim();
    if (!uname || !pwd) { setError("Please enter your Employee ID and password."); return; }
    // Case-insensitive ID match
    const user = data.resources.find(r => r.id.toUpperCase() === uname.toUpperCase());
    if (!user) { setError(`Employee ID "${uname}" not found. Check the ID and try again.`); return; }
    // Case-sensitive password check
    if (user.password !== pwd) {
      // Also try uppercase in case they typed lowercase employee ID as password
      if (user.password.toUpperCase() !== pwd.toUpperCase()) {
        setError("Incorrect password. Default password is your Employee ID (e.g. R1001)."); return;
      }
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(user);
    }, 500);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');`}</style>
      <div style={{ width: 420, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#EF6461,#D94F4C)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>⏱</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#F1F5F9" }}>HR TimeTrack</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Project Time Management System</div>
        </div>

        <div style={{ background: "#1A1D27", border: "1px solid #2A2D3E", borderRadius: 18, padding: "32px 30px" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#F1F5F9", marginBottom: 6 }}>Sign In</div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 24 }}>Use your Employee ID as username and password</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Employee ID</label>
            <input
              style={{ width: "100%", background: "#0F1117", border: "1px solid #2A2D3E", borderRadius: 8, padding: "10px 14px", color: "#E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border .2s" }}
              placeholder="e.g. R1002"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              onFocus={e => e.target.style.borderColor = "#EF6461"}
              onBlur={e => e.target.style.borderColor = "#2A2D3E"}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              style={{ width: "100%", background: "#0F1117", border: "1px solid #2A2D3E", borderRadius: 8, padding: "10px 14px", color: "#E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border .2s" }}
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              onFocus={e => e.target.style.borderColor = "#EF6461"}
              onBlur={e => e.target.style.borderColor = "#2A2D3E"}
            />
          </div>

          {error && <div style={{ background: "rgba(239,100,97,.1)", border: "1px solid rgba(239,100,97,.3)", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#EF6461", marginBottom: 16 }}>⚠ {error}</div>}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: "100%", background: "linear-gradient(135deg,#EF6461,#D94F4C)", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all .2s", opacity: loading ? .7 : 1 }}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          <div style={{ marginTop: 20, padding: "14px", background: "#0F1117", borderRadius: 8, border: "1px solid #2A2D3E" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
              Quick Login — Click to fill
            </div>
            {[
              { id: "R1001", label: "Sridhar Atyam", note: "HR Admin + Manager" },
              { id: "R1003", label: "Arjun Mehta",   note: "Manager only" },
              { id: "R1002", label: "Priya Nair",    note: "Employee" },
              { id: "R1004", label: "Kavitha Rao",   note: "Employee" },
            ].map(u => (
              <div
                key={u.id}
                onClick={() => { setUsername(u.id); setPassword(u.id); setError(""); }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 8px", cursor: "pointer", borderBottom: "1px solid #1E2130", borderRadius: 6, transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,100,97,.07)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div>
                  <span style={{ fontSize: 12, color: "#60A5FA", fontFamily: "monospace", fontWeight: 700 }}>{u.id}</span>
                  <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>{u.label}</span>
                </div>
                <span style={{ fontSize: 11, color: "#475569" }}>{u.note}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#334155", marginTop: 8, textAlign: "center" }}>
              Password = Employee ID for first login
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// CHANGE PASSWORD SCREEN (first login)
// ══════════════════════════════════════════════
function ChangePasswordScreen({ user, data, updateData, onDone, showToast }) {
  const [newPw, setNewPw]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");

  function save() {
    if (newPw.length < 6)            { setError("Password must be at least 6 characters."); return; }
    if (newPw === user.id)           { setError("New password cannot be the same as your Employee ID."); return; }
    if (newPw !== confirm)           { setError("Passwords do not match."); return; }
    updateData(prev => ({
      ...prev,
      resources: prev.resources.map(r => r.id === user.id ? { ...r, password: newPw, mustChangePassword: false } : r)
    }));
    showToast("Password changed successfully!");
    onDone({ ...user, password: newPw, mustChangePassword: false });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width: 420, padding: "0 20px" }}>
        <div style={{ background: "#1A1D27", border: "1px solid #EF6461", borderRadius: 18, padding: "32px 30px" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#F1F5F9", marginBottom: 6 }}>Set New Password</div>
          <div style={{ fontSize: 13, color: "#FBBf24", marginBottom: 24 }}>Welcome, {user.name}! For security, please set a new password before continuing.</div>

          {["New Password", "Confirm Password"].map((label, i) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</label>
              <input
                type="password"
                style={{ width: "100%", background: "#0F1117", border: "1px solid #2A2D3E", borderRadius: 8, padding: "10px 14px", color: "#E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                value={i === 0 ? newPw : confirm}
                onChange={e => i === 0 ? setNewPw(e.target.value) : setConfirm(e.target.value)}
                placeholder={i === 0 ? "Min. 6 characters" : "Re-enter new password"}
              />
            </div>
          ))}

          {error && <div style={{ background: "rgba(239,100,97,.1)", border: "1px solid rgba(239,100,97,.3)", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#EF6461", marginBottom: 16 }}>⚠ {error}</div>}

          <button onClick={save} style={{ width: "100%", background: "linear-gradient(135deg,#EF6461,#D94F4C)", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Set Password & Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════
export default function App() {
  const [data, setData]           = useState(() => loadData() || SEED);
  const [session, setSession]     = useState(() => loadSession());  // { userId }
  const [activeSection, setActiveSection] = useState("dashboard");
  const [toast, setToast]         = useState(null);

  useEffect(() => { saveData(data); }, [data]);
  useEffect(() => { if (session) saveSession(session); }, [session]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }
  function updateData(updater) { setData(prev => updater(prev)); }

  // ── Resolve current user from session ───────
  const currentUser = session ? data.resources.find(r => r.id === session.userId) : null;

  // ── Login ────────────────────────────────────
  function handleLogin(user) {
    setSession({ userId: user.id });
    setActiveSection("dashboard");
  }

  // ── Logout ───────────────────────────────────
  function handleLogout() {
    clearSession();
    setSession(null);
    setActiveSection("dashboard");
  }

  // ── Not logged in ────────────────────────────
  if (!currentUser) {
    return <LoginScreen data={data} onLogin={handleLogin} showToast={showToast} />;
  }

  // ── First-login password change ──────────────
  if (currentUser.mustChangePassword) {
    return (
      <ChangePasswordScreen
        user={currentUser} data={data} updateData={updateData} showToast={showToast}
        onDone={updatedUser => setSession({ userId: updatedUser.id })}
      />
    );
  }

  // ── Determine accessible roles ───────────────
  // isHR → can access HR Admin + Reports
  // isManager → can access Manager tabs
  // everyone → Employee tabs
  const isHR      = currentUser.isHR;
  const isManager = currentUser.isManager;

  const navGroups = [
    ...(isHR ? [{
      groupLabel: "HR Admin",
      items: [
        { id: "dashboard",  label: "Dashboard",      icon: "🏠" },
        { id: "resources",  label: "Resources",      icon: "👥" },
        { id: "projects",   label: "Projects",       icon: "📁" },
        { id: "excel",      label: "Import / Export",icon: "📥" },
        { id: "pwd-mgmt",   label: "Password Mgmt",  icon: "🔑" },
      ]
    }] : []),
    {
      groupLabel: "My Work",
      items: [
        { id: "emp-dashboard", label: "My Dashboard",  icon: "🏠" },
        { id: "log-hours",     label: "Log Hours",     icon: "⏱️" },
        { id: "my-logs",       label: "My Timesheets", icon: "📋" },
        { id: "my-tasks",      label: "My Tasks",      icon: "✅" },
      ]
    },
    ...(isManager ? [{
      groupLabel: "Manager",
      items: [
        { id: "approvals",  label: "Approvals",     icon: "✅" },
        { id: "team-view",  label: "Team Overview", icon: "📈" },
        { id: "assign-task",label: "Assign Tasks",  icon: "📝" },
      ]
    }] : []),
    ...(isHR || isManager ? [{
      groupLabel: "Reports",
      items: [
        { id: "report-employee", label: "Employee Report", icon: "👤" },
        { id: "report-project",  label: "Project Report",  icon: "📁" },
      ]
    }] : []),
  ];

  // Pending count for manager badge
  const teamIds = data.resources.filter(r => r.managerId === currentUser.id).map(r => r.id);
  const pendingCount = data.timeLogs.filter(t => teamIds.includes(t.resourceId) && t.status === "Pending").length;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#0F1117", minHeight: "100vh", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: #1A1D27; } ::-webkit-scrollbar-thumb { background: #EF6461; border-radius: 10px; }
        input, select, textarea { font-family: inherit; }
        button { cursor: pointer; font-family: inherit; }
        .card { background: #1A1D27; border: 1px solid #2A2D3E; border-radius: 14px; }
        .btn-coral { background: linear-gradient(135deg,#EF6461,#D94F4C); color:#fff; border:none; border-radius:8px; padding:9px 20px; font-size:14px; font-weight:600; transition:all .2s; }
        .btn-coral:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(239,100,97,.35); }
        .btn-ghost { background:transparent; color:#94A3B8; border:1px solid #2A2D3E; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:500; transition:all .2s; }
        .btn-ghost:hover { border-color:#EF6461; color:#EF6461; }
        .inp { background:#0F1117; border:1px solid #2A2D3E; border-radius:8px; padding:9px 13px; color:#E2E8F0; font-size:14px; width:100%; transition:border .2s; outline:none; }
        .inp:focus { border-color:#EF6461; }
        .tag { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
        .tag-pending  { background:rgba(251,191,36,.12);  color:#FBBf24; }
        .tag-approved { background:rgba(52,211,153,.12);  color:#34D399; }
        .tag-rejected { background:rgba(239,100,97,.12);  color:#EF6461; }
        .tag-active   { background:rgba(96,165,250,.12);  color:#60A5FA; }
        .tag-open     { background:rgba(167,139,250,.12); color:#A78BFA; }
        .tag-done     { background:rgba(52,211,153,.12);  color:#34D399; }
        .nav-item { padding:9px 12px; border-radius:9px; cursor:pointer; font-size:13px; font-weight:500; color:#64748B; display:flex; align-items:center; gap:9px; transition:all .18s; border:1px solid transparent; }
        .nav-item:hover { background:#1A1D27; color:#CBD5E1; }
        .nav-item.active { background:linear-gradient(135deg,rgba(239,100,97,.18),rgba(217,79,76,.08)); color:#EF6461; border-color:rgba(239,100,97,.2); }
        table { width:100%; border-collapse:collapse; }
        th { text-align:left; padding:11px 14px; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.08em; border-bottom:1px solid #2A2D3E; }
        td { padding:12px 14px; font-size:13.5px; color:#CBD5E1; border-bottom:1px solid #1E2130; }
        tr:last-child td { border-bottom:none; }
        tr:hover td { background:rgba(239,100,97,.03); }
        .stat-card { background:linear-gradient(135deg,#1A1D27,#141720); border:1px solid #2A2D3E; border-radius:14px; padding:20px 22px; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(6px); z-index:100; display:flex; align-items:center; justify-content:center; }
        .modal { background:#1A1D27; border:1px solid #2A2D3E; border-radius:18px; padding:28px; width:480px; max-width:95vw; max-height:90vh; overflow-y:auto; }
        .form-group { margin-bottom:16px; }
        .form-label { display:block; font-size:12px; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
        .section-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:700; color:#F1F5F9; }
        .divider { height:1px; background:#2A2D3E; margin:20px 0; }
        .nav-group-label { font-size:10px; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:.1em; padding:10px 8px 4px; margin-top:8px; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:22, right:22, zIndex:200, background:toast.type==="success"?"#1A3A2A":"#3A1A1A", border:`1px solid ${toast.type==="success"?"#34D399":"#EF6461"}`, borderRadius:10, padding:"12px 20px", fontSize:13, color:toast.type==="success"?"#34D399":"#EF6461", fontWeight:600, boxShadow:"0 8px 32px rgba(0,0,0,.4)" }}>
          {toast.type === "success" ? "✓ " : "✗ "}{toast.msg}
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ background:"#141720", borderBottom:"1px solid #2A2D3E", padding:"13px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:32, height:32, background:"linear-gradient(135deg,#EF6461,#D94F4C)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>⏱</div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"#F1F5F9", lineHeight:1 }}>HR TimeTrack</div>
            <div style={{ fontSize:10, color:"#475569", letterSpacing:".06em", textTransform:"uppercase" }}>Project Time Management</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(currentUser.name)})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff" }}>
              {currentUser.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#F1F5F9" }}>{currentUser.name}</div>
              <div style={{ fontSize:10, color:"#475569" }}>
                {currentUser.id}
                {currentUser.isHR && " · HR Admin"}
                {currentUser.isManager && " · Manager"}
              </div>
            </div>
          </div>
          {pendingCount > 0 && isManager && (
            <div style={{ background:"rgba(251,191,36,.15)", border:"1px solid rgba(251,191,36,.3)", borderRadius:8, padding:"5px 12px", fontSize:12, color:"#FBBf24", fontWeight:600 }}>
              ⏳ {pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}
            </div>
          )}
          <button className="btn-ghost" style={{ fontSize:12, padding:"6px 14px" }} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      {/* LAYOUT */}
      <div style={{ display:"flex", minHeight:"calc(100vh - 60px)" }}>
        {/* SIDEBAR */}
        <div style={{ width:210, background:"#141720", borderRight:"1px solid #2A2D3E", padding:"12px 10px", flexShrink:0, overflowY:"auto" }}>
          {navGroups.map(group => (
            <div key={group.groupLabel}>
              <div className="nav-group-label">{group.groupLabel}</div>
              {group.items.map(item => (
                <div key={item.id}
                  className={`nav-item${activeSection === item.id ? " active" : ""}`}
                  onClick={() => setActiveSection(item.id)}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === "approvals" && pendingCount > 0 && (
                    <span style={{ marginLeft:"auto", background:"#EF6461", color:"#fff", borderRadius:20, padding:"1px 6px", fontSize:10 }}>{pendingCount}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* MAIN */}
        <div style={{ flex:1, padding:"26px 30px", overflowY:"auto" }}>
          {/* HR Admin sections */}
          {isHR && activeSection === "dashboard"    && <HRDashboard data={data} />}
          {isHR && activeSection === "resources"    && <ResourcesPanel data={data} updateData={updateData} showToast={showToast} />}
          {isHR && activeSection === "projects"     && <ProjectsPanel data={data} updateData={updateData} showToast={showToast} />}
          {isHR && activeSection === "excel"        && <ExcelPanel data={data} updateData={updateData} showToast={showToast} />}
          {isHR && activeSection === "pwd-mgmt"     && <PasswordMgmt data={data} updateData={updateData} showToast={showToast} />}

          {/* Employee sections */}
          {activeSection === "emp-dashboard" && <EmployeeDashboard data={data} currentUser={currentUser} />}
          {activeSection === "log-hours"     && <LogHours data={data} updateData={updateData} showToast={showToast} currentUser={currentUser} />}
          {activeSection === "my-logs"       && <MyLogs data={data} currentUser={currentUser} />}
          {activeSection === "my-tasks"      && <MyTasks data={data} updateData={updateData} showToast={showToast} currentUser={currentUser} />}

          {/* Manager sections (only if isManager) */}
          {isManager && activeSection === "approvals"   && <Approvals data={data} updateData={updateData} showToast={showToast} currentUser={currentUser} />}
          {isManager && activeSection === "team-view"   && <TeamView data={data} currentUser={currentUser} />}
          {isManager && activeSection === "assign-task" && <AssignTask data={data} updateData={updateData} showToast={showToast} currentUser={currentUser} />}

          {/* Reports */}
          {(isHR || isManager) && activeSection === "report-employee" && <EmployeeReport data={data} currentUser={currentUser} isHR={isHR} />}
          {(isHR || isManager) && activeSection === "report-project"  && <ProjectReport data={data} />}

          {/* Default fallback */}
          {!["dashboard","resources","projects","excel","pwd-mgmt","emp-dashboard","log-hours","my-logs","my-tasks","approvals","team-view","assign-task","report-employee","report-project"].includes(activeSection) && (
            <div style={{ textAlign:"center", padding:"60px 20px", color:"#334155" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
              <div style={{ fontSize:15, fontWeight:600 }}>Access restricted</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// HR VIEW COMPONENTS
// ══════════════════════════════════════════════
function HRDashboard({ data }) {
  const totalHours = data.timeLogs.reduce((s, t) => s + t.hours, 0);
  const pending = data.timeLogs.filter(t => t.status === "Pending").length;
  const approved = data.timeLogs.filter(t => t.status === "Approved").length;
  const activeProjects = data.projects.filter(p => p.status === "Active").length;

  const projectHours = data.projects.map(p => ({
    ...p,
    hours: data.timeLogs.filter(t => t.projectId === p.id).reduce((s, t) => s + t.hours, 0),
    members: [...new Set(data.timeLogs.filter(t => t.projectId === p.id).map(t => t.resourceId))].length,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="section-title">HR Dashboard</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Overview of all HR projects and team time</div>
        </div>
        <button className="btn-coral" onClick={() => {
          const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
          // Summary sheet
          const summHeaders = ["Project","Category","Status","Start Date","End Date","Total Hours","Team Members","Approved Hours","Pending Hours"];
          const summRows = projectHours.map(p => {
            const logs = data.timeLogs.filter(t => t.projectId === p.id);
            const approved = logs.filter(t => t.status === "Approved").reduce((s,t) => s+t.hours, 0);
            return [p.name, p.category, p.status, p.startDate, p.endDate, p.hours, p.members, approved, p.hours - approved];
          });
          const ws1 = makeSheet(summHeaders, summRows); ws1["!cols"] = [{wch:32},{wch:18},{wch:10},{wch:12},{wch:12},{wch:12},{wch:14},{wch:16},{wch:14}];
          XLSX.utils.book_append_sheet(wb, ws1, "Project Summary");
          // Resources sheet
          const resHeaders = ["Employee ID","Name","Role","Manager","Email","Type"];
          const resRows = data.resources.map(r => [r.id, r.name, r.role, data.resources.find(x=>x.id===r.managerId)?.name||"—", r.email, r.isManager?"Manager":"Employee"]);
          XLSX.utils.book_append_sheet(wb, makeSheet(resHeaders, resRows), "Resources");
          // All logs
          const logHeaders = ["Employee","Project","Date","Hours","Status","Approved By"];
          const logRows = data.timeLogs.map(t => [data.resources.find(r=>r.id===t.resourceId)?.name||"", data.projects.find(p=>p.id===t.projectId)?.name||"", t.date, t.hours, t.status, t.approverId ? data.resources.find(r=>r.id===t.approverId)?.name||"" : ""]);
          XLSX.utils.book_append_sheet(wb, makeSheet(logHeaders, logRows), "All Time Logs");
          XLSX.writeFile(wb, `HR_Dashboard_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
        }}>⬇ Download Dashboard Report</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Resources", value: data.resources.length, icon: "👥", color: "#60A5FA" },
          { label: "Active Projects", value: activeProjects, icon: "📁", color: "#34D399" },
          { label: "Total Hours Logged", value: totalHours + "h", icon: "⏱️", color: "#EF6461" },
          { label: "Pending Approvals", value: pending, icon: "⏳", color: "#FBBf24" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#94A3B8", marginBottom: 16, textTransform: "uppercase", letterSpacing: ".06em" }}>Project Summary</div>
        <table>
          <thead><tr><th>Project</th><th>Category</th><th>Status</th><th>Total Hours</th><th>Team Members</th></tr></thead>
          <tbody>
            {projectHours.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600, color: "#F1F5F9" }}>{p.name}</td>
                <td><span style={{ fontSize: 12, color: "#94A3B8" }}>{p.category}</span></td>
                <td><span className="tag tag-active">{p.status}</span></td>
                <td style={{ color: "#EF6461", fontWeight: 700 }}>{p.hours}h</td>
                <td>{p.members}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResourcesPanel({ data, updateData, showToast }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", managerId: "", email: "", isManager: false });
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);

  function save() {
    if (!form.name || !form.role) return showToast("Name and role are required", "error");
    const newR = { id: uid(), ...form };
    updateData(prev => ({ ...prev, resources: [...prev.resources, newR] }));
    setShowModal(false);
    setForm({ name: "", role: "", managerId: "", email: "", isManager: false });
    showToast("Resource added successfully");
  }

  function remove(id) {
    updateData(prev => ({ ...prev, resources: prev.resources.filter(r => r.id !== id) }));
    showToast("Resource removed");
  }

  // ── Download template ─────────────────────
  function downloadTemplate() {
    const XLSX = window.XLSX;
    const ws = XLSX.utils.aoa_to_sheet([
      ["name", "role", "email", "is_manager", "manager_name"],
      ["Priya Nair", "HR Business Partner", "priya@company.com", "No", "Sridhar Atyam"],
      ["Arjun Mehta", "Talent Acquisition Lead", "arjun@company.com", "No", "Sridhar Atyam"],
      ["Kavitha Rao", "HR Operations Analyst", "kavitha@company.com", "No", "Sridhar Atyam"],
      ["Sridhar Atyam", "Senior HR Manager", "sridhar@company.com", "Yes", ""],
    ]);
    ws["!cols"] = [{ wch: 22 }, { wch: 26 }, { wch: 28 }, { wch: 12 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resources Template");
    XLSX.writeFile(wb, "resources_template.xlsx");
    showToast("Template downloaded");
  }

  // ── Export current resources ───────────────
  function exportResources() {
    const XLSX = window.XLSX;
    const headers = ["name", "role", "email", "is_manager", "manager_name"];
    const rows = data.resources.map(r => [
      r.name, r.role, r.email,
      r.isManager ? "Yes" : "No",
      data.resources.find(x => x.id === r.managerId)?.name || ""
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 22 }, { wch: 26 }, { wch: 28 }, { wch: 12 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HR Resources");
    XLSX.writeFile(wb, `hr_resources_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Resources exported");
  }

  // ── Handle uploaded file ───────────────────
  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) return showToast("Please upload .csv, .xlsx or .xls", "error");

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const XLSX = window.XLSX;
        let rows;
        if (ext === "csv") {
          // CSV path
          const text = e.target.result;
          const lines = text.trim().split(/\r?\n/);
          const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
          rows = lines.slice(1).map(line => {
            const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
            const obj = {};
            headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
            return obj;
          });
        } else {
          // XLSX/XLS path
          const wb = XLSX.read(e.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
          rows = raw.map(r => {
            const obj = {};
            Object.keys(r).forEach(k => { obj[k.toLowerCase().replace(/\s+/g, "_")] = String(r[k]); });
            return obj;
          });
        }
        if (!rows.length) return showToast("No data found in file", "error");
        setPreview({ rows, fileName: file.name });
      } catch (err) {
        showToast("Failed to parse file — please use the template", "error");
      }
    };
    ext === "csv" ? reader.readAsText(file) : reader.readAsBinaryString(file);
  }

  function confirmImport() {
    if (!preview) return;
    const imported = preview.rows.map(row => {
      if (!row.name) return null;
      const existing = data.resources.find(r => r.name.toLowerCase() === row.name.toLowerCase());
      const mgr = data.resources.find(r => r.name.toLowerCase() === (row.manager_name || "").toLowerCase());
      return {
        id: existing?.id || uid(),
        name: row.name,
        role: row.role || "",
        email: row.email || "",
        isManager: (row.is_manager || "").toLowerCase() === "yes",
        managerId: mgr?.id || null,
      };
    }).filter(Boolean);

    updateData(prev => {
      const merged = [...prev.resources];
      imported.forEach(nr => {
        const idx = merged.findIndex(r => r.id === nr.id);
        if (idx >= 0) merged[idx] = nr; else merged.push(nr);
      });
      return { ...prev, resources: merged };
    });
    showToast(`${imported.length} resources imported successfully`);
    setPreview(null);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="section-title">HR Resources</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{data.resources.length} team members</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={exportResources} style={{ fontSize: 13 }}>⬇ Export</button>
          <button className="btn-ghost" onClick={downloadTemplate} style={{ fontSize: 13 }}>📋 Template</button>
          <button className="btn-coral" onClick={() => setShowModal(true)}>+ Add Resource</button>
        </div>
      </div>

      {/* Excel Upload Zone */}
      <div
        className="card"
        style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}
      >
        <div style={{ background: "#141720", padding: "12px 20px", borderBottom: "1px solid #2A2D3E", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>📥</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em" }}>Bulk Upload via Excel / CSV</span>
          <button className="btn-ghost" onClick={downloadTemplate} style={{ marginLeft: "auto", fontSize: 11, padding: "5px 12px", color: "#60A5FA", borderColor: "rgba(96,165,250,.3)" }}>
            ↓ Download Template
          </button>
        </div>

        {!preview ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById("res-upload").click()}
            style={{ padding: "28px 24px", textAlign: "center", background: dragOver ? "rgba(239,100,97,.04)" : "transparent", borderBottom: dragOver ? "2px dashed #EF6461" : "2px dashed #2A2D3E", cursor: "pointer", transition: "all .2s" }}
          >
            <input id="res-upload" type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8" }}>
              Drop Excel / CSV here or <span style={{ color: "#EF6461" }}>click to browse</span>
            </div>
            <div style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>Columns required: name, role, email, is_manager, manager_name</div>
          </div>
        ) : (
          <div style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#34D399" }}>✓ </span>
                <span style={{ fontSize: 13, color: "#CBD5E1" }}>{preview.fileName}</span>
                <span style={{ fontSize: 12, color: "#475569", marginLeft: 10 }}>{preview.rows.length} rows detected</span>
              </div>
              <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => setPreview(null)}>✕ Clear</button>
            </div>

            {/* Preview table */}
            <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #2A2D3E", borderRadius: 8, marginBottom: 14 }}>
              <table>
                <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Is Manager</th><th>Manager Name</th></tr></thead>
                <tbody>
                  {preview.rows.slice(0, 8).map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500, color: "#F1F5F9", fontSize: 12 }}>{row.name || <span style={{ color: "#EF6461" }}>⚠ Missing</span>}</td>
                      <td style={{ fontSize: 12 }}>{row.role}</td>
                      <td style={{ fontSize: 11, color: "#64748B" }}>{row.email}</td>
                      <td style={{ fontSize: 12 }}><span className={`tag ${(row.is_manager||"").toLowerCase() === "yes" ? "tag-active" : "tag-approved"}`}>{(row.is_manager||"").toLowerCase() === "yes" ? "Manager" : "Employee"}</span></td>
                      <td style={{ fontSize: 12, color: "#64748B" }}>{row.manager_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 8 && <div style={{ padding: "6px 14px", fontSize: 11, color: "#475569", borderTop: "1px solid #2A2D3E" }}>+{preview.rows.length - 8} more rows</div>}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
              <button className="btn-coral" onClick={confirmImport}>✓ Import {preview.rows.length} Resources</button>
            </div>
          </div>
        )}
      </div>

      {/* Resources Table */}
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Role</th><th>Manager</th><th>Email</th><th>Type</th><th>Action</th></tr></thead>
          <tbody>
            {data.resources.map((r, i) => (
              <tr key={r.id}>
                <td style={{ color: "#334155", fontSize: 12 }}>{i + 1}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${stringToColor(r.name)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{r.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                    <span style={{ fontWeight: 600, color: "#F1F5F9" }}>{r.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{r.role}</td>
                <td style={{ color: "#64748B", fontSize: 13 }}>{data.resources.find(x => x.id === r.managerId)?.name || "—"}</td>
                <td style={{ color: "#64748B", fontSize: 12 }}>{r.email}</td>
                <td><span className={`tag ${r.isManager ? "tag-active" : "tag-approved"}`}>{r.isManager ? "Manager" : "Employee"}</span></td>
                <td><button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px", color: "#EF6461", borderColor: "rgba(239,100,97,.3)" }} onClick={() => remove(r.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add manually modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: "#F1F5F9", marginBottom: 20 }}>Add New Resource</div>
            {["name", "role", "email"].map(f => (
              <div className="form-group" key={f}>
                <label className="form-label">{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                <input className="inp" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} placeholder={f === "email" ? "email@company.com" : ""} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Reporting Manager</label>
              <select className="inp" value={form.managerId} onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))}>
                <option value="">— None —</option>
                {data.resources.filter(r => r.isManager).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.isManager} onChange={e => setForm(p => ({ ...p, isManager: e.target.checked }))} />
                <span className="form-label" style={{ margin: 0 }}>Is a Manager</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-coral" onClick={save}>Save Resource</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectsPanel({ data, updateData, showToast }) {
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({ name: "", category: "", status: "Active", startDate: "", endDate: "", description: "", projectManager: "", budget: "" });
  const [dragOver, setDragOver]     = useState(false);
  const [preview, setPreview]       = useState(null);   // { rows, errors, fileName }
  const [showFormat, setShowFormat] = useState(false);

  const CATEGORIES = ["Technology","Talent Acquisition","Performance","Engagement","Learning","Operations","Compliance","HR Transformation","Automation"];
  const STATUSES   = ["Active","On Hold","Completed","Cancelled"];

  // ── Download template with format guide ──────
  function downloadTemplate() {
    const XLSX = window.XLSX;
    const wb   = XLSX.utils.book_new();

    // Sheet 1: Template (fill this)
    const templateData = [
      ["project_name *","category *","status","start_date *","end_date *","description","project_manager","budget"],
      ["HRMS Digitization Initiative","Technology","Active","2024-01-01","2024-12-31","End-to-end HRMS digitization for HR ops","Sridhar Atyam","50000"],
      ["TA Process Implementation","Talent Acquisition","Active","2024-03-01","2024-09-30","Structured TA process with JD and scorecard frameworks","Arjun Mehta","20000"],
      ["360° Performance Management","Performance","Active","2024-04-01","2024-10-31","Multi-rater appraisal system rollout","Sridhar Atyam","15000"],
      ["Employee Engagement Program","Engagement","Active","2024-01-01","2024-12-31","Retention, R&R and engagement initiatives","Priya Nair","10000"],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(templateData);
    ws1["!cols"] = [{wch:36},{wch:22},{wch:12},{wch:13},{wch:13},{wch:44},{wch:20},{wch:12}];

    // Style header row — coral background
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "EF6461" } } };
    const requiredStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "C0392B" } } };
    templateData[0].forEach((_, i) => {
      const cell = ws1[XLSX.utils.encode_cell({ r: 0, c: i })];
      if (cell) cell.s = i < 5 ? requiredStyle : headerStyle;
    });

    // Freeze top row
    ws1["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws1, "Projects Template");

    // Sheet 2: Format Guide
    const guide = [
      ["COLUMN", "REQUIRED", "FORMAT / VALID VALUES", "EXAMPLE"],
      ["project_name", "✅ Yes", "Any text (max 100 chars)", "HRMS Digitization Initiative"],
      ["category", "✅ Yes", CATEGORIES.join(" | "), "Technology"],
      ["status", "No (default: Active)", STATUSES.join(" | "), "Active"],
      ["start_date", "✅ Yes", "YYYY-MM-DD", "2024-01-15"],
      ["end_date", "✅ Yes", "YYYY-MM-DD (must be after start_date)", "2024-12-31"],
      ["description", "No", "Free text summary of the project", "End-to-end HRMS rollout..."],
      ["project_manager", "No", "Name of the project manager (for reference)", "Sridhar Atyam"],
      ["budget", "No", "Numeric value in INR or USD", "50000"],
      [],
      ["NOTES"],
      ["• Columns marked ✅ are mandatory — rows without them will be skipped"],
      ["• Dates must be in YYYY-MM-DD format (e.g. 2024-01-15)"],
      ["• If a project with the same name already exists, it will be updated"],
      ["• Category must exactly match one of the allowed values"],
      ["• Status defaults to 'Active' if left blank"],
      ["• Do not delete or rename the header row"],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(guide);
    ws2["!cols"] = [{wch:18},{wch:14},{wch:52},{wch:34}];
    guide[0].forEach((_, i) => {
      const cell = ws2[XLSX.utils.encode_cell({ r: 0, c: i })];
      if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2B2D42" } } };
    });
    XLSX.utils.book_append_sheet(wb, ws2, "Format Guide");

    // Sheet 3: Valid Categories reference
    const catData = [["Valid Categories","Valid Statuses"],...CATEGORIES.map((c,i)=>[c, STATUSES[i]||""])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catData), "Reference");

    XLSX.writeFile(wb, "Project_Upload_Template.xlsx");
    showToast("Template downloaded — see 'Format Guide' sheet for instructions");
  }

  // ── Export current projects ───────────────────
  function exportProjects() {
    const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
    const headers = ["project_name","category","status","start_date","end_date","description","project_manager","budget","total_hours","approved_hours","contributors"];
    const rows = data.projects.map(p => {
      const logs = data.timeLogs.filter(t => t.projectId === p.id);
      const total = logs.reduce((s,t)=>s+t.hours,0);
      const approved = logs.filter(t=>t.status==="Approved").reduce((s,t)=>s+t.hours,0);
      return [p.name, p.category, p.status, p.startDate, p.endDate, p.description||"", p.projectManager||"", p.budget||"", total, approved, [...new Set(logs.map(t=>t.resourceId))].length];
    });
    const ws = makeSheet(headers, rows);
    ws["!cols"] = [{wch:36},{wch:22},{wch:12},{wch:13},{wch:13},{wch:40},{wch:20},{wch:10},{wch:12},{wch:16},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, `HR_Projects_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Projects exported");
  }

  // ── Parse & validate uploaded file ───────────
  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv","xlsx","xls"].includes(ext)) return showToast("Please upload .csv, .xlsx or .xls", "error");

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const XLSX = window.XLSX;
        let rawRows;

        if (ext === "csv") {
          const lines = e.target.result.trim().split(/\r?\n/);
          const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase().replace(/\s+/g,"_"));
          rawRows = lines.slice(1).map(line => {
            const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g,""));
            const obj = {}; headers.forEach((h,i) => { obj[h] = vals[i]||""; }); return obj;
          });
        } else {
          const wb2 = XLSX.read(e.target.result, { type: "binary" });
          const ws  = wb2.Sheets[wb2.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
          rawRows = json.map(r => { const o={}; Object.keys(r).forEach(k=>{ o[k.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")] = String(r[k]||"").trim(); }); return o; });
        }

        if (!rawRows.length) return showToast("No data rows found in file", "error");

        // Validate each row
        const validated = rawRows.map((row, idx) => {
          const errors = [];
          const rowNum = idx + 2; // 1-based + header

          const name = row.project_name || row.name || row["project name"] || "";
          const cat  = row.category || "";
          const stat = row.status   || "Active";
          const sd   = row.start_date || row.startdate || row["start date"] || "";
          const ed   = row.end_date   || row.enddate   || row["end date"]   || "";
          const desc = row.description || "";
          const pm   = row.project_manager || row.projectmanager || row["project manager"] || "";
          const bud  = row.budget || "";

          if (!name)                                errors.push("project_name is required");
          if (!cat)                                 errors.push("category is required");
          else if (!CATEGORIES.includes(cat))       errors.push(`Invalid category "${cat}"`);
          if (!sd)                                  errors.push("start_date is required");
          else if (!/^\d{4}-\d{2}-\d{2}$/.test(sd)) errors.push("start_date must be YYYY-MM-DD");
          if (!ed)                                  errors.push("end_date is required");
          else if (!/^\d{4}-\d{2}-\d{2}$/.test(ed)) errors.push("end_date must be YYYY-MM-DD");
          else if (sd && ed && ed < sd)              errors.push("end_date must be after start_date");
          if (stat && !STATUSES.includes(stat))     errors.push(`Invalid status "${stat}"`);

          return { rowNum, name, category: cat, status: stat||"Active", startDate: sd, endDate: ed, description: desc, projectManager: pm, budget: bud, errors, valid: errors.length === 0 };
        }).filter(r => r.name); // skip completely empty rows

        setPreview({ rows: validated, fileName: file.name });
      } catch (err) {
        showToast("Failed to parse file — please use the template", "error");
      }
    };
    ext === "csv" ? reader.readAsText(file) : reader.readAsBinaryString(file);
  }

  // ── Confirm import ────────────────────────────
  function confirmImport() {
    const valid = preview.rows.filter(r => r.valid);
    if (!valid.length) return showToast("No valid rows to import", "error");

    updateData(prev => {
      const projects = [...prev.projects];
      valid.forEach(row => {
        const existing = projects.findIndex(p => p.name.toLowerCase() === row.name.toLowerCase());
        const entry = { id: existing >= 0 ? projects[existing].id : uid(), name: row.name, category: row.category, status: row.status, startDate: row.startDate, endDate: row.endDate, description: row.description, projectManager: row.projectManager, budget: row.budget };
        if (existing >= 0) projects[existing] = entry; else projects.push(entry);
      });
      return { ...prev, projects };
    });

    const skipped = preview.rows.length - valid.length;
    showToast(`${valid.length} project${valid.length!==1?"s":""} imported${skipped>0?` · ${skipped} skipped (errors)`:""}`);
    setPreview(null);
  }

  // ── Manual save ────────────────────────────────
  function save() {
    if (!form.name) return showToast("Project name is required", "error");
    if (!form.category) return showToast("Category is required", "error");
    if (!form.startDate || !form.endDate) return showToast("Start and end dates are required", "error");
    updateData(prev => ({ ...prev, projects: [...prev.projects, { id: uid(), ...form }] }));
    setShowModal(false);
    setForm({ name: "", category: "", status: "Active", startDate: "", endDate: "", description: "", projectManager: "", budget: "" });
    showToast("Project added");
  }

  const validCount  = preview ? preview.rows.filter(r=>r.valid).length : 0;
  const errorCount  = preview ? preview.rows.filter(r=>!r.valid).length : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div className="section-title">HR Projects</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>{data.projects.length} projects · Upload or add manually</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn-ghost" style={{ fontSize:12 }} onClick={exportProjects}>⬇ Export</button>
          <button className="btn-ghost" style={{ fontSize:12 }} onClick={downloadTemplate}>📋 Download Template</button>
          <button className="btn-coral" onClick={() => setShowModal(true)}>+ Add Project</button>
        </div>
      </div>

      {/* FORMAT GUIDE TOGGLE */}
      <div className="card" style={{ padding:"14px 20px", marginBottom:16, cursor:"pointer" }} onClick={() => setShowFormat(v=>!v)}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>📋</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#F1F5F9" }}>Excel Upload Format Guide</div>
              <div style={{ fontSize:12, color:"#475569" }}>8 columns · 3 required · dates in YYYY-MM-DD</div>
            </div>
          </div>
          <span style={{ color:"#64748B", fontSize:16 }}>{showFormat ? "▲" : "▼"}</span>
        </div>
        {showFormat && (
          <div style={{ marginTop:16 }} onClick={e=>e.stopPropagation()}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ minWidth:700 }}>
                <thead>
                  <tr>
                    {["Column","Required","Format / Valid Values","Example"].map(h=><th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["project_name","✅ Yes","Any text","HRMS Digitization Initiative"],
                    ["category","✅ Yes",CATEGORIES.join(", "),"Technology"],
                    ["status","No (default: Active)",STATUSES.join(", "),"Active"],
                    ["start_date","✅ Yes","YYYY-MM-DD","2024-01-15"],
                    ["end_date","✅ Yes","YYYY-MM-DD (after start_date)","2024-12-31"],
                    ["description","No","Free text summary","End-to-end HRMS rollout"],
                    ["project_manager","No","Name for reference","Sridhar Atyam"],
                    ["budget","No","Numeric value","50000"],
                  ].map(([col,req,fmt2,ex])=>(
                    <tr key={col}>
                      <td><code style={{ fontFamily:"monospace", fontSize:12, color:"#60A5FA" }}>{col}</code></td>
                      <td>{req === "✅ Yes" ? <span style={{ color:"#EF6461", fontWeight:700 }}>✅ Required</span> : <span style={{ color:"#475569" }}>Optional</span>}</td>
                      <td style={{ fontSize:12, color:"#94A3B8", maxWidth:260 }}>{fmt2}</td>
                      <td style={{ fontSize:12, color:"#64748B", fontStyle:"italic" }}>{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(96,165,250,.06)", border:"1px solid rgba(96,165,250,.2)", borderRadius:8, fontSize:12, color:"#60A5FA" }}>
              💡 Download the template above — it includes sample data, this format guide, and a reference sheet with all valid categories and statuses.
            </div>
          </div>
        )}
      </div>

      {/* EXCEL UPLOAD ZONE */}
      <div className="card" style={{ padding:0, overflow:"hidden", marginBottom:24 }}>
        <div style={{ background:"#141720", padding:"12px 20px", borderBottom:"1px solid #2A2D3E", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>📥</span>
          <span style={{ fontSize:13, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:".06em" }}>Bulk Upload Projects via Excel / CSV</span>
          <button className="btn-ghost" onClick={downloadTemplate} style={{ marginLeft:"auto", fontSize:11, padding:"5px 12px", color:"#60A5FA", borderColor:"rgba(96,165,250,.3)" }}>↓ Template</button>
        </div>

        {!preview ? (
          <div
            onDragOver={e=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}
            onClick={()=>document.getElementById("proj-upload").click()}
            style={{ padding:"36px 24px", textAlign:"center", background:dragOver?"rgba(239,100,97,.04)":"transparent", borderBottom:`2px dashed ${dragOver?"#EF6461":"#2A2D3E"}`, cursor:"pointer", transition:"all .2s" }}>
            <input id="proj-upload" type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
            <div style={{ fontSize:40, marginBottom:10 }}>📂</div>
            <div style={{ fontSize:14, fontWeight:600, color:"#94A3B8" }}>
              Drop file here or <span style={{ color:"#EF6461" }}>click to browse</span>
            </div>
            <div style={{ fontSize:12, color:"#334155", marginTop:6 }}>Supports .XLSX · .XLS · .CSV</div>
            <div style={{ marginTop:10, display:"flex", justifyContent:"center", gap:12 }}>
              {["project_name *","category *","start_date *","end_date *","status","description","project_manager","budget"].map(col => (
                <span key={col} style={{ fontSize:10, fontFamily:"monospace", background:col.includes("*")?"rgba(239,100,97,.12)":"rgba(96,165,250,.08)", color:col.includes("*")?"#EF6461":"#60A5FA", padding:"2px 7px", borderRadius:4 }}>{col}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding:"20px 22px" }}>
            {/* File info */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:20 }}>📄</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#F1F5F9" }}>{preview.fileName}</div>
                  <div style={{ fontSize:12, color:"#475569", marginTop:2 }}>{preview.rows.length} rows detected</div>
                </div>
              </div>
              <button className="btn-ghost" style={{ fontSize:11 }} onClick={()=>setPreview(null)}>✕ Clear</button>
            </div>

            {/* Validation summary */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              <div style={{ background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)", borderRadius:8, padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:20 }}>✅</span>
                <div>
                  <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif", color:"#34D399" }}>{validCount}</div>
                  <div style={{ fontSize:11, color:"#475569" }}>rows ready to import</div>
                </div>
              </div>
              <div style={{ background:errorCount>0?"rgba(239,100,97,.08)":"rgba(52,211,153,.04)", border:`1px solid ${errorCount>0?"rgba(239,100,97,.2)":"rgba(52,211,153,.1)"}`, borderRadius:8, padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:20 }}>{errorCount>0?"⚠️":"🎉"}</span>
                <div>
                  <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif", color:errorCount>0?"#EF6461":"#34D399" }}>{errorCount}</div>
                  <div style={{ fontSize:11, color:"#475569" }}>{errorCount>0?"rows have errors (will be skipped)":"all rows are valid"}</div>
                </div>
              </div>
            </div>

            {/* Preview table */}
            <div style={{ maxHeight:320, overflowY:"auto", border:"1px solid #2A2D3E", borderRadius:10, marginBottom:16 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width:36 }}>Row</th>
                    <th>Project Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>PM</th>
                    <th style={{ width:120 }}>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} style={{ background: row.valid ? "transparent" : "rgba(239,100,97,.04)" }}>
                      <td style={{ fontSize:11, color:"#475569", textAlign:"center" }}>{row.rowNum}</td>
                      <td style={{ fontWeight:500, color:row.valid?"#F1F5F9":"#EF6461" }}>{row.name||<em style={{color:"#475569"}}>missing</em>}</td>
                      <td style={{ fontSize:12 }}>
                        {row.category
                          ? <span style={{ fontSize:11, background:CATEGORIES.includes(row.category)?"rgba(96,165,250,.1)":"rgba(239,100,97,.1)", color:CATEGORIES.includes(row.category)?"#60A5FA":"#EF6461", padding:"2px 7px", borderRadius:10 }}>{row.category}</span>
                          : <span style={{ color:"#EF6461", fontSize:11 }}>missing</span>}
                      </td>
                      <td><span className={`tag ${row.status==="Active"?"tag-active":"tag-pending"}`}>{row.status}</span></td>
                      <td style={{ fontSize:12, color:row.startDate?"#94A3B8":"#EF6461" }}>{row.startDate||"missing"}</td>
                      <td style={{ fontSize:12, color:row.endDate?"#94A3B8":"#EF6461" }}>{row.endDate||"missing"}</td>
                      <td style={{ fontSize:12, color:"#64748B" }}>{row.projectManager||"—"}</td>
                      <td>
                        {row.valid
                          ? <span style={{ color:"#34D399", fontSize:12, fontWeight:600 }}>✓ Valid</span>
                          : <div>
                              {row.errors.map((e,j)=>(
                                <div key={j} style={{ fontSize:10, color:"#EF6461", marginBottom:1 }}>• {e}</div>
                              ))}
                            </div>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errorCount > 0 && (
              <div style={{ padding:"10px 14px", background:"rgba(251,191,36,.07)", border:"1px solid rgba(251,191,36,.2)", borderRadius:8, fontSize:12, color:"#FBBf24", marginBottom:14 }}>
                ⚠️ {errorCount} row{errorCount!==1?"s":""} with errors will be skipped. Valid rows will still be imported. Fix the errors in your file and re-upload to include the skipped rows.
              </div>
            )}

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="btn-ghost" onClick={()=>setPreview(null)}>Cancel</button>
              {validCount > 0 && (
                <button className="btn-coral" onClick={confirmImport}>
                  ✓ Import {validCount} Project{validCount!==1?"s":""}
                  {errorCount > 0 && ` (skip ${errorCount})`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PROJECTS TABLE */}
      <div className="card">
        <table>
          <thead>
            <tr><th>#</th><th>Project Name</th><th>Category</th><th>PM</th><th>Status</th><th>Start</th><th>End</th><th>Hours</th></tr>
          </thead>
          <tbody>
            {data.projects.map((p, i) => {
              const hrs = data.timeLogs.filter(t => t.projectId === p.id).reduce((s, t) => s + t.hours, 0);
              return (
                <tr key={p.id}>
                  <td style={{ color:"#334155", fontSize:12 }}>{i+1}</td>
                  <td>
                    <div style={{ fontWeight:600, color:"#F1F5F9", fontSize:13 }}>{p.name}</div>
                    {p.description && <div style={{ fontSize:11, color:"#475569", marginTop:2, maxWidth:280, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.description}</div>}
                  </td>
                  <td><span style={{ fontSize:11, background:"rgba(96,165,250,.1)", color:"#60A5FA", padding:"3px 9px", borderRadius:12 }}>{p.category}</span></td>
                  <td style={{ fontSize:12, color:"#64748B" }}>{p.projectManager||"—"}</td>
                  <td><span className="tag tag-active">{p.status}</span></td>
                  <td style={{ fontSize:12, color:"#64748B" }}>{fmt(p.startDate)}</td>
                  <td style={{ fontSize:12, color:"#64748B" }}>{fmt(p.endDate)}</td>
                  <td style={{ fontWeight:700, color:"#EF6461" }}>{hrs}h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ADD MANUALLY MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:17, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"#F1F5F9", marginBottom:20 }}>Add New Project</div>
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="inp" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. HRMS Digitization Initiative" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="inp" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="inp" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input className="inp" type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input className="inp" type="date" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Project Manager</label>
              <input className="inp" value={form.projectManager} onChange={e=>setForm(p=>({...p,projectManager:e.target.value}))} placeholder="Name of the project manager" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div className="form-group">
                <label className="form-label">Budget (₹)</label>
                <input className="inp" type="number" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))} placeholder="e.g. 50000" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="inp" rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Brief project description..." style={{ resize:"vertical" }} />
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
              <button className="btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-coral" onClick={save}>Save Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// EMPLOYEE VIEW COMPONENTS
// ══════════════════════════════════════════════
function EmployeeDashboard({ data, currentUser }) {
  const myLogs = data.timeLogs.filter(t => t.resourceId === currentUser.id);
  const totalH = myLogs.reduce((s, t) => s + t.hours, 0);
  const pending = myLogs.filter(t => t.status === "Pending").length;
  const approved = myLogs.filter(t => t.status === "Approved").length;
  const me = currentUser;

  const recentLogs = [...myLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="section-title">My Dashboard</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Welcome, {me?.name}</div>
        </div>
        <button className="btn-coral" onClick={() => {
          const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
          const headers = ["Date","Project","Hours","Task / Activity","Status","Approved By"];
          const rows = [...myLogs].sort((a,b)=>b.date.localeCompare(a.date)).map(log => [
            log.date, data.projects.find(p=>p.id===log.projectId)?.name||"", log.hours,
            log.description||"", log.status,
            log.approverId ? data.resources.find(r=>r.id===log.approverId)?.name||"" : ""
          ]);
          const ws = makeSheet(headers, rows); ws["!cols"] = [{wch:13},{wch:32},{wch:10},{wch:40},{wch:12},{wch:20}];
          XLSX.utils.book_append_sheet(wb, ws, "My Time Logs");
          // Summary
          const sumWs = XLSX.utils.aoa_to_sheet([["Metric","Value"],["Total Hours",totalH],["Total Entries",myLogs.length],["Approved Hours",approved],["Pending Entries",pending]]);
          XLSX.utils.book_append_sheet(wb, sumWs, "Summary");
          XLSX.writeFile(wb, `My_Timesheet_${me?.name.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.xlsx`);
        }}>⬇ Download My Report</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Hours Logged", value: totalH + "h", color: "#EF6461" },
          { label: "Pending Approval", value: pending, color: "#FBBf24" },
          { label: "Approved", value: approved, color: "#34D399" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 28, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".06em" }}>Recent Time Logs</div>
        <table>
          <thead><tr><th>Date</th><th>Project</th><th>Hours</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>
            {recentLogs.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: 12 }}>{fmt(log.date)}</td>
                <td style={{ fontWeight: 500, color: "#F1F5F9" }}>{data.projects.find(p => p.id === log.projectId)?.name}</td>
                <td style={{ fontWeight: 700, color: "#EF6461" }}>{log.hours}h</td>
                <td style={{ color: "#64748B", fontSize: 12, maxWidth: 200 }}>{log.description}</td>
                <td><span className={`tag tag-${log.status.toLowerCase()}`}>{log.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogHours({ data, updateData, showToast, currentUser }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ projectId: "", date: today, hours: "", description: "" });

  function submit() {
    if (!form.projectId || !form.hours || !form.date) return showToast("Please fill all required fields", "error");
    if (parseFloat(form.hours) <= 0 || parseFloat(form.hours) > 24) return showToast("Hours must be between 0.5 and 24", "error");
    const newLog = { id: uid(), resourceId: currentUser.id, projectId: form.projectId, date: form.date, hours: parseFloat(form.hours), description: form.description, status: "Pending", approverId: null };
    updateData(prev => ({ ...prev, timeLogs: [...prev.timeLogs, newLog] }));
    setForm({ projectId: "", date: today, hours: "", description: "" });
    showToast("Hours logged successfully — pending manager approval");
  }

  const todayLogs = data.timeLogs.filter(t => t.resourceId === currentUser.id && t.date === today);
  const todayHours = todayLogs.reduce((s, t) => s + t.hours, 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="section-title">Log Hours</div>
        <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Record your time spent on HR projects</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="card" style={{ padding: 26 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#94A3B8", marginBottom: 20, textTransform: "uppercase", letterSpacing: ".06em" }}>Time Entry</div>
          <div className="form-group">
            <label className="form-label">Project *</label>
            <select className="inp" value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}>
              <option value="">Select a project</option>
              {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="inp" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Hours *</label>
              <input className="inp" type="number" min="0.5" max="24" step="0.5" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} placeholder="e.g. 2.5" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description / Activities</label>
            <textarea className="inp" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What did you work on?" style={{ resize: "vertical" }} />
          </div>
          <button className="btn-coral" style={{ width: "100%", padding: "12px" }} onClick={submit}>Submit for Approval</button>
        </div>

        <div>
          <div className="card" style={{ padding: 22, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".06em" }}>Today's Summary</div>
            <div style={{ fontSize: 36, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#EF6461" }}>{todayHours}h</div>
            <div style={{ fontSize: 12, color: "#475569" }}>logged today ({todayLogs.length} entries)</div>
            <div className="divider" />
            {todayLogs.length === 0 ? (
              <div style={{ fontSize: 13, color: "#334155", textAlign: "center", padding: "12px 0" }}>No entries for today yet</div>
            ) : (
              todayLogs.map(log => (
                <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1E2130" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#CBD5E1" }}>{data.projects.find(p => p.id === log.projectId)?.name}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{log.description}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#EF6461" }}>{log.hours}h</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyLogs({ data, currentUser }) {
  const [filter, setFilter] = useState("all");
  const myLogs = data.timeLogs.filter(t => t.resourceId === currentUser.id);
  const filtered = filter === "all" ? myLogs : myLogs.filter(t => t.status === filter);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="section-title">My Timesheets</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "Pending", "Approved"].map(f => (
            <button key={f} className={filter === f ? "btn-coral" : "btn-ghost"} style={{ padding: "7px 16px", fontSize: 12 }} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f}
            </button>
          ))}
          <button className="btn-ghost" style={{ fontSize: 12, padding: "7px 14px", color: "#34D399", borderColor: "rgba(52,211,153,.3)" }} onClick={() => {
            const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
            const headers = ["Date","Project","Hours","Task / Activity","Status","Approved By"];
            const rows = sorted.map(log => [
              log.date, data.projects.find(p=>p.id===log.projectId)?.name||"", log.hours,
              log.description||"", log.status,
              log.approverId ? data.resources.find(r=>r.id===log.approverId)?.name||"" : ""
            ]);
            const ws = makeSheet(headers, rows); ws["!cols"] = [{wch:13},{wch:32},{wch:10},{wch:40},{wch:12},{wch:20}];
            XLSX.utils.book_append_sheet(wb, ws, filter === "all" ? "All Logs" : filter + " Logs");
            XLSX.writeFile(wb, `My_Timesheet_${filter}_${new Date().toISOString().slice(0,10)}.xlsx`);
          }}>⬇ Export</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Project</th><th>Hours</th><th>Description</th><th>Status</th><th>Approved By</th></tr></thead>
          <tbody>
            {sorted.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: 12 }}>{fmt(log.date)}</td>
                <td style={{ fontWeight: 500, color: "#F1F5F9" }}>{data.projects.find(p => p.id === log.projectId)?.name}</td>
                <td style={{ fontWeight: 700, color: "#EF6461" }}>{log.hours}h</td>
                <td style={{ color: "#64748B", fontSize: 12 }}>{log.description}</td>
                <td><span className={`tag tag-${log.status.toLowerCase()}`}>{log.status}</span></td>
                <td style={{ fontSize: 12, color: "#64748B" }}>{log.approverId ? data.resources.find(r => r.id === log.approverId)?.name : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MANAGER VIEW COMPONENTS
// ══════════════════════════════════════════════
function ManagerDashboard({ data, currentUser }) {
  const teamIds = data.resources.filter(r => r.managerId === currentUser.id).map(r => r.id);
  const teamLogs = data.timeLogs.filter(t => teamIds.includes(t.resourceId));
  const pending = teamLogs.filter(t => t.status === "Pending").length;
  const totalH = teamLogs.reduce((s, t) => s + t.hours, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="section-title">Manager Dashboard</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Team time overview and approvals</div>
        </div>
        <button className="btn-coral" onClick={() => {
          const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
          const headers = ["Employee","Role","Project","Date","Hours","Task","Status"];
          const rows = teamLogs.sort((a,b)=>b.date.localeCompare(a.date)).map(t => [
            data.resources.find(r=>r.id===t.resourceId)?.name||"",
            data.resources.find(r=>r.id===t.resourceId)?.role||"",
            data.projects.find(p=>p.id===t.projectId)?.name||"",
            t.date, t.hours, t.description||"", t.status
          ]);
          const ws = makeSheet(headers, rows); ws["!cols"] = [{wch:22},{wch:24},{wch:30},{wch:13},{wch:8},{wch:38},{wch:12}];
          XLSX.utils.book_append_sheet(wb, ws, "Team Time Logs");
          // Per-member summary
          const sumH = ["Employee","Role","Total Hours","Approved Hours","Pending Hours","Entries"];
          const sumR = teamIds.map(id => {
            const emp = data.resources.find(r=>r.id===id);
            const logs = teamLogs.filter(t=>t.resourceId===id);
            const tot = logs.reduce((s,t)=>s+t.hours,0);
            const app = logs.filter(t=>t.status==="Approved").reduce((s,t)=>s+t.hours,0);
            return [emp?.name||id, emp?.role||"", tot, app, tot-app, logs.length];
          });
          XLSX.utils.book_append_sheet(wb, makeSheet(sumH, sumR), "Team Summary");
          XLSX.writeFile(wb, `Manager_Team_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
        }}>⬇ Download Team Report</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Team Members", value: teamIds.length, color: "#60A5FA" },
          { label: "Pending Approvals", value: pending, color: "#FBBf24" },
          { label: "Team Hours (All)", value: totalH + "h", color: "#EF6461" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 28, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".06em" }}>Pending Approvals</div>
        {teamLogs.filter(t => t.status === "Pending").slice(0, 5).map(log => (
          <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1E2130" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9" }}>{data.resources.find(r => r.id === log.resourceId)?.name}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{data.projects.find(p => p.id === log.projectId)?.name} · {fmt(log.date)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 700, color: "#EF6461" }}>{log.hours}h</span>
              <span className="tag tag-pending">Pending</span>
            </div>
          </div>
        ))}
        {teamLogs.filter(t => t.status === "Pending").length === 0 && <div style={{ fontSize: 13, color: "#334155", padding: "12px 0" }}>No pending approvals 🎉</div>}
      </div>
    </div>
  );
}

function Approvals({ data, updateData, showToast, currentUser }) {
  const teamIds = data.resources.filter(r => r.managerId === currentUser.id).map(r => r.id);
  const pending = data.timeLogs.filter(t => teamIds.includes(t.resourceId) && t.status === "Pending");
  const [comment, setComment] = useState({});

  function approve(id) {
    updateData(prev => ({ ...prev, timeLogs: prev.timeLogs.map(t => t.id === id ? { ...t, status: "Approved", approverId: currentUser.id } : t) }));
    showToast("Hours approved");
  }
  function reject(id) {
    updateData(prev => ({ ...prev, timeLogs: prev.timeLogs.map(t => t.id === id ? { ...t, status: "Rejected", approverId: currentUser.id } : t) }));
    showToast("Entry rejected", "error");
  }
  function approveAll() {
    updateData(prev => ({ ...prev, timeLogs: prev.timeLogs.map(t => teamIds.includes(t.resourceId) && t.status === "Pending" ? { ...t, status: "Approved", approverId: currentUser.id } : t) }));
    showToast(`All ${pending.length} entries approved`);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="section-title">Pending Approvals</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{pending.length} entries awaiting your approval</div>
        </div>
        {<div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" style={{ fontSize: 12, color: "#34D399", borderColor: "rgba(52,211,153,.3)" }} onClick={() => {
            const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
            const allTeamLogs = data.timeLogs.filter(t => teamIds.includes(t.resourceId));
            const headers = ["Employee","Role","Project","Date","Hours","Task","Status"];
            const rows = allTeamLogs.sort((a,b)=>b.date.localeCompare(a.date)).map(t => [
              data.resources.find(r=>r.id===t.resourceId)?.name||"",
              data.resources.find(r=>r.id===t.resourceId)?.role||"",
              data.projects.find(p=>p.id===t.projectId)?.name||"",
              t.date, t.hours, t.description||"", t.status
            ]);
            const ws = makeSheet(headers, rows); ws["!cols"]=[{wch:22},{wch:22},{wch:30},{wch:13},{wch:8},{wch:38},{wch:12}];
            XLSX.utils.book_append_sheet(wb, ws, "All Pending & Approved");
            XLSX.writeFile(wb, `Approvals_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
          }}>⬇ Export</button>
          {pending.length > 0 && <button className="btn-coral" onClick={approveAll}>Approve All ({pending.length})</button>}
        </div>}
      </div>

      {pending.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#94A3B8" }}>All caught up!</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>No pending approvals at this time.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pending.map(log => {
            const emp = data.resources.find(r => r.id === log.resourceId);
            const proj = data.projects.find(p => p.id === log.projectId);
            return (
              <div key={log.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${stringToColor(emp?.name || "")})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(emp?.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#F1F5F9", fontSize: 14 }}>{emp?.name}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{emp?.role}</div>
                    </div>
                  </div>
                  <span className="tag tag-pending">Pending</span>
                </div>
                <div className="divider" style={{ margin: "14px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
                  <div><div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Project</div><div style={{ fontSize: 13, fontWeight: 500, color: "#CBD5E1" }}>{proj?.name}</div></div>
                  <div><div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Date</div><div style={{ fontSize: 13, color: "#CBD5E1" }}>{fmt(log.date)}</div></div>
                  <div><div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Hours</div><div style={{ fontSize: 18, fontWeight: 800, color: "#EF6461", fontFamily: "'Syne',sans-serif" }}>{log.hours}h</div></div>
                </div>
                {log.description && <div style={{ background: "#0F1117", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#64748B", marginBottom: 14 }}>📝 {log.description}</div>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn-ghost" style={{ color: "#EF6461", borderColor: "rgba(239,100,97,.3)" }} onClick={() => reject(log.id)}>✗ Reject</button>
                  <button className="btn-coral" onClick={() => approve(log.id)}>✓ Approve</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamView({ data, currentUser }) {
  const teamIds = data.resources.filter(r => r.managerId === currentUser.id).map(r => r.id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="section-title">Team Overview</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Time logged by each team member</div>
        </div>
        <button className="btn-coral" onClick={() => {
          const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
          // Summary per member
          const sumH = ["Employee ID","Employee","Role","Total Hours","Approved Hours","Pending Hours","Active Days","Projects"];
          const sumR = teamIds.map(id => {
            const emp = data.resources.find(r=>r.id===id);
            const logs = data.timeLogs.filter(t=>t.resourceId===id);
            const tot = logs.reduce((s,t)=>s+t.hours,0);
            const app = logs.filter(t=>t.status==="Approved").reduce((s,t)=>s+t.hours,0);
            const days = [...new Set(logs.map(t=>t.date))].length;
            const projs = [...new Set(logs.map(t=>data.projects.find(p=>p.id===t.projectId)?.name||""))].filter(Boolean).join(", ");
            return [id, emp?.name||"", emp?.role||"", tot, app, tot-app, days, projs];
          });
          XLSX.utils.book_append_sheet(wb, makeSheet(sumH, sumR), "Team Summary");
          // Detail per member as separate sheets
          teamIds.forEach(id => {
            const emp = data.resources.find(r=>r.id===id);
            const logs = data.timeLogs.filter(t=>t.resourceId===id).sort((a,b)=>b.date.localeCompare(a.date));
            if (!logs.length) return;
            const h = ["Date","Project","Hours","Task / Activity","Status"];
            const r = logs.map(t => [t.date, data.projects.find(p=>p.id===t.projectId)?.name||"", t.hours, t.description||"", t.status]);
            const ws = makeSheet(h, r); ws["!cols"]=[{wch:13},{wch:30},{wch:8},{wch:40},{wch:12}];
            XLSX.utils.book_append_sheet(wb, ws, (emp?.name||id).slice(0,31));
          });
          XLSX.writeFile(wb, `Team_Overview_${new Date().toISOString().slice(0,10)}.xlsx`);
        }}>⬇ Download Team Report</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        {teamIds.map(rid => {
          const emp = data.resources.find(r => r.id === rid);
          const logs = data.timeLogs.filter(t => t.resourceId === rid);
          const totalH = logs.reduce((s, t) => s + t.hours, 0);
          const pending = logs.filter(t => t.status === "Pending").length;
          const projBreakdown = data.projects.map(p => ({ ...p, hours: logs.filter(t => t.projectId === p.id).reduce((s, t) => s + t.hours, 0) })).filter(p => p.hours > 0);

          return (
            <div key={rid} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg,${stringToColor(emp?.name||"")})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>{(emp?.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#F1F5F9" }}>{emp?.name}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{emp?.role}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#EF6461" }}>{totalH}h</div>
                  {pending > 0 && <span className="tag tag-pending">{pending} pending</span>}
                </div>
              </div>
              {projBreakdown.map(p => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid #1E2130" }}>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>{p.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#CBD5E1" }}>{p.hours}h</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// REPORTS VIEW
// ══════════════════════════════════════════════
function ReportsView({ section, data }) {
  if (section === "report-employee") return <EmployeeReport data={data} />;
  if (section === "report-project") return <ProjectReport data={data} />;
  return null;
}

// ── Excel download helper using SheetJS ───────
function downloadXLSX(workbook, filename) {
  try {
    const XLSX = window.XLSX;
    if (!XLSX) { alert("SheetJS not loaded — please refresh and try again."); return; }
    XLSX.writeFile(workbook, filename);
  } catch (e) {
    alert("Download failed: " + e.message);
  }
}

function makeSheet(headers, rows) {
  const XLSX = window.XLSX;
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Column widths
  ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 4, 16) }));
  // Header style (bold) — basic
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
    if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "2B2D42" } }, font: { color: { rgb: "FFFFFF" }, bold: true } };
  });
  return ws;
}

function EmployeeReport({ data }) {
  const [period, setPeriod] = useState("daily");
  const [selectedEmp, setSelectedEmp] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Base filtered logs
  let logs = selectedEmp === "all" ? data.timeLogs : data.timeLogs.filter(t => t.resourceId === selectedEmp);
  if (fromDate) logs = logs.filter(t => t.date >= fromDate);
  if (toDate)   logs = logs.filter(t => t.date <= toDate);

  function groupKey(log) {
    if (period === "daily")     return log.date;
    if (period === "weekly")    return "Week of " + isoWeek(log.date);
    if (period === "monthly")   return isoMonth(log.date);
    if (period === "quarterly") return isoQuarter(log.date);
    if (period === "yearly")    return isoYear(log.date);
    return log.date;
  }

  const grouped = logs.reduce((acc, log) => {
    const key = groupKey(log);
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const groupedRows = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));

  // Build flat rows for display & export: Emp ID, Emp Name, Date, Hours, Project, Task
  function buildFlatRows(logList) {
    return [...logList].sort((a, b) => {
      const ea = data.resources.find(r => r.id === a.resourceId)?.name || "";
      const eb = data.resources.find(r => r.id === b.resourceId)?.name || "";
      if (ea !== eb) return ea.localeCompare(eb);
      return a.date.localeCompare(b.date);
    }).map(log => {
      const emp  = data.resources.find(r => r.id === log.resourceId);
      const proj = data.projects.find(p => p.id === log.projectId);
      return {
        empId:    log.resourceId.toUpperCase(),
        empName:  emp?.name || "—",
        empRole:  emp?.role || "",
        date:     log.date,
        hours:    log.hours,
        project:  proj?.name || "—",
        category: proj?.category || "",
        task:     log.description || "—",
        status:   log.status,
        approvedBy: log.approverId ? data.resources.find(r => r.id === log.approverId)?.name || "" : "",
      };
    });
  }

  // ── Excel export ──────────────────────────────
  function exportExcel() {
    const XLSX = window.XLSX;
    if (!XLSX) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Employee-wise detail (the primary requested report)
    const detailHeaders = [
      "Employee ID", "Employee Name", "Designation / Role",
      "Date", "Hours Logged", "Project", "Project Category", "Task / Activity",
      "Status", "Approved By"
    ];
    const detailRows = buildFlatRows(logs).map(r => [
      r.empId, r.empName, r.empRole,
      r.date, r.hours, r.project, r.category, r.task,
      r.status, r.approvedBy
    ]);
    const detailWs = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    detailWs["!cols"] = [
      { wch: 14 }, { wch: 22 }, { wch: 26 },
      { wch: 13 }, { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 36 },
      { wch: 12 }, { wch: 20 }
    ];
    // Bold header row
    detailHeaders.forEach((_, i) => {
      const cell = detailWs[XLSX.utils.encode_cell({ r: 0, c: i })];
      if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2B2D42" } } };
    });
    XLSX.utils.book_append_sheet(wb, detailWs, "Employee-wise Detail");

    // Sheet 2: Period summary
    const summHeaders = ["Period", "Total Entries", "Total Hours", "Unique Employees", "Approved Hours", "Pending Hours"];
    const summRows = groupedRows.map(([key, pLogs]) => {
      const total    = pLogs.reduce((s, t) => s + t.hours, 0);
      const approved = pLogs.filter(t => t.status === "Approved").reduce((s, t) => s + t.hours, 0);
      return [key, pLogs.length, total, [...new Set(pLogs.map(t => t.resourceId))].length, approved, total - approved];
    });
    XLSX.utils.book_append_sheet(wb, makeSheet(summHeaders, summRows), "Period Summary");

    // Sheet 3: One sheet per employee (if All selected)
    if (selectedEmp === "all") {
      data.resources.forEach(emp => {
        const empLogs = logs.filter(t => t.resourceId === emp.id);
        if (!empLogs.length) return;
        const headers = ["Employee ID", "Employee Name", "Date", "Hours Logged", "Project", "Task / Activity", "Status"];
        const rows = buildFlatRows(empLogs).map(r => [r.empId, r.empName, r.date, r.hours, r.project, r.task, r.status]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 13 }, { wch: 14 }, { wch: 32 }, { wch: 36 }, { wch: 12 }];
        const sheetName = emp.name.replace(/[:\\/?*[\]]/g, "").slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    }

    const empLabel = selectedEmp === "all" ? "All_Employees" : data.resources.find(r => r.id === selectedEmp)?.name.replace(/\s+/g, "_") || "Emp";
    const now = new Date().toISOString().slice(0, 10);
    downloadXLSX(wb, `HR_Employee_Report_${empLabel}_${period}_${now}.xlsx`);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div className="section-title">Employee-wise Time Report</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Employee ID · Name · Date · Hours · Project · Task</div>
        </div>
        <button className="btn-coral" onClick={exportExcel} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          ⬇ Download Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "0 0 auto" }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Employee</div>
          <select className="inp" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={{ width: 200 }}>
            <option value="all">All Employees</option>
            {data.resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Group By</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["daily","weekly","monthly","quarterly","yearly"].map(p => (
              <button key={p} className={period === p ? "btn-coral" : "btn-ghost"} style={{ padding: "7px 13px", fontSize: 12, textTransform: "capitalize" }} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="form-label" style={{ marginBottom: 6 }}>From Date</div>
          <input className="inp" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: 150 }} />
        </div>
        <div>
          <div className="form-label" style={{ marginBottom: 6 }}>To Date</div>
          <input className="inp" type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: 150 }} />
        </div>
        {(fromDate || toDate) && (
          <button className="btn-ghost" style={{ fontSize: 12, alignSelf: "flex-end" }} onClick={() => { setFromDate(""); setToDate(""); }}>✕ Clear Dates</button>
        )}
      </div>

      {/* Summary stat bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Entries",  value: logs.length,                                                                  color: "#60A5FA" },
          { label: "Total Hours",    value: logs.reduce((s, t) => s + t.hours, 0) + "h",                                  color: "#EF6461" },
          { label: "Approved Hours", value: logs.filter(t => t.status === "Approved").reduce((s, t) => s + t.hours, 0) + "h", color: "#34D399" },
          { label: "Pending Hours",  value: logs.filter(t => t.status === "Pending").reduce((s, t) => s + t.hours, 0) + "h",  color: "#FBBf24" },
        ].map(s => (
          <div key={s.label} style={{ background: "#1A1D27", border: "1px solid #2A2D3E", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grouped tables */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {groupedRows.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: "center", color: "#475569" }}>No data for selected filters</div>
        )}
        {groupedRows.map(([key, periodLogs]) => {
          const flatRows = buildFlatRows(periodLogs);
          const totalH   = periodLogs.reduce((s, t) => s + t.hours, 0);
          const uniqueE  = [...new Set(periodLogs.map(t => t.resourceId))].length;
          return (
            <div key={key} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Group header */}
              <div style={{ background: "#141720", padding: "11px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2A2D3E" }}>
                <div style={{ fontWeight: 700, color: "#F1F5F9", fontSize: 14 }}>{key}</div>
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#64748B" }}>{periodLogs.length} entries · {uniqueE} employee{uniqueE !== 1 ? "s" : ""}</span>
                  <span style={{ fontSize: 16, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#EF6461" }}>{totalH}h</span>
                </div>
              </div>

              {/* Main table with all 6 columns */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>Employee ID</th>
                      <th style={{ width: 160 }}>Employee Name</th>
                      <th style={{ width: 100 }}>Date</th>
                      <th style={{ width: 80, textAlign: "center" }}>Hours</th>
                      <th style={{ width: 220 }}>Project</th>
                      <th>Task / Activity</th>
                      <th style={{ width: 100 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatRows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(96,165,250,.1)", color: "#60A5FA", padding: "2px 8px", borderRadius: 6, letterSpacing: ".04em" }}>
                            {row.empId}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${stringToColor(row.empName)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {row.empName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "#F1F5F9", fontSize: 13 }}>{row.empName}</div>
                              <div style={{ fontSize: 10, color: "#475569" }}>{row.empRole}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "#94A3B8" }}>{fmt(row.date)}</td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#EF6461" }}>{row.hours}</span>
                          <span style={{ fontSize: 10, color: "#475569", marginLeft: 2 }}>h</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: "#CBD5E1", fontSize: 13 }}>{row.project}</div>
                          {row.category && <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{row.category}</div>}
                        </td>
                        <td style={{ fontSize: 12, color: "#94A3B8", maxWidth: 260 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.task}>{row.task}</div>
                        </td>
                        <td><span className={`tag tag-${row.status.toLowerCase()}`}>{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Group totals row */}
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ fontWeight: 700, color: "#64748B", fontSize: 12, padding: "10px 14px", background: "#141720", borderTop: "1px solid #2A2D3E" }}>Subtotal</td>
                      <td style={{ textAlign: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#EF6461", background: "#141720", borderTop: "1px solid #2A2D3E" }}>{totalH}<span style={{ fontSize: 10, color: "#475569", marginLeft: 2 }}>h</span></td>
                      <td colSpan={3} style={{ background: "#141720", borderTop: "1px solid #2A2D3E" }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectReport({ data }) {
  const [selectedProj, setSelectedProj] = useState("");
  const [period, setPeriod] = useState("monthly");

  // Period helpers
  function getPeriodKey(dateStr, per) {
    if (!dateStr) return "Unknown";
    if (per === "weekly")      return "Week of " + isoWeek(dateStr);
    if (per === "fortnightly") {
      const d = new Date(dateStr);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const diff = Math.floor((d - start) / (7 * 86400000));
      const half = diff < 2 ? "1st–14th" : "15th–End";
      return isoMonth(dateStr) + " " + half;
    }
    if (per === "monthly")     return isoMonth(dateStr);
    if (per === "quarterly")   return isoQuarter(dateStr);
    if (per === "halfyearly")  {
      const m = parseInt(dateStr.slice(5, 7));
      const y = dateStr.slice(0, 4);
      return `${y} H${m <= 6 ? 1 : 2}`;
    }
    if (per === "annually")    return isoYear(dateStr);
    return dateStr;
  }

  const PERIODS = [
    { id: "weekly",      label: "Weekly" },
    { id: "fortnightly", label: "Fortnightly" },
    { id: "monthly",     label: "Monthly" },
    { id: "quarterly",   label: "Quarterly" },
    { id: "halfyearly",  label: "Half-yearly" },
    { id: "annually",    label: "Annually" },
  ];

  const proj = data.projects.find(p => p.id === selectedProj);
  const projLogs = selectedProj ? data.timeLogs.filter(t => t.projectId === selectedProj) : [];

  // Unique periods in sorted order
  const allPeriodKeys = [...new Set(projLogs.map(t => getPeriodKey(t.date, period)))].sort();

  // Resources who have logged time
  const activeResources = data.resources.filter(r => projLogs.some(t => t.resourceId === r.id));

  // Build matrix: resource × period → hours
  function getHours(resourceId, periodKey) {
    return projLogs
      .filter(t => t.resourceId === resourceId && getPeriodKey(t.date, period) === periodKey)
      .reduce((s, t) => s + t.hours, 0);
  }

  function getTotal(resourceId) {
    return projLogs.filter(t => t.resourceId === resourceId).reduce((s, t) => s + t.hours, 0);
  }

  function getPeriodTotal(periodKey) {
    return projLogs.filter(t => getPeriodKey(t.date, period) === periodKey).reduce((s, t) => s + t.hours, 0);
  }

  const grandTotal = projLogs.reduce((s, t) => s + t.hours, 0);

  // ── Excel export ───────────────────────────
  function exportExcel() {
    const XLSX = window.XLSX;
    if (!XLSX || !proj) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Resource vs Period matrix
    const headers = ["Resource", "Role", ...allPeriodKeys, "TOTAL HOURS"];
    const rows = activeResources.map(r => [
      r.name,
      r.role,
      ...allPeriodKeys.map(pk => getHours(r.id, pk) || ""),
      getTotal(r.id),
    ]);
    // Totals row
    rows.push([
      "TOTAL", "",
      ...allPeriodKeys.map(pk => getPeriodTotal(pk)),
      grandTotal,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 24 }, { wch: 22 }, ...allPeriodKeys.map(() => ({ wch: 16 })), { wch: 14 }];

    // Style header row
    headers.forEach((_, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
      if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2B2D42" } } };
    });
    // Style TOTAL row
    const lastRow = rows.length;
    headers.forEach((_, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r: lastRow, c: i })];
      if (cell) cell.s = { font: { bold: true } };
    });

    XLSX.utils.book_append_sheet(wb, ws, "Resource vs Period");

    // Sheet 2: Detailed log
    const detailHeaders = ["Resource", "Role", "Date", `Period (${PERIODS.find(p=>p.id===period)?.label})`, "Hours", "Task / Activity", "Status"];
    const detailRows = projLogs.sort((a, b) => {
      const ea = data.resources.find(r => r.id === a.resourceId)?.name || "";
      const eb = data.resources.find(r => r.id === b.resourceId)?.name || "";
      return ea !== eb ? ea.localeCompare(eb) : a.date.localeCompare(b.date);
    }).map(log => {
      const r = data.resources.find(r => r.id === log.resourceId);
      return [r?.name||"", r?.role||"", log.date, getPeriodKey(log.date, period), log.hours, log.description||"", log.status];
    });
    const detailWs = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    detailWs["!cols"] = [{ wch: 22 }, { wch: 24 }, { wch: 13 }, { wch: 20 }, { wch: 10 }, { wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, detailWs, "Detailed Log");

    // Sheet 3: Project summary info
    const infoRows = [
      ["Project Name",  proj.name],
      ["Category",      proj.category],
      ["Status",        proj.status],
      ["Start Date",    proj.startDate],
      ["End Date",      proj.endDate],
      ["Report Period", PERIODS.find(p => p.id === period)?.label],
      ["Total Hours",   grandTotal],
      ["Equiv. Days (8h)", Math.ceil(grandTotal / 8)],
      ["Contributors",  activeResources.length],
      ["Generated On",  new Date().toLocaleDateString("en-IN")],
    ];
    const infoWs = XLSX.utils.aoa_to_sheet(infoRows);
    infoWs["!cols"] = [{ wch: 22 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, infoWs, "Project Info");

    const now = new Date().toISOString().slice(0, 10);
    downloadXLSX(wb, `HR_Project_Report_${proj.name.replace(/\s+/g,"_").slice(0,20)}_${period}_${now}.xlsx`);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div className="section-title">Project-wise Report</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Select a project and time period to view resource-wise hours</div>
        </div>
        {proj && (
          <button className="btn-coral" onClick={exportExcel} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            ⬇ Download Excel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "18px 22px", marginBottom: 24, display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Select Project</div>
          <select className="inp" value={selectedProj} onChange={e => setSelectedProj(e.target.value)}>
            <option value="">— Choose a project —</option>
            {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Time Period</div>
          <select className="inp" value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 180 }}>
            {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        {proj && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em" }}>Project Period</div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>{fmt(proj.startDate)} — {fmt(proj.endDate)}</div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!selectedProj && (
        <div className="card" style={{ padding: "52px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📁</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#64748B" }}>Select a project to view the report</div>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 6 }}>Choose a project and time period from the filters above</div>
        </div>
      )}

      {/* Report */}
      {proj && (
        <div>
          {/* Project info banner */}
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ background: "linear-gradient(135deg,#2B2D42,#1A1D27)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#F1F5F9", fontSize: 18 }}>{proj.name}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 6, display: "flex", gap: 16 }}>
                  <span>📂 {proj.category}</span>
                  <span>📅 {fmt(proj.startDate)} – {fmt(proj.endDate)}</span>
                  <span className="tag tag-active">{proj.status}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24, textAlign: "center" }}>
                <div>
                  <div style={{ fontSize: 26, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#EF6461" }}>{grandTotal}h</div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", marginTop: 2 }}>Total Hours</div>
                </div>
                <div>
                  <div style={{ fontSize: 26, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#60A5FA" }}>{Math.ceil(grandTotal / 8)}d</div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", marginTop: 2 }}>Equiv. Days</div>
                </div>
                <div>
                  <div style={{ fontSize: 26, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#34D399" }}>{activeResources.length}</div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", marginTop: 2 }}>Resources</div>
                </div>
                <div>
                  <div style={{ fontSize: 26, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#A78BFA" }}>{allPeriodKeys.length}</div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", marginTop: 2 }}>{PERIODS.find(p=>p.id===period)?.label} Periods</div>
                </div>
              </div>
            </div>
          </div>

          {/* No data */}
          {projLogs.length === 0 && (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "#475569" }}>No time logged for this project yet.</div>
          )}

          {/* Resource × Period matrix table */}
          {projLogs.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ background: "#141720", padding: "12px 20px", borderBottom: "1px solid #2A2D3E", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Resource-wise Hours — {PERIODS.find(p=>p.id===period)?.label} View
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Resource</th>
                      <th style={{ minWidth: 160 }}>Role</th>
                      {allPeriodKeys.map(pk => (
                        <th key={pk} style={{ minWidth: 110, textAlign: "center", color: "#60A5FA" }}>{pk}</th>
                      ))}
                      <th style={{ minWidth: 110, textAlign: "center", color: "#EF6461" }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeResources.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${stringToColor(r.name)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {r.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <span style={{ fontWeight: 600, color: "#F1F5F9", fontSize: 13 }}>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "#64748B" }}>{r.role}</td>
                        {allPeriodKeys.map(pk => {
                          const h = getHours(r.id, pk);
                          return (
                            <td key={pk} style={{ textAlign: "center" }}>
                              {h > 0
                                ? <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#CBD5E1" }}>{h}<span style={{ fontSize: 10, color: "#475569", marginLeft: 1 }}>h</span></span>
                                : <span style={{ color: "#2A2D3E", fontSize: 13 }}>—</span>
                              }
                            </td>
                          );
                        })}
                        <td style={{ textAlign: "center", background: "rgba(239,100,97,.06)" }}>
                          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#EF6461" }}>{getTotal(r.id)}<span style={{ fontSize: 10, color: "#475569", marginLeft: 1 }}>h</span></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr style={{ background: "#141720" }}>
                      <td colSpan={2} style={{ fontWeight: 700, color: "#64748B", fontSize: 12, borderTop: "2px solid #2A2D3E" }}>Period Total</td>
                      {allPeriodKeys.map(pk => (
                        <td key={pk} style={{ textAlign: "center", borderTop: "2px solid #2A2D3E" }}>
                          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "#60A5FA" }}>{getPeriodTotal(pk)}<span style={{ fontSize: 10, color: "#475569", marginLeft: 1 }}>h</span></span>
                        </td>
                      ))}
                      <td style={{ textAlign: "center", borderTop: "2px solid #2A2D3E", background: "rgba(239,100,97,.1)" }}>
                        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: "#EF6461" }}>{grandTotal}<span style={{ fontSize: 11, color: "#475569", marginLeft: 1 }}>h</span></span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Per-resource detail cards */}
          {projLogs.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Resource Detail</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
                {activeResources.map(r => {
                  const rLogs = projLogs.filter(t => t.resourceId === r.id);
                  const totalH   = rLogs.reduce((s, t) => s + t.hours, 0);
                  const approvedH = rLogs.filter(t => t.status === "Approved").reduce((s, t) => s + t.hours, 0);
                  const days     = [...new Set(rLogs.map(t => t.date))].length;
                  return (
                    <div key={r.id} className="card" style={{ padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${stringToColor(r.name)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                          {r.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#F1F5F9", fontSize: 14 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "#64748B" }}>{r.role}</div>
                        </div>
                        <div style={{ marginLeft: "auto", textAlign: "right" }}>
                          <div style={{ fontSize: 22, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#EF6461" }}>{totalH}h</div>
                          <div style={{ fontSize: 10, color: "#475569" }}>{days} active day{days !== 1 ? "s" : ""}</div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                        <div style={{ background: "rgba(52,211,153,.07)", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#34D399" }}>{approvedH}h</div>
                          <div style={{ fontSize: 10, color: "#475569" }}>Approved</div>
                        </div>
                        <div style={{ background: "rgba(251,191,36,.07)", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#FBBf24" }}>{totalH - approvedH}h</div>
                          <div style={{ fontSize: 10, color: "#475569" }}>Pending</div>
                        </div>
                      </div>
                      {/* Period breakdown */}
                      {allPeriodKeys.filter(pk => getHours(r.id, pk) > 0).map(pk => (
                        <div key={pk} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid #1E2130" }}>
                          <div style={{ fontSize: 12, color: "#64748B" }}>{pk}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#CBD5E1" }}>{getHours(r.id, pk)}h</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// function EmployeeReport({ data }) {
//   const [period, setPeriod] = useState("daily");
//   const [selectedEmp, setSelectedEmp] = useState("all");

//   const logs = selectedEmp === "all" ? data.timeLogs : data.timeLogs.filter(t => t.resourceId === selectedEmp);

//   function groupKey(log) {
//     if (period === "daily") return log.date;
//     if (period === "weekly") return isoWeek(log.date) + " (Week)";
//     if (period === "monthly") return isoMonth(log.date);
//     if (period === "quarterly") return isoQuarter(log.date);
//     if (period === "yearly") return isoYear(log.date);
//     return log.date;
//   }

//   const grouped = logs.reduce((acc, log) => {
//     const key = groupKey(log);
//     if (!acc[key]) acc[key] = [];
//     acc[key].push(log);
//     return acc;
//   }, {});

//   const rows = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));

//   return (
//     <div>
//       <div style={{ marginBottom: 24 }}>
//         <div className="section-title">Employee Time Report</div>
//         <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Daily, Weekly, Monthly, Quarterly & Yearly views</div>
//       </div>

//       <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
//         <select className="inp" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={{ width: 220 }}>
//           <option value="all">All Employees</option>
//           {data.resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
//         </select>
//         <div style={{ display: "flex", gap: 6 }}>
//           {["daily","weekly","monthly","quarterly","yearly"].map(p => (
//             <button key={p} className={period === p ? "btn-coral" : "btn-ghost"} style={{ padding: "8px 14px", fontSize: 12, textTransform: "capitalize" }} onClick={() => setPeriod(p)}>{p}</button>
//           ))}
//         </div>
//       </div>

//       <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
//         {rows.length === 0 && <div className="card" style={{ padding: 32, textAlign: "center", color: "#475569" }}>No data for selected filters</div>}
//         {rows.map(([key, periodLogs]) => {
//           const totalH = periodLogs.reduce((s, t) => s + t.hours, 0);
//           const uniqueEmps = [...new Set(periodLogs.map(t => t.resourceId))];
//           return (
//             <div key={key} className="card" style={{ padding: 0, overflow: "hidden" }}>
//               <div style={{ background: "#141720", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2A2D3E" }}>
//                 <div style={{ fontWeight: 700, color: "#F1F5F9", fontSize: 14 }}>{key}</div>
//                 <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
//                   <span style={{ fontSize: 12, color: "#64748B" }}>{periodLogs.length} entries · {uniqueEmps.length} employee{uniqueEmps.length !== 1 ? "s" : ""}</span>
//                   <span style={{ fontSize: 16, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#EF6461" }}>{totalH}h</span>
//                 </div>
//               </div>
//               <table>
//                 <thead><tr><th>Employee</th><th>Project</th><th>Hours</th><th>Description</th><th>Status</th></tr></thead>
//                 <tbody>
//                   {periodLogs.map(log => (
//                     <tr key={log.id}>
//                       <td style={{ fontWeight: 500, color: "#F1F5F9" }}>{data.resources.find(r => r.id === log.resourceId)?.name}</td>
//                       <td style={{ fontSize: 12 }}>{data.projects.find(p => p.id === log.projectId)?.name}</td>
//                       <td style={{ fontWeight: 700, color: "#EF6461" }}>{log.hours}h</td>
//                       <td style={{ fontSize: 12, color: "#64748B" }}>{log.description || "—"}</td>
//                       <td><span className={`tag tag-${log.status.toLowerCase()}`}>{log.status}</span></td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// function ProjectReport({ data }) {
//   const [selectedProj, setSelectedProj] = useState("all");

//   const projects = selectedProj === "all" ? data.projects : data.projects.filter(p => p.id === selectedProj);

//   return (
//     <div>
//       <div style={{ marginBottom: 24 }}>
//         <div className="section-title">Project-wise Report</div>
//         <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Hours and days spent by employees on each project</div>
//       </div>

//       <div style={{ marginBottom: 20 }}>
//         <select className="inp" value={selectedProj} onChange={e => setSelectedProj(e.target.value)} style={{ width: 280 }}>
//           <option value="all">All Projects</option>
//           {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
//         </select>
//       </div>

//       <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
//         {projects.map(proj => {
//           const projLogs = data.timeLogs.filter(t => t.projectId === proj.id);
//           const totalH = projLogs.reduce((s, t) => s + t.hours, 0);
//           const totalDays = Math.ceil(totalH / 8);

//           const empBreakdown = data.resources.map(emp => {
//             const empLogs = projLogs.filter(t => t.resourceId === emp.id);
//             if (empLogs.length === 0) return null;
//             const hours = empLogs.reduce((s, t) => s + t.hours, 0);
//             const days = [...new Set(empLogs.map(t => t.date))].length;
//             const approvedH = empLogs.filter(t => t.status === "Approved").reduce((s, t) => s + t.hours, 0);
//             return { emp, empLogs, hours, days, approvedH };
//           }).filter(Boolean);

//           return (
//             <div key={proj.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
//               {/* Project header */}
//               <div style={{ background: "linear-gradient(135deg,#2B2D42,#1A1D27)", padding: "18px 22px", borderBottom: "1px solid #2A2D3E" }}>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
//                   <div>
//                     <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: "#F1F5F9", fontSize: 16 }}>{proj.name}</div>
//                     <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{proj.category} · {fmt(proj.startDate)} – {fmt(proj.endDate)}</div>
//                   </div>
//                   <div style={{ display: "flex", gap: 20, textAlign: "right" }}>
//                     <div><div style={{ fontSize: 22, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#EF6461" }}>{totalH}h</div><div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase" }}>Total Hours</div></div>
//                     <div><div style={{ fontSize: 22, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#60A5FA" }}>{totalDays}d</div><div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase" }}>Equiv. Days</div></div>
//                     <div><div style={{ fontSize: 22, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#34D399" }}>{empBreakdown.length}</div><div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase" }}>Contributors</div></div>
//                   </div>
//                 </div>
//               </div>

//               {/* Employee breakdown */}
//               {empBreakdown.length === 0 ? (
//                 <div style={{ padding: "20px 22px", fontSize: 13, color: "#334155" }}>No time logged for this project yet.</div>
//               ) : (
//                 <table>
//                   <thead>
//                     <tr>
//                       <th>Employee</th>
//                       <th>Role</th>
//                       <th>Days Active</th>
//                       <th>Total Hours</th>
//                       <th>Approved Hours</th>
//                       <th>Pending Hours</th>
//                       <th>Entries</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {empBreakdown.map(({ emp, empLogs, hours, days, approvedH }) => {
//                       const pendingH = hours - approvedH;
//                       return (
//                         <tr key={emp.id}>
//                           <td>
//                             <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                               <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${stringToColor(emp.name)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
//                               <span style={{ fontWeight: 600, color: "#F1F5F9" }}>{emp.name}</span>
//                             </div>
//                           </td>
//                           <td style={{ fontSize: 12, color: "#64748B" }}>{emp.role}</td>
//                           <td style={{ fontWeight: 700, color: "#60A5FA" }}>{days} day{days !== 1 ? "s" : ""}</td>
//                           <td style={{ fontWeight: 700, color: "#EF6461" }}>{hours}h</td>
//                           <td style={{ color: "#34D399", fontWeight: 600 }}>{approvedH}h</td>
//                           <td style={{ color: pendingH > 0 ? "#FBBf24" : "#334155", fontWeight: 600 }}>{pendingH}h</td>
//                           <td style={{ color: "#64748B" }}>{empLogs.length}</td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// ══════════════════════════════════════════════
// EXCEL IMPORT / EXPORT PANEL
// ══════════════════════════════════════════════

// ── CSV/Excel export helper ──────────────────
function toCSV(headers, rows) {
  const escape = v => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Parse uploaded file ───────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { vals.push(cur); cur = ""; continue; }
      cur += ch;
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim(); });
    return obj;
  });
}

function ExcelPanel({ data, updateData, showToast }) {
  const [uploadType, setUploadType] = useState("resources");
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);

  // ── EXPORT functions ─────────────────────────
  function exportResources() {
    const headers = ["id","name","role","email","is_manager","manager_name"];
    const rows = data.resources.map(r => [
      r.id, r.name, r.role, r.email,
      r.isManager ? "Yes" : "No",
      data.resources.find(x => x.id === r.managerId)?.name || ""
    ]);
    downloadCSV("hr_resources.csv", toCSV(headers, rows));
    showToast("Resources exported as CSV");
  }

  function exportProjects() {
    const headers = ["id","name","category","status","start_date","end_date","total_hours"];
    const rows = data.projects.map(p => {
      const hrs = data.timeLogs.filter(t => t.projectId === p.id).reduce((s, t) => s + t.hours, 0);
      return [p.id, p.name, p.category, p.status, p.startDate, p.endDate, hrs];
    });
    downloadCSV("hr_projects.csv", toCSV(headers, rows));
    showToast("Projects exported as CSV");
  }

  function exportTimeLogs() {
    const headers = ["id","employee_name","project_name","date","hours","description","status","approved_by"];
    const rows = data.timeLogs.map(t => [
      t.id,
      data.resources.find(r => r.id === t.resourceId)?.name || "",
      data.projects.find(p => p.id === t.projectId)?.name || "",
      t.date, t.hours, t.description, t.status,
      t.approverId ? data.resources.find(r => r.id === t.approverId)?.name || "" : ""
    ]);
    downloadCSV("hr_timelogs.csv", toCSV(headers, rows));
    showToast("Time logs exported as CSV");
  }

  function exportFullReport() {
    const headers = ["employee","role","project","category","date","hours","description","status","approved_by"];
    const rows = data.timeLogs.map(t => [
      data.resources.find(r => r.id === t.resourceId)?.name || "",
      data.resources.find(r => r.id === t.resourceId)?.role || "",
      data.projects.find(p => p.id === t.projectId)?.name || "",
      data.projects.find(p => p.id === t.projectId)?.category || "",
      t.date, t.hours, t.description, t.status,
      t.approverId ? data.resources.find(r => r.id === t.approverId)?.name || "" : ""
    ]);
    downloadCSV("hr_full_report.csv", toCSV(headers, rows));
    showToast("Full report exported as CSV");
  }

  // ── Template downloads ────────────────────────
  function downloadTemplate(type) {
    const templates = {
      resources: toCSV(
        ["name","role","email","is_manager","manager_name"],
        [["Jane Doe","HR Business Partner","jane@company.com","No","Sridhar Atyam"],
         ["John Smith","HR Manager","john@company.com","Yes",""]]
      ),
      projects: toCSV(
        ["name","category","status","start_date","end_date"],
        [["HRIS Upgrade","Technology","Active","2024-01-01","2024-12-31"],
         ["Onboarding Redesign","Operations","Active","2024-03-01","2024-09-30"]]
      ),
      timelogs: toCSV(
        ["employee_name","project_name","date","hours","description"],
        [["Jane Doe","HRIS Upgrade","2024-12-02","3","Requirements gathering"],
         ["John Smith","Onboarding Redesign","2024-12-03","4","Process mapping session"]]
      ),
    };
    downloadCSV(`template_${type}.csv`, templates[type]);
    showToast(`${type} template downloaded`);
  }

  // ── File handler ─────────────────────────────
  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv","xlsx","xls"].includes(ext)) return showToast("Please upload a CSV or Excel file (.csv, .xlsx, .xls)", "error");
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);
        if (rows.length === 0) return showToast("No data found in file", "error");
        setPreview({ rows, file: file.name, type: uploadType });
      } catch (err) {
        showToast("Error parsing file — please use the template format", "error");
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ── Import processor ─────────────────────────
  function confirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      if (preview.type === "resources") {
        const newResources = preview.rows.map(row => {
          const existing = data.resources.find(r => r.name.toLowerCase() === (row.name||"").toLowerCase());
          const mgr = data.resources.find(r => r.name.toLowerCase() === (row.manager_name||"").toLowerCase());
          return {
            id: existing?.id || uid(),
            name: row.name || "Unknown",
            role: row.role || "",
            email: row.email || "",
            isManager: (row.is_manager||"").toLowerCase() === "yes",
            managerId: mgr?.id || null,
          };
        }).filter(r => r.name !== "Unknown");
        updateData(prev => {
          const merged = [...prev.resources];
          newResources.forEach(nr => {
            const idx = merged.findIndex(r => r.id === nr.id);
            if (idx >= 0) merged[idx] = nr; else merged.push(nr);
          });
          return { ...prev, resources: merged };
        });
        showToast(`${newResources.length} resources imported successfully`);
      }

      if (preview.type === "projects") {
        const newProjects = preview.rows.map(row => {
          const existing = data.projects.find(p => p.name.toLowerCase() === (row.name||"").toLowerCase());
          return {
            id: existing?.id || uid(),
            name: row.name || "Untitled",
            category: row.category || "General",
            status: row.status || "Active",
            startDate: row.start_date || "",
            endDate: row.end_date || "",
          };
        });
        updateData(prev => {
          const merged = [...prev.projects];
          newProjects.forEach(np => {
            const idx = merged.findIndex(p => p.id === np.id);
            if (idx >= 0) merged[idx] = np; else merged.push(np);
          });
          return { ...prev, projects: merged };
        });
        showToast(`${newProjects.length} projects imported successfully`);
      }

      if (preview.type === "timelogs") {
        const newLogs = preview.rows.map(row => {
          const emp = data.resources.find(r => r.name.toLowerCase() === (row.employee_name||"").toLowerCase());
          const proj = data.projects.find(p => p.name.toLowerCase() === (row.project_name||"").toLowerCase());
          if (!emp || !proj) return null;
          return {
            id: uid(),
            resourceId: emp.id,
            projectId: proj.id,
            date: row.date || new Date().toISOString().split("T")[0],
            hours: parseFloat(row.hours) || 0,
            description: row.description || "",
            status: "Pending",
            approverId: null,
          };
        }).filter(Boolean);
        updateData(prev => ({ ...prev, timeLogs: [...prev.timeLogs, ...newLogs] }));
        showToast(`${newLogs.length} time logs imported — set to Pending`);
      }
    } catch (err) {
      showToast("Import failed — check file format", "error");
    }
    setImporting(false);
    setPreview(null);
  }

  const TYPES = [
    { id: "resources", label: "Resources", icon: "👥", desc: "Employee names, roles, managers" },
    { id: "projects", label: "Projects", icon: "📁", desc: "Project name, category, dates" },
    { id: "timelogs", label: "Time Logs", icon: "⏱️", desc: "Employee hours per project per day" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="section-title">Import / Export</div>
        <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Upload Excel/CSV files or download data exports</div>
      </div>

      {/* EXPORT SECTION */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 18 }}>📤 Export Data</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "Resources", fn: exportResources, icon: "👥", sub: `${data.resources.length} records` },
            { label: "Projects", fn: exportProjects, icon: "📁", sub: `${data.projects.length} records` },
            { label: "Time Logs", fn: exportTimeLogs, icon: "⏱️", sub: `${data.timeLogs.length} entries` },
            { label: "Full Report", fn: exportFullReport, icon: "📊", sub: "All data combined" },
          ].map(e => (
            <button key={e.label} onClick={e.fn} style={{ background: "#0F1117", border: "1px solid #2A2D3E", borderRadius: 12, padding: "16px 14px", cursor: "pointer", textAlign: "left", transition: "all .2s", color: "#E2E8F0" }}
              onMouseEnter={ev => { ev.currentTarget.style.borderColor = "#EF6461"; ev.currentTarget.style.background = "rgba(239,100,97,.05)"; }}
              onMouseLeave={ev => { ev.currentTarget.style.borderColor = "#2A2D3E"; ev.currentTarget.style.background = "#0F1117"; }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{e.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#F1F5F9" }}>{e.label}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{e.sub}</div>
              <div style={{ marginTop: 10, fontSize: 11, color: "#EF6461", fontWeight: 600 }}>↓ Download CSV</div>
            </button>
          ))}
        </div>
      </div>

      {/* IMPORT SECTION */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 18 }}>📥 Import Data</div>

        {/* Type selector */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => { setUploadType(t.id); setPreview(null); }}
              style={{ flex: 1, background: uploadType === t.id ? "linear-gradient(135deg,rgba(239,100,97,.18),rgba(217,79,76,.08))" : "#0F1117", border: `1.5px solid ${uploadType === t.id ? "#EF6461" : "#2A2D3E"}`, borderRadius: 10, padding: "14px 12px", cursor: "pointer", textAlign: "left", color: uploadType === t.id ? "#EF6461" : "#64748B", transition: "all .2s" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: "#475569" }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Template download */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "rgba(96,165,250,.06)", border: "1px solid rgba(96,165,250,.2)", borderRadius: 8 }}>
          <span style={{ fontSize: 13, color: "#60A5FA" }}>💡 First time?</span>
          <span style={{ fontSize: 13, color: "#64748B" }}>Download the template to see the required format.</span>
          <button className="btn-ghost" style={{ marginLeft: "auto", fontSize: 12, padding: "6px 14px", color: "#60A5FA", borderColor: "rgba(96,165,250,.3)" }} onClick={() => downloadTemplate(uploadType)}>
            ↓ Download {TYPES.find(t => t.id === uploadType)?.label} Template
          </button>
        </div>

        {/* Drop zone */}
        {!preview && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{ border: `2px dashed ${dragOver ? "#EF6461" : "#2A2D3E"}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", background: dragOver ? "rgba(239,100,97,.04)" : "#0F1117", transition: "all .2s", cursor: "pointer" }}
            onClick={() => document.getElementById("excel-upload").click()}>
            <input id="excel-upload" type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            <div style={{ fontSize: 44, marginBottom: 12 }}>📂</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#F1F5F9", marginBottom: 6 }}>
              Drop your file here or <span style={{ color: "#EF6461" }}>click to browse</span>
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>Supports .CSV, .XLSX, .XLS files</div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#334155" }}>
              Currently importing: <strong style={{ color: "#EF6461" }}>{TYPES.find(t => t.id === uploadType)?.label}</strong>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#34D399" }}>✓ File loaded: </span>
                <span style={{ fontSize: 13, color: "#94A3B8" }}>{preview.file}</span>
                <span style={{ fontSize: 12, color: "#475569", marginLeft: 10 }}>{preview.rows.length} rows detected</span>
              </div>
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setPreview(null)}>✕ Clear</button>
            </div>

            {/* Preview table */}
            <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #2A2D3E", borderRadius: 10, marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>{Object.keys(preview.rows[0]).map(k => <th key={k}>{k}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => <td key={j} style={{ fontSize: 12 }}>{String(v)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 10 && <div style={{ padding: "8px 14px", fontSize: 12, color: "#475569", borderTop: "1px solid #2A2D3E" }}>... and {preview.rows.length - 10} more rows</div>}
            </div>

            {/* Warnings */}
            {uploadType === "timelogs" && (
              <div style={{ padding: "10px 14px", background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 8, fontSize: 12, color: "#FBBf24", marginBottom: 14 }}>
                ⚠️ Employee names and Project names must exactly match existing records. Unmatched rows will be skipped.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
              <button className="btn-coral" onClick={confirmImport} disabled={importing}>
                {importing ? "Importing..." : `✓ Import ${preview.rows.length} rows`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── My Tasks (Employee view) ─────────────────
function MyTasks({ data, updateData, showToast, currentUser }) {
  const myTasks = (data.tasks || []).filter(t => t.assignedTo === currentUser.id);

  function markDone(id) {
    updateData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, status: "Done" } : t) }));
    showToast("Task marked as done");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="section-title">My Tasks</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Tasks assigned to you by your manager</div>
        </div>
        {myTasks.length > 0 && <button className="btn-ghost" style={{ fontSize: 12, color: "#34D399", borderColor: "rgba(52,211,153,.3)" }} onClick={() => {
          const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
          const headers = ["Task","Project","Assigned By","Due Date","Status"];
          const rows = myTasks.map(t => [
            t.title, data.projects.find(p=>p.id===t.projectId)?.name||"—",
            data.resources.find(r=>r.id===t.assignedBy)?.name||"",
            t.dueDate||"", t.status
          ]);
          const ws = makeSheet(headers, rows); ws["!cols"]=[{wch:36},{wch:28},{wch:20},{wch:13},{wch:12}];
          XLSX.utils.book_append_sheet(wb, ws, "My Tasks");
          XLSX.writeFile(wb, `My_Tasks_${new Date().toISOString().slice(0,10)}.xlsx`);
        }}>⬇ Export Tasks</button>}
      </div>
      {myTasks.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, color: "#475569" }}>No tasks assigned to you yet.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {myTasks.map(task => {
            const proj = data.projects.find(p => p.id === task.projectId);
            const mgr  = data.resources.find(r => r.id === task.assignedBy);
            return (
              <div key={task.id} className="card" style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#F1F5F9", fontSize: 14, marginBottom: 6 }}>{task.title}</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748B" }}>
                    <span>📁 {proj?.name || "—"}</span>
                    <span>👤 Assigned by {mgr?.name || "—"}</span>
                    <span>📅 Due {fmt(task.dueDate)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 16 }}>
                  <span className={`tag tag-${task.status === "Done" ? "done" : "open"}`}>{task.status}</span>
                  {task.status !== "Done" && (
                    <button className="btn-coral" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => markDone(task.id)}>✓ Mark Done</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Assign Task (Manager view) ───────────────
function AssignTask({ data, updateData, showToast, currentUser }) {
  const teamIds = data.resources.filter(r => r.managerId === currentUser.id).map(r => r.id);
  const teamMembers = data.resources.filter(r => teamIds.includes(r.id));
  const [form, setForm] = useState({ assignedTo: "", projectId: "", title: "", dueDate: "" });
  const allTasks = (data.tasks || []).filter(t => t.assignedBy === currentUser.id);

  function assign() {
    if (!form.assignedTo || !form.title) return showToast("Employee and task title are required", "error");
    const newTask = { id: uid(), assignedBy: currentUser.id, status: "Open", ...form };
    updateData(prev => ({ ...prev, tasks: [...(prev.tasks || []), newTask] }));
    setForm({ assignedTo: "", projectId: "", title: "", dueDate: "" });
    showToast("Task assigned successfully");
  }

  function deleteTask(id) {
    updateData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
    showToast("Task removed");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="section-title">Assign Tasks</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Assign tasks to your team members</div>
        </div>
        {allTasks.length > 0 && <button className="btn-ghost" style={{ fontSize: 12, color: "#34D399", borderColor: "rgba(52,211,153,.3)" }} onClick={() => {
          const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
          const headers = ["Task","Assigned To","Role","Project","Due Date","Status"];
          const rows = allTasks.map(t => {
            const emp = data.resources.find(r=>r.id===t.assignedTo);
            return [t.title, emp?.name||"", emp?.role||"", data.projects.find(p=>p.id===t.projectId)?.name||"—", t.dueDate||"", t.status];
          });
          const ws = makeSheet(headers, rows); ws["!cols"]=[{wch:36},{wch:22},{wch:24},{wch:28},{wch:13},{wch:12}];
          XLSX.utils.book_append_sheet(wb, ws, "Assigned Tasks");
          XLSX.writeFile(wb, `Assigned_Tasks_${new Date().toISOString().slice(0,10)}.xlsx`);
        }}>⬇ Export Tasks</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", marginBottom: 18, textTransform: "uppercase", letterSpacing: ".06em" }}>New Task</div>
          <div className="form-group">
            <label className="form-label">Assign To *</label>
            <select className="inp" value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}>
              <option value="">— Select team member —</option>
              {teamMembers.map(r => <option key={r.id} value={r.id}>{r.name} · {r.role}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="inp" value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}>
              <option value="">— Select project (optional) —</option>
              {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input className="inp" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Describe the task..." />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="inp" type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
          </div>
          <button className="btn-coral" style={{ width: "100%" }} onClick={assign}>Assign Task</button>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".06em" }}>Tasks Assigned by You</div>
          {allTasks.length === 0 && <div style={{ fontSize: 13, color: "#334155" }}>No tasks assigned yet.</div>}
          {allTasks.map(task => {
            const emp  = data.resources.find(r => r.id === task.assignedTo);
            const proj = data.projects.find(p => p.id === task.projectId);
            return (
              <div key={task.id} className="card" style={{ padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#F1F5F9", fontSize: 13 }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                      → {emp?.name} {proj ? `· ${proj.name}` : ""} {task.dueDate ? `· Due ${fmt(task.dueDate)}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`tag tag-${task.status === "Done" ? "done" : "open"}`}>{task.status}</span>
                    <button style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }} onClick={() => deleteTask(task.id)} title="Remove task">✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Password Management (HR Admin) ───────────
function PasswordMgmt({ data, updateData, showToast }) {
  const [resets, setResets] = useState({});   // { resourceId: tempPassword }

  function resetPassword(user) {
    const tempPw = genTempPassword();
    updateData(prev => ({
      ...prev,
      resources: prev.resources.map(r => r.id === user.id
        ? { ...r, password: tempPw, mustChangePassword: true }
        : r
      ),
      passwordResets: [...(prev.passwordResets || []), {
        id: uid(), resourceId: user.id,
        tempPassword: tempPw, createdAt: new Date().toISOString(), used: false
      }]
    }));
    setResets(prev => ({ ...prev, [user.id]: tempPw }));
    showToast(`Password reset for ${user.name}. Temp: ${tempPw}`);
  }

  function sendEmail(user, tempPw) {
    // In production this would call an email API
    // Here we simulate it with a mailto link
    const subject = encodeURIComponent("HR TimeTrack — Your Temporary Password");
    const body = encodeURIComponent(
      `Dear ${user.name},\n\nYour HR TimeTrack account password has been reset.\n\nEmployee ID (Username): ${user.id}\nTemporary Password: ${tempPw}\n\nPlease log in and change your password immediately.\n\nRegards,\nHR Admin`
    );
    window.open(`mailto:${user.email}?subject=${subject}&body=${body}`);
    showToast(`Email draft opened for ${user.name}`);
  }

  const resetHistory = (data.passwordResets || []).slice().reverse().slice(0, 10);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="section-title">Password Management</div>
        <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Reset employee passwords and send temporary credentials</div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr><th>Employee</th><th>ID (Username)</th><th>Email</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data.resources.filter(r => !r.isHR || r.id !== data.resources.find(x => x.isHR)?.id).map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${stringToColor(r.name)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                      {r.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#F1F5F9", fontSize: 13 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{r.role}</div>
                    </div>
                  </div>
                </td>
                <td><span style={{ fontFamily: "monospace", fontSize: 13, color: "#60A5FA" }}>{r.id}</span></td>
                <td style={{ fontSize: 12, color: "#64748B" }}>{r.email}</td>
                <td>
                  {r.mustChangePassword
                    ? <span className="tag tag-pending">Must Change Password</span>
                    : <span className="tag tag-approved">Active</span>}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn-coral" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => resetPassword(r)}>
                      🔄 Reset Password
                    </button>
                    {resets[r.id] && (
                      <>
                        <span style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(251,191,36,.1)", color: "#FBBf24", padding: "4px 10px", borderRadius: 6 }}>
                          {resets[r.id]}
                        </span>
                        <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 12px", color: "#60A5FA", borderColor: "rgba(96,165,250,.3)" }} onClick={() => sendEmail(r, resets[r.id])}>
                          ✉ Send Email
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetHistory.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".06em" }}>Recent Reset History</div>
          <table>
            <thead><tr><th>Employee</th><th>Temp Password</th><th>Reset At</th><th>Status</th></tr></thead>
            <tbody>
              {resetHistory.map(reset => {
                const emp = data.resources.find(r => r.id === reset.resourceId);
                return (
                  <tr key={reset.id}>
                    <td style={{ fontWeight: 500, color: "#F1F5F9" }}>{emp?.name || reset.resourceId}</td>
                    <td><span style={{ fontFamily: "monospace", fontSize: 12, color: "#FBBf24" }}>{reset.tempPassword}</span></td>
                    <td style={{ fontSize: 12, color: "#64748B" }}>{new Date(reset.createdAt).toLocaleString("en-IN")}</td>
                    <td><span className={`tag ${reset.used ? "tag-approved" : "tag-pending"}`}>{reset.used ? "Used" : "Pending Use"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Util: string → gradient colors ───────────────────────
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    "#EF6461,#D94F4C", "#60A5FA,#3B82F6", "#34D399,#059669",
    "#F59E0B,#D97706", "#A78BFA,#7C3AED", "#FB7185,#E11D48",
    "#38BDF8,#0284C7", "#4ADE80,#16A34A",
  ];
  return colors[Math.abs(hash) % colors.length];
}
