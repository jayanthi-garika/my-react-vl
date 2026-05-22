import { useState, useEffect } from "react";

// ── Seed Data ─────────────────────────────────────────
const SEED = {
  resources: [
    { id: "R1001", name: "Sridhar Atyam",  role: "Senior HR Manager",       managerId: null,    isManager: true,  isHR: true,  email: "sridhar@company.com", password: "R1001", mustChangePassword: false },
    { id: "R1002", name: "Priya Nair",      role: "HR Business Partner",     managerId: "R1001", isManager: false, isHR: false, email: "priya@company.com",   password: "R1002", mustChangePassword: true },
    { id: "R1003", name: "Arjun Mehta",     role: "Talent Acquisition Lead", managerId: "R1001", isManager: true,  isHR: false, email: "arjun@company.com",   password: "R1003", mustChangePassword: true },
    { id: "R1004", name: "Kavitha Rao",     role: "HR Operations Analyst",   managerId: "R1003", isManager: false, isHR: false, email: "kavitha@company.com", password: "R1004", mustChangePassword: true },
    { id: "R1005", name: "Rajan Suresh",    role: "L&D Specialist",          managerId: "R1003", isManager: false, isHR: false, email: "rajan@company.com",   password: "R1005", mustChangePassword: true },
  ],
  projects: [
    { id: "p1", name: "HRMS Digitization Initiative",  category: "Technology",         status: "Active", startDate: "2024-01-01", endDate: "2024-12-31" },
    { id: "p2", name: "TA Process Implementation",     category: "Talent Acquisition", status: "Active", startDate: "2024-03-01", endDate: "2024-09-30" },
    { id: "p3", name: "360° Performance Management",   category: "Performance",        status: "Active", startDate: "2024-04-01", endDate: "2024-10-31" },
    { id: "p4", name: "Employee Engagement Program",   category: "Engagement",         status: "Active", startDate: "2024-01-01", endDate: "2024-12-31" },
    { id: "p5", name: "L&D Framework Rollout",         category: "Learning",           status: "Active", startDate: "2024-06-01", endDate: "2025-03-31" },
  ],
  timeLogs: [
    { id: "t1",  resourceId: "R1002", projectId: "p1", date: "2024-12-02", hours: 3, description: "Requirements gathering with IT team",   status: "Approved", approverId: "R1001" },
    { id: "t2",  resourceId: "R1002", projectId: "p3", date: "2024-12-02", hours: 2, description: "Designed appraisal forms",              status: "Approved", approverId: "R1001" },
    { id: "t3",  resourceId: "R1003", projectId: "p2", date: "2024-12-02", hours: 4, description: "Campus drive coordination",             status: "Pending",  approverId: null },
    { id: "t4",  resourceId: "R1004", projectId: "p1", date: "2024-12-03", hours: 5, description: "Data migration testing",               status: "Pending",  approverId: null },
    { id: "t5",  resourceId: "R1005", projectId: "p5", date: "2024-12-03", hours: 3, description: "LMS content development",              status: "Approved", approverId: "R1001" },
    { id: "t6",  resourceId: "R1002", projectId: "p4", date: "2024-12-03", hours: 2, description: "Engagement survey design",             status: "Approved", approverId: "R1001" },
    { id: "t7",  resourceId: "R1003", projectId: "p2", date: "2024-12-04", hours: 6, description: "Interview scheduling and coordination",status: "Approved", approverId: "R1001" },
    { id: "t8",  resourceId: "R1004", projectId: "p1", date: "2024-12-04", hours: 4, description: "HRMS configuration and testing",       status: "Pending",  approverId: null },
    { id: "t9",  resourceId: "R1005", projectId: "p5", date: "2024-12-05", hours: 5, description: "Training calendar preparation",        status: "Approved", approverId: "R1001" },
    { id: "t10", resourceId: "R1002", projectId: "p3", date: "2024-12-05", hours: 3, description: "360 feedback questionnaire design",    status: "Approved", approverId: "R1001" },
  ],
  tasks: [
    { id: "tk1", assignedTo: "R1002", assignedBy: "R1001", projectId: "p1", title: "Complete HRMS UAT checklist",   dueDate: "2024-12-20", status: "Open" },
    { id: "tk2", assignedTo: "R1004", assignedBy: "R1003", projectId: "p1", title: "Prepare data migration report", dueDate: "2024-12-18", status: "Open" },
  ],
  passwordResets: [],
  resourceMovements: [],
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
  const monday = new Date(new Date(dateStr).setDate(diff));
  return monday.toISOString().split("T")[0];
}
function isoMonth(dateStr)   { return dateStr ? dateStr.slice(0, 7) : ""; }
function isoQuarter(dateStr) {
  if (!dateStr) return "";
  const m = parseInt(dateStr.slice(5, 7));
  return `${dateStr.slice(0,4)}-Q${Math.ceil(m/3)}`;
}
function isoYear(dateStr)    { return dateStr ? dateStr.slice(0, 4) : ""; }
function genTempPassword()   { return "TMP" + Math.random().toString(36).slice(2, 8).toUpperCase(); }

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    "#EF6461,#D94F4C","#60A5FA,#3B82F6","#34D399,#059669",
    "#F59E0B,#D97706","#A78BFA,#7C3AED","#FB7185,#E11D48",
    "#38BDF8,#0284C7","#4ADE80,#16A34A",
  ];
  return colors[Math.abs(hash) % colors.length];
}

const CATEGORIES = ["Technology","Talent Acquisition","Performance","Engagement","Learning","Operations","Compliance","General"];
const STATUSES   = ["Active","On Hold","Completed","Cancelled"];

// ── CSV export helpers ────────────────────────────────
function toCSV(headers, rows) {
  const escape = v => { const s = v == null ? "" : String(v); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s; };
  return [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
}
function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase().replace(/\s+/g,"_"));
  return lines.slice(1).map(line => {
    const vals = []; let cur = "", inQ = false;
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

// ── CSS ───────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #1A1D27; }
  ::-webkit-scrollbar-thumb { background: #EF6461; border-radius: 10px; }
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
  .modal-overlay { position:absolute; inset:0; background:rgba(0,0,0,.75); z-index:100; display:flex; align-items:flex-start; justify-content:center; padding-top:80px; }
  .modal { background:#1A1D27; border:1px solid #2A2D3E; border-radius:18px; padding:28px; width:480px; max-width:95vw; max-height:90vh; overflow-y:auto; }
  .form-group { margin-bottom:16px; }
  .form-label { display:block; font-size:12px; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
  .section-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:700; color:#F1F5F9; }
  .divider { height:1px; background:#2A2D3E; margin:20px 0; }
  .nav-group-label { font-size:10px; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:.1em; padding:10px 8px 4px; margin-top:8px; }
`;

// ══════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════
function LoginScreen({ data, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  function handleLogin() {
    setError("");
    const uname = username.trim();
    const pwd   = password.trim();
    if (!uname || !pwd) { setError("Please enter your Employee ID and password."); return; }
    const user = data.resources.find(r => r.id.toUpperCase() === uname.toUpperCase());
    if (!user) { setError(`Employee ID "${uname}" not found.`); return; }
    if (user.password !== pwd && user.password.toUpperCase() !== pwd.toUpperCase()) {
      setError("Incorrect password. Default password is your Employee ID (e.g. R1001)."); return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(user); }, 400);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0F1117", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width:420, padding:"0 20px" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:56, height:56, background:"linear-gradient(135deg,#EF6461,#D94F4C)", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 16px" }}>⏱</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:"#F1F5F9" }}>HR TimeTrack</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Project Time Management System</div>
        </div>

        <div style={{ background:"#1A1D27", border:"1px solid #2A2D3E", borderRadius:18, padding:"32px 30px" }}>
          <div style={{ fontSize:17, fontWeight:700, color:"#F1F5F9", marginBottom:6 }}>Sign In</div>
          <div style={{ fontSize:12, color:"#475569", marginBottom:24 }}>Use your Employee ID as username and default password</div>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Employee ID</label>
            <input style={{ width:"100%", background:"#0F1117", border:"1px solid #2A2D3E", borderRadius:8, padding:"10px 14px", color:"#E2E8F0", fontSize:14, outline:"none", boxSizing:"border-box", transition:"border .2s" }}
              placeholder="e.g. R1002" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              onFocus={e=>e.target.style.borderColor="#EF6461"} onBlur={e=>e.target.style.borderColor="#2A2D3E"} />
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Password</label>
            <input type="password" style={{ width:"100%", background:"#0F1117", border:"1px solid #2A2D3E", borderRadius:8, padding:"10px 14px", color:"#E2E8F0", fontSize:14, outline:"none", boxSizing:"border-box", transition:"border .2s" }}
              placeholder="Enter password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              onFocus={e=>e.target.style.borderColor="#EF6461"} onBlur={e=>e.target.style.borderColor="#2A2D3E"} />
          </div>

          {error && <div style={{ background:"rgba(239,100,97,.1)", border:"1px solid rgba(239,100,97,.3)", borderRadius:8, padding:"9px 14px", fontSize:13, color:"#EF6461", marginBottom:16 }}>⚠ {error}</div>}

          <button onClick={handleLogin} disabled={loading}
            style={{ width:"100%", background:"linear-gradient(135deg,#EF6461,#D94F4C)", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:15, fontWeight:700, cursor:"pointer", opacity:loading?0.7:1 }}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          <div style={{ marginTop:20, padding:"14px", background:"#0F1117", borderRadius:8, border:"1px solid #2A2D3E" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Quick Login — Click to fill</div>
            {[{id:"R1001",label:"Sridhar Atyam",note:"HR Admin + Manager"},{id:"R1003",label:"Arjun Mehta",note:"Manager only"},{id:"R1002",label:"Priya Nair",note:"Employee"},{id:"R1004",label:"Kavitha Rao",note:"Employee"}].map(u=>(
              <div key={u.id} onClick={()=>{setUsername(u.id);setPassword(u.id);setError("");}}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 8px", cursor:"pointer", borderBottom:"1px solid #1E2130", borderRadius:6 }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(239,100,97,.07)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <span style={{ fontSize:12, color:"#60A5FA", fontFamily:"monospace", fontWeight:700 }}>{u.id}</span>
                  <span style={{ fontSize:12, color:"#94A3B8", marginLeft:8 }}>{u.label}</span>
                </div>
                <span style={{ fontSize:11, color:"#475569" }}>{u.note}</span>
              </div>
            ))}
            <div style={{ fontSize:11, color:"#334155", marginTop:8, textAlign:"center" }}>Password = Employee ID for first login</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// CHANGE PASSWORD SCREEN
// ══════════════════════════════════════════════
function ChangePasswordScreen({ user, updateData, showToast, onDone }) {
  const [newPw, setNewPw]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");

  function save() {
    if (newPw.length < 6)  { setError("Password must be at least 6 characters."); return; }
    if (newPw === user.id) { setError("New password cannot be the same as your Employee ID."); return; }
    if (newPw !== confirm)  { setError("Passwords do not match."); return; }
    updateData(prev => ({ ...prev, resources: prev.resources.map(r => r.id === user.id ? {...r, password:newPw, mustChangePassword:false} : r) }));
    showToast("Password changed successfully!");
    onDone({ ...user, password: newPw, mustChangePassword: false });
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0F1117", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width:420, padding:"0 20px" }}>
        <div style={{ background:"#1A1D27", border:"1px solid #EF6461", borderRadius:18, padding:"32px 30px" }}>
          <div style={{ fontSize:28, marginBottom:12 }}>🔐</div>
          <div style={{ fontSize:17, fontWeight:700, color:"#F1F5F9", marginBottom:6 }}>Set New Password</div>
          <div style={{ fontSize:13, color:"#FBBf24", marginBottom:24 }}>Welcome, {user.name}! Please set a new password before continuing.</div>
          {["New Password","Confirm Password"].map((label,i)=>(
            <div key={label} style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{label}</label>
              <input type="password" style={{ width:"100%", background:"#0F1117", border:"1px solid #2A2D3E", borderRadius:8, padding:"10px 14px", color:"#E2E8F0", fontSize:14, outline:"none", boxSizing:"border-box" }}
                value={i===0?newPw:confirm} onChange={e=>i===0?setNewPw(e.target.value):setConfirm(e.target.value)}
                placeholder={i===0?"Min. 6 characters":"Re-enter new password"} />
            </div>
          ))}
          {error && <div style={{ background:"rgba(239,100,97,.1)", border:"1px solid rgba(239,100,97,.3)", borderRadius:8, padding:"9px 14px", fontSize:13, color:"#EF6461", marginBottom:16 }}>⚠ {error}</div>}
          <button onClick={save} style={{ width:"100%", background:"linear-gradient(135deg,#EF6461,#D94F4C)", color:"#fff", border:"none", borderRadius:10, padding:"12px", fontSize:15, fontWeight:700, cursor:"pointer" }}>
            Set Password & Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// HR DASHBOARD
// ══════════════════════════════════════════════
function HRDashboard({ data }) {
  const totalHours     = data.timeLogs.reduce((s,t)=>s+t.hours,0);
  const pending        = data.timeLogs.filter(t=>t.status==="Pending").length;
  const activeProjects = data.projects.filter(p=>p.status==="Active").length;
  const projectHours   = data.projects.map(p=>({
    ...p,
    hours:   data.timeLogs.filter(t=>t.projectId===p.id).reduce((s,t)=>s+t.hours,0),
    members: [...new Set(data.timeLogs.filter(t=>t.projectId===p.id).map(t=>t.resourceId))].length,
  }));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div className="section-title">HR Dashboard</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Overview of all HR projects and team time</div>
        </div>
        <button className="btn-coral" onClick={()=>{
          const headers=["Project","Category","Status","Total Hours","Team Members"];
          const rows=projectHours.map(p=>[p.name,p.category,p.status,p.hours,p.members]);
          downloadCSV(`HR_Dashboard_${new Date().toISOString().slice(0,10)}.csv`,toCSV(headers,rows));
        }}>⬇ Export Dashboard</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
        {[{label:"Total Resources",value:data.resources.length,icon:"👥",color:"#60A5FA"},{label:"Active Projects",value:activeProjects,icon:"📁",color:"#34D399"},{label:"Total Hours Logged",value:totalHours+"h",icon:"⏱️",color:"#EF6461"},{label:"Pending Approvals",value:pending,icon:"⏳",color:"#FBBf24"}].map(s=>(
          <div key={s.label} className="stat-card">
            <div style={{ fontSize:24, marginBottom:10 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:"#475569", marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding:22 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#94A3B8", marginBottom:16, textTransform:"uppercase", letterSpacing:".06em" }}>Project Summary</div>
        <table>
          <thead><tr><th>Project</th><th>Category</th><th>Status</th><th>Total Hours</th><th>Team Members</th></tr></thead>
          <tbody>
            {projectHours.map(p=>(
              <tr key={p.id}>
                <td style={{ fontWeight:600, color:"#F1F5F9" }}>{p.name}</td>
                <td><span style={{ fontSize:12, color:"#94A3B8" }}>{p.category}</span></td>
                <td><span className="tag tag-active">{p.status}</span></td>
                <td style={{ color:"#EF6461", fontWeight:700 }}>{p.hours}h</td>
                <td>{p.members}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── System role helpers ───────────────────────
const SYSTEM_ROLES = ["HR Admin","Manager","Employee"];
function systemRoleFromResource(r) {
  if (r.isHR)      return "HR Admin";
  if (r.isManager) return "Manager";
  return "Employee";
}
function systemRoleToFlags(sysRole) {
  return { isHR: sysRole==="HR Admin", isManager: sysRole==="Manager" || sysRole==="HR Admin" };
}
const SYSTEM_ROLE_COLORS = { "HR Admin":"tag-active", "Manager":"tag-open", "Employee":"" };

// ══════════════════════════════════════════════
// RESOURCES PANEL
// ══════════════════════════════════════════════
function ResourcesPanel({ data, updateData, showToast }) {
  const BLANK = { name:"", jobRole:"", managerId:"", email:"", systemRole:"Employee" };
  const [showModal, setShowModal] = useState(false);   // "add" | "edit" | false
  const [editTarget, setEditTarget] = useState(null);  // resource being edited
  const [form, setForm]  = useState(BLANK);

  // ── open add modal ──────────────────────────
  function openAdd() { setForm(BLANK); setEditTarget(null); setShowModal("add"); }

  // ── open edit modal ─────────────────────────
  function openEdit(r) {
    setForm({ name:r.name, jobRole:r.role, managerId:r.managerId||"", email:r.email||"", systemRole:systemRoleFromResource(r) });
    setEditTarget(r);
    setShowModal("edit");
  }

  // ── save new resource ───────────────────────
  function saveAdd() {
    if (!form.name.trim())    return showToast("Name is required","error");
    if (!form.jobRole.trim()) return showToast("Job role / designation is required","error");
    const flags = systemRoleToFlags(form.systemRole);
    const newR = {
      id: uid(), name: form.name.trim(), role: form.jobRole.trim(),
      managerId: form.managerId||null, email: form.email.trim(),
      ...flags, password: uid().slice(0,6).toUpperCase(), mustChangePassword: true,
    };
    updateData(prev=>({...prev, resources:[...prev.resources, newR]}));
    setShowModal(false);
    showToast(`${newR.name} added as ${form.systemRole}`);
  }

  // ── save edited resource ────────────────────
  function saveEdit() {
    if (!form.name.trim())    return showToast("Name is required","error");
    if (!form.jobRole.trim()) return showToast("Job role / designation is required","error");
    const flags = systemRoleToFlags(form.systemRole);
    updateData(prev=>({ ...prev, resources: prev.resources.map(r =>
      r.id===editTarget.id
        ? { ...r, name:form.name.trim(), role:form.jobRole.trim(), managerId:form.managerId||null, email:form.email.trim(), ...flags }
        : r
    )}));
    setShowModal(false);
    showToast(`${form.name} updated — System role: ${form.systemRole}`);
  }

  // ── remove ──────────────────────────────────
  function remove(id) {
    updateData(prev=>({...prev, resources:prev.resources.filter(r=>r.id!==id)}));
    showToast("Resource removed");
  }

  // ── export ──────────────────────────────────
  function doExport() {
    const XLSX = window.XLSX;
    if (XLSX) {
      const wb = XLSX.utils.book_new();
      const headers=["Employee ID","Name","Job Role / Designation","System Role","Email","Reports To (Name)","Reports To (ID)"];
      const rows=data.resources.map(r=>[
        r.id, r.name, r.role, systemRoleFromResource(r), r.email||"",
        data.resources.find(x=>x.id===r.managerId)?.name||"",
        r.managerId||""
      ]);
      const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
      ws["!cols"]=[{wch:12},{wch:22},{wch:28},{wch:12},{wch:28},{wch:22},{wch:12}];
      headers.forEach((_,i)=>{const c=ws[XLSX.utils.encode_cell({r:0,c:i})];if(c)c.s={font:{bold:true,color:{rgb:"FFFFFF"}},fill:{fgColor:{rgb:"2B2D42"}}};});
      XLSX.utils.book_append_sheet(wb,ws,"Resources");
      // Template sheet
      const tHeaders=["name","job_role","system_role","email","manager_name"];
      const tRows=[
        ["Priya Nair","HR Business Partner","Employee","priya@company.com","Sridhar Atyam"],
        ["Arjun Mehta","Talent Acquisition Lead","Manager","arjun@company.com","Sridhar Atyam"],
        ["Admin User","Senior HR Manager","HR Admin","admin@company.com",""],
      ];
      const twsNote=XLSX.utils.aoa_to_sheet([
        ["Column","Allowed Values / Notes"],
        ["name","Full name (required)"],
        ["job_role","Designation / title (required)"],
        ["system_role","Employee  |  Manager  |  HR Admin  (default: Employee)"],
        ["email","Email address"],
        ["manager_name","Must match an existing employee name exactly"],
        ["",""],
        ...([tHeaders,...tRows])
      ]);
      twsNote["!cols"]=[{wch:16},{wch:50}];
      XLSX.utils.book_append_sheet(wb,twsNote,"Import Template");
      XLSX.writeFile(wb,`HR_Resources_${new Date().toISOString().slice(0,10)}.xlsx`);
      showToast("Exported as Excel with import template");
    } else {
      const headers=["Employee ID","Name","Job Role / Designation","System Role","Email","Manager"];
      const rows=data.resources.map(r=>[r.id,r.name,r.role,systemRoleFromResource(r),r.email||"",data.resources.find(x=>x.id===r.managerId)?.name||""]);
      downloadCSV("hr_resources.csv",toCSV(headers,rows));
      showToast("Exported as CSV");
    }
  }

  // ── shared modal form body ──────────────────
  function ModalForm({ isEdit }) {
    return (
      <>
        <div style={{ fontSize:17, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"#F1F5F9", marginBottom:4 }}>
          {isEdit ? "Edit Employee" : "Add New Employee"}
        </div>
        <div style={{ fontSize:12, color:"#475569", marginBottom:20 }}>
          {isEdit ? `Editing ${editTarget?.name}` : "Fill in details and assign a system role"}
        </div>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="inp" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Priya Nair" />
        </div>

        {/* Job Role / Designation */}
        <div className="form-group">
          <label className="form-label">Job Role / Designation *</label>
          <input className="inp" value={form.jobRole} onChange={e=>setForm(p=>({...p,jobRole:e.target.value}))} placeholder="e.g. HR Business Partner" />
          <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>This is the employee's job title / designation (e.g. Senior HR Manager)</div>
        </div>

        {/* System Role */}
        <div className="form-group">
          <label className="form-label">System Role *</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {SYSTEM_ROLES.map(sr=>{
              const active = form.systemRole===sr;
              const colors = { "HR Admin":"#60A5FA","Manager":"#A78BFA","Employee":"#94A3B8" };
              const bgs    = { "HR Admin":"rgba(96,165,250,.12)","Manager":"rgba(167,139,250,.12)","Employee":"rgba(148,163,184,.08)" };
              const descs  = { "HR Admin":"Full access — dashboards, reports, all settings","Manager":"Approve timesheets, assign tasks, view team","Employee":"Log hours, view own timesheets and tasks" };
              return (
                <div key={sr} onClick={()=>setForm(p=>({...p,systemRole:sr}))}
                  style={{ border:`2px solid ${active?colors[sr]:"#2A2D3E"}`, borderRadius:10, padding:"12px 10px", cursor:"pointer", background:active?bgs[sr]:"transparent", transition:"all .15s" }}>
                  <div style={{ fontWeight:700, fontSize:13, color:active?colors[sr]:"#64748B", marginBottom:4 }}>
                    {sr==="HR Admin"?"👑 ":sr==="Manager"?"🧑‍💼 ":"👤 "}{sr}
                  </div>
                  <div style={{ fontSize:10, color:active?colors[sr]:"#334155", lineHeight:1.4 }}>{descs[sr]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="inp" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="employee@company.com" />
        </div>

        {/* Reports To */}
        <div className="form-group">
          <label className="form-label">Reports To</label>
          <select className="inp" value={form.managerId} onChange={e=>setForm(p=>({...p,managerId:e.target.value}))}>
            <option value="">— No manager —</option>
            {data.resources.filter(r=>r.isManager && r.id!==(editTarget?.id)).map(r=><option key={r.id} value={r.id}>{r.name} ({systemRoleFromResource(r)})</option>)}
          </select>
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
          <button className="btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
          <button className="btn-coral" onClick={isEdit?saveEdit:saveAdd}>
            {isEdit?"Save Changes":"Add Employee"}
          </button>
        </div>
      </>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div className="section-title">HR Resources</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>{data.resources.length} team members</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn-ghost" style={{ fontSize:13 }} onClick={doExport}>⬇ Export Excel</button>
          <button className="btn-coral" onClick={openAdd}>+ Add Employee</button>
        </div>
      </div>

      {/* Role legend */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {[["👑 HR Admin","rgba(96,165,250,.12)","#60A5FA"],["🧑‍💼 Manager","rgba(167,139,250,.12)","#A78BFA"],["👤 Employee","rgba(148,163,184,.08)","#94A3B8"]].map(([label,bg,color])=>(
          <div key={label} style={{ fontSize:11, fontWeight:600, color, background:bg, padding:"4px 12px", borderRadius:20, border:`1px solid ${color}33` }}>{label}</div>
        ))}
        <div style={{ fontSize:11, color:"#334155", marginLeft:"auto", alignSelf:"center" }}>Click ✎ on any row to edit role</div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Employee</th><th>ID</th><th>Job Role / Designation</th><th>System Role</th><th>Reports To</th><th>Email</th><th style={{ textAlign:"center" }}>Actions</th></tr></thead>
          <tbody>
            {data.resources.map(r=>{
              const sysRole=systemRoleFromResource(r);
              const roleColor={"HR Admin":"#60A5FA","Manager":"#A78BFA","Employee":"#94A3B8"}[sysRole];
              const roleBg={"HR Admin":"rgba(96,165,250,.12)","Manager":"rgba(167,139,250,.12)","Employee":"rgba(148,163,184,.08)"}[sysRole];
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(r.name)})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{r.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                      <div>
                        <div style={{ fontWeight:600, color:"#F1F5F9", fontSize:13 }}>{r.name}</div>
                        <div style={{ fontSize:10, color:"#475569" }}>{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily:"monospace", fontSize:12, color:"#60A5FA" }}>{r.id}</span></td>
                  <td style={{ fontSize:12, color:"#94A3B8" }}>{r.role}</td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:700, color:roleColor, background:roleBg, padding:"4px 10px", borderRadius:12, border:`1px solid ${roleColor}33` }}>
                      {sysRole==="HR Admin"?"👑 ":sysRole==="Manager"?"🧑‍💼 ":"👤 "}{sysRole}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:"#64748B" }}>{data.resources.find(x=>x.id===r.managerId)?.name||"—"}</td>
                  <td style={{ fontSize:12, color:"#64748B" }}>{r.email||"—"}</td>
                  <td>
                    <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                      <button style={{ background:"rgba(96,165,250,.1)", border:"1px solid rgba(96,165,250,.2)", color:"#60A5FA", borderRadius:6, padding:"4px 10px", fontSize:12, cursor:"pointer", fontWeight:600 }} onClick={()=>openEdit(r)}>✎ Edit</button>
                      <button style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:14, padding:"4px 8px" }} onClick={()=>remove(r.id)} title="Remove">✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal&&(
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" style={{ width:540 }} onClick={e=>e.stopPropagation()}>
            <ModalForm isEdit={showModal==="edit"} />
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// PROJECTS PANEL
// ══════════════════════════════════════════════
function ProjectsPanel({ data, updateData, showToast }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ name:"", category:"", status:"Active", startDate:"", endDate:"", description:"", projectManager:"", budget:"" });

  function save() {
    if (!form.name || !form.category) return showToast("Name and category are required","error");
    updateData(prev=>({...prev, projects:[...prev.projects,{id:uid(),...form}]}));
    setShowModal(false); setForm({name:"",category:"",status:"Active",startDate:"",endDate:"",description:"",projectManager:"",budget:""});
    showToast("Project added");
  }
  function remove(id) {
    updateData(prev=>({...prev, projects:prev.projects.filter(p=>p.id!==id)}));
    showToast("Project removed");
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div className="section-title">Projects</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>{data.projects.length} projects</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn-ghost" style={{ fontSize:13 }} onClick={()=>{
            const headers=["Name","Category","Status","Start","End","Hours"];
            const rows=data.projects.map(p=>[p.name,p.category,p.status,p.startDate,p.endDate,data.timeLogs.filter(t=>t.projectId===p.id).reduce((s,t)=>s+t.hours,0)]);
            downloadCSV("hr_projects.csv",toCSV(headers,rows)); showToast("Exported");
          }}>⬇ Export</button>
          <button className="btn-coral" onClick={()=>setShowModal(true)}>+ Add Project</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>Project Name</th><th>Category</th><th>Status</th><th>Start</th><th>End</th><th>Hours</th><th></th></tr></thead>
          <tbody>
            {data.projects.map((p,i)=>{
              const hrs=data.timeLogs.filter(t=>t.projectId===p.id).reduce((s,t)=>s+t.hours,0);
              return (
                <tr key={p.id}>
                  <td style={{ color:"#334155", fontSize:12 }}>{i+1}</td>
                  <td>
                    <div style={{ fontWeight:600, color:"#F1F5F9", fontSize:13 }}>{p.name}</div>
                    {p.description&&<div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{p.description.slice(0,60)}</div>}
                  </td>
                  <td><span style={{ fontSize:11, background:"rgba(96,165,250,.1)", color:"#60A5FA", padding:"3px 9px", borderRadius:12 }}>{p.category}</span></td>
                  <td><span className="tag tag-active">{p.status}</span></td>
                  <td style={{ fontSize:12, color:"#64748B" }}>{fmt(p.startDate)}</td>
                  <td style={{ fontSize:12, color:"#64748B" }}>{fmt(p.endDate)}</td>
                  <td style={{ fontWeight:700, color:"#EF6461" }}>{hrs}h</td>
                  <td><button style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:14 }} onClick={()=>remove(p.id)}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showModal&&(
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:17, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"#F1F5F9", marginBottom:20 }}>Add New Project</div>
            <div className="form-group"><label className="form-label">Project Name *</label><input className="inp" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. HRMS Digitization Initiative" /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div className="form-group"><label className="form-label">Category *</label>
                <select className="inp" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="inp" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div className="form-group"><label className="form-label">Start Date *</label><input className="inp" type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">End Date *</label><input className="inp" type="date" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Project Manager</label><input className="inp" value={form.projectManager} onChange={e=>setForm(p=>({...p,projectManager:e.target.value}))} placeholder="Name of project manager" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="inp" rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Brief description..." style={{ resize:"vertical" }} /></div>
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
// EMPLOYEE DASHBOARD
// ══════════════════════════════════════════════
function EmployeeDashboard({ data, currentUser }) {
  const myLogs    = data.timeLogs.filter(t=>t.resourceId===currentUser.id);
  const totalH    = myLogs.reduce((s,t)=>s+t.hours,0);
  const pending   = myLogs.filter(t=>t.status==="Pending").length;
  const approved  = myLogs.filter(t=>t.status==="Approved").length;
  const recentLogs= [...myLogs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div className="section-title">My Dashboard</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Welcome, {currentUser.name}</div>
        </div>
        <button className="btn-coral" onClick={()=>{
          const headers=["Date","Project","Hours","Task / Activity","Status","Approved By"];
          const rows=[...myLogs].sort((a,b)=>b.date.localeCompare(a.date)).map(log=>[log.date,data.projects.find(p=>p.id===log.projectId)?.name||"",log.hours,log.description||"",log.status,log.approverId?data.resources.find(r=>r.id===log.approverId)?.name||"":""]);
          downloadCSV(`My_Timesheet_${new Date().toISOString().slice(0,10)}.csv`,toCSV(headers,rows)); 
        }}>⬇ Download My Report</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:28 }}>
        {[{label:"Total Hours Logged",value:totalH+"h",color:"#EF6461"},{label:"Pending Approval",value:pending,color:"#FBBf24"},{label:"Approved",value:approved,color:"#34D399"}].map(s=>(
          <div key={s.label} className="stat-card">
            <div style={{ fontSize:28, fontFamily:"'Syne',sans-serif", fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:"#475569", marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding:22 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:14, textTransform:"uppercase", letterSpacing:".06em" }}>Recent Time Logs</div>
        <table>
          <thead><tr><th>Date</th><th>Project</th><th>Hours</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>
            {recentLogs.map(log=>(
              <tr key={log.id}>
                <td style={{ fontSize:12 }}>{fmt(log.date)}</td>
                <td style={{ fontWeight:500, color:"#F1F5F9" }}>{data.projects.find(p=>p.id===log.projectId)?.name}</td>
                <td style={{ fontWeight:700, color:"#EF6461" }}>{log.hours}h</td>
                <td style={{ color:"#64748B", fontSize:12, maxWidth:200 }}>{log.description}</td>
                <td><span className={`tag tag-${log.status.toLowerCase()}`}>{log.status}</span></td>
              </tr>
            ))}
            {recentLogs.length===0&&<tr><td colSpan={5} style={{ textAlign:"center", color:"#334155" }}>No time logs yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// LOG HOURS
// ══════════════════════════════════════════════
function LogHours({ data, updateData, showToast, currentUser }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ projectId:"", date:today, hours:"", description:"" });

  function submit() {
    if (!form.projectId||!form.hours||!form.date) return showToast("Please fill all required fields","error");
    if (parseFloat(form.hours)<=0||parseFloat(form.hours)>24) return showToast("Hours must be between 0.5 and 24","error");
    const newLog = { id:uid(), resourceId:currentUser.id, projectId:form.projectId, date:form.date, hours:parseFloat(form.hours), description:form.description, status:"Pending", approverId:null };
    updateData(prev=>({...prev, timeLogs:[...prev.timeLogs,newLog]}));
    setForm({projectId:"",date:today,hours:"",description:""});
    showToast("Hours logged — pending manager approval");
  }

  const todayLogs   = data.timeLogs.filter(t=>t.resourceId===currentUser.id&&t.date===today);
  const todayHours  = todayLogs.reduce((s,t)=>s+t.hours,0);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div className="section-title">Log Hours</div>
        <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Record your time spent on HR projects</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        <div className="card" style={{ padding:26 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#94A3B8", marginBottom:20, textTransform:"uppercase", letterSpacing:".06em" }}>Time Entry</div>
          <div className="form-group">
            <label className="form-label">Project *</label>
            <select className="inp" value={form.projectId} onChange={e=>setForm(p=>({...p,projectId:e.target.value}))}>
              <option value="">Select a project</option>
              {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="form-group"><label className="form-label">Date *</label><input className="inp" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Hours *</label><input className="inp" type="number" min="0.5" max="24" step="0.5" value={form.hours} onChange={e=>setForm(p=>({...p,hours:e.target.value}))} placeholder="e.g. 2.5" /></div>
          </div>
          <div className="form-group"><label className="form-label">Description / Activities</label><textarea className="inp" rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="What did you work on?" style={{ resize:"vertical" }} /></div>
          <button className="btn-coral" style={{ width:"100%", padding:"12px" }} onClick={submit}>Submit for Approval</button>
        </div>
        <div>
          <div className="card" style={{ padding:22 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:14, textTransform:"uppercase", letterSpacing:".06em" }}>Today's Summary</div>
            <div style={{ fontSize:36, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#EF6461" }}>{todayHours}h</div>
            <div style={{ fontSize:12, color:"#475569" }}>logged today ({todayLogs.length} entries)</div>
            <div className="divider" />
            {todayLogs.length===0?(<div style={{ fontSize:13, color:"#334155", textAlign:"center", padding:"12px 0" }}>No entries for today yet</div>):
              todayLogs.map(log=>(
                <div key={log.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #1E2130" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:"#CBD5E1" }}>{data.projects.find(p=>p.id===log.projectId)?.name}</div>
                    <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{log.description}</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#EF6461" }}>{log.hours}h</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MY LOGS (TIMESHEETS)
// ══════════════════════════════════════════════
function MyLogs({ data, currentUser }) {
  const [filter, setFilter] = useState("all");
  const myLogs  = data.timeLogs.filter(t=>t.resourceId===currentUser.id);
  const filtered= filter==="all"?myLogs:myLogs.filter(t=>t.status===filter);
  const sorted  = [...filtered].sort((a,b)=>b.date.localeCompare(a.date));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div className="section-title">My Timesheets</div>
        <div style={{ display:"flex", gap:8 }}>
          {["all","Pending","Approved"].map(f=>(
            <button key={f} className={filter===f?"btn-coral":"btn-ghost"} style={{ padding:"7px 16px", fontSize:12 }} onClick={()=>setFilter(f)}>{f==="all"?"All":f}</button>
          ))}
          <button className="btn-ghost" style={{ fontSize:12, padding:"7px 14px", color:"#34D399", borderColor:"rgba(52,211,153,.3)" }} onClick={()=>{
            const headers=["Date","Project","Hours","Task / Activity","Status","Approved By"];
            const rows=sorted.map(log=>[log.date,data.projects.find(p=>p.id===log.projectId)?.name||"",log.hours,log.description||"",log.status,log.approverId?data.resources.find(r=>r.id===log.approverId)?.name||"":""]);
            downloadCSV(`My_Timesheet_${filter}_${new Date().toISOString().slice(0,10)}.csv`,toCSV(headers,rows));
          }}>⬇ Export</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Project</th><th>Hours</th><th>Description</th><th>Status</th><th>Approved By</th></tr></thead>
          <tbody>
            {sorted.map(log=>(
              <tr key={log.id}>
                <td style={{ fontSize:12 }}>{fmt(log.date)}</td>
                <td style={{ fontWeight:500, color:"#F1F5F9" }}>{data.projects.find(p=>p.id===log.projectId)?.name}</td>
                <td style={{ fontWeight:700, color:"#EF6461" }}>{log.hours}h</td>
                <td style={{ color:"#64748B", fontSize:12 }}>{log.description}</td>
                <td><span className={`tag tag-${log.status.toLowerCase()}`}>{log.status}</span></td>
                <td style={{ fontSize:12, color:"#64748B" }}>{log.approverId?data.resources.find(r=>r.id===log.approverId)?.name:"—"}</td>
              </tr>
            ))}
            {sorted.length===0&&<tr><td colSpan={6} style={{ textAlign:"center", color:"#334155" }}>No entries found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MY TASKS
// ══════════════════════════════════════════════
function MyTasks({ data, updateData, showToast, currentUser }) {
  const myTasks=(data.tasks||[]).filter(t=>t.assignedTo===currentUser.id);
  function markDone(id) {
    updateData(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===id?{...t,status:"Done"}:t)}));
    showToast("Task marked as done");
  }
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div className="section-title">My Tasks</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Tasks assigned to you by your manager</div>
        </div>
      </div>
      {myTasks.length===0?(
        <div className="card" style={{ padding:48, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:14, color:"#475569" }}>No tasks assigned to you yet.</div>
        </div>
      ):(
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {myTasks.map(task=>{
            const proj=data.projects.find(p=>p.id===task.projectId);
            const mgr=data.resources.find(r=>r.id===task.assignedBy);
            return (
              <div key={task.id} className="card" style={{ padding:20, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:"#F1F5F9", fontSize:14, marginBottom:6 }}>{task.title}</div>
                  <div style={{ display:"flex", gap:16, fontSize:12, color:"#64748B" }}>
                    <span>📁 {proj?.name||"—"}</span>
                    <span>👤 Assigned by {mgr?.name||"—"}</span>
                    {task.dueDate&&<span>📅 Due {fmt(task.dueDate)}</span>}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginLeft:16 }}>
                  <span className={`tag tag-${task.status==="Done"?"done":"open"}`}>{task.status}</span>
                  {task.status!=="Done"&&<button className="btn-coral" style={{ fontSize:12, padding:"6px 14px" }} onClick={()=>markDone(task.id)}>✓ Mark Done</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// APPROVALS (Manager)
// ══════════════════════════════════════════════
function Approvals({ data, updateData, showToast, currentUser }) {
  const teamIds = data.resources.filter(r=>r.managerId===currentUser.id).map(r=>r.id);
  const pending = data.timeLogs.filter(t=>teamIds.includes(t.resourceId)&&t.status==="Pending");

  function approve(id) {
    updateData(prev=>({...prev,timeLogs:prev.timeLogs.map(t=>t.id===id?{...t,status:"Approved",approverId:currentUser.id}:t)}));
    showToast("Hours approved");
  }
  function reject(id) {
    updateData(prev=>({...prev,timeLogs:prev.timeLogs.map(t=>t.id===id?{...t,status:"Rejected",approverId:currentUser.id}:t)}));
    showToast("Entry rejected","error");
  }
  function approveAll() {
    updateData(prev=>({...prev,timeLogs:prev.timeLogs.map(t=>teamIds.includes(t.resourceId)&&t.status==="Pending"?{...t,status:"Approved",approverId:currentUser.id}:t)}));
    showToast(`All ${pending.length} entries approved`);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div className="section-title">Pending Approvals</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>{pending.length} entries awaiting your approval</div>
        </div>
        {pending.length>0&&<button className="btn-coral" onClick={approveAll}>Approve All ({pending.length})</button>}
      </div>
      {pending.length===0?(
        <div className="card" style={{ padding:48, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:15, fontWeight:600, color:"#94A3B8" }}>All caught up!</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:6 }}>No pending approvals at this time.</div>
        </div>
      ):(
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {pending.map(log=>{
            const emp=data.resources.find(r=>r.id===log.resourceId);
            const proj=data.projects.find(p=>p.id===log.projectId);
            return (
              <div key={log.id} className="card" style={{ padding:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                    <div style={{ width:42, height:42, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(emp?.name||"")})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff", flexShrink:0 }}>{(emp?.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                    <div>
                      <div style={{ fontWeight:700, color:"#F1F5F9", fontSize:14 }}>{emp?.name}</div>
                      <div style={{ fontSize:12, color:"#64748B" }}>{emp?.role}</div>
                    </div>
                  </div>
                  <span className="tag tag-pending">Pending</span>
                </div>
                <div className="divider" style={{ margin:"14px 0" }} />
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
                  <div><div style={{ fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Project</div><div style={{ fontSize:13, fontWeight:500, color:"#CBD5E1" }}>{proj?.name}</div></div>
                  <div><div style={{ fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Date</div><div style={{ fontSize:13, color:"#CBD5E1" }}>{fmt(log.date)}</div></div>
                  <div><div style={{ fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Hours</div><div style={{ fontSize:18, fontWeight:800, color:"#EF6461", fontFamily:"'Syne',sans-serif" }}>{log.hours}h</div></div>
                </div>
                {log.description&&<div style={{ background:"#0F1117", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#64748B", marginBottom:14 }}>📝 {log.description}</div>}
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button className="btn-ghost" style={{ color:"#EF6461", borderColor:"rgba(239,100,97,.3)" }} onClick={()=>reject(log.id)}>✗ Reject</button>
                  <button className="btn-coral" onClick={()=>approve(log.id)}>✓ Approve</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// TEAM VIEW (Manager)
// ══════════════════════════════════════════════
function TeamView({ data, currentUser }) {
  const teamIds=data.resources.filter(r=>r.managerId===currentUser.id).map(r=>r.id);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div className="section-title">Team Overview</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Time logged by each team member</div>
        </div>
        <button className="btn-coral" onClick={()=>{
          const headers=["Employee","Role","Total Hours","Approved Hours","Pending Hours","Entries"];
          const rows=teamIds.map(id=>{const emp=data.resources.find(r=>r.id===id);const logs=data.timeLogs.filter(t=>t.resourceId===id);const tot=logs.reduce((s,t)=>s+t.hours,0);const app=logs.filter(t=>t.status==="Approved").reduce((s,t)=>s+t.hours,0);return[emp?.name||id,emp?.role||"",tot,app,tot-app,logs.length];});
          downloadCSV(`Team_Overview_${new Date().toISOString().slice(0,10)}.csv`,toCSV(headers,rows));
        }}>⬇ Download Team Report</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>
        {teamIds.map(rid=>{
          const emp=data.resources.find(r=>r.id===rid);
          const logs=data.timeLogs.filter(t=>t.resourceId===rid);
          const totalH=logs.reduce((s,t)=>s+t.hours,0);
          const pendingCount=logs.filter(t=>t.status==="Pending").length;
          const projBreakdown=data.projects.map(p=>({...p,hours:logs.filter(t=>t.projectId===p.id).reduce((s,t)=>s+t.hours,0)})).filter(p=>p.hours>0);
          return (
            <div key={rid} className="card" style={{ padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(emp?.name||"")})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:"#fff" }}>{(emp?.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                <div>
                  <div style={{ fontWeight:700, color:"#F1F5F9" }}>{emp?.name}</div>
                  <div style={{ fontSize:11, color:"#64748B" }}>{emp?.role}</div>
                </div>
                <div style={{ marginLeft:"auto", textAlign:"right" }}>
                  <div style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#EF6461" }}>{totalH}h</div>
                  {pendingCount>0&&<span className="tag tag-pending">{pendingCount} pending</span>}
                </div>
              </div>
              {projBreakdown.map(p=>(
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderTop:"1px solid #1E2130" }}>
                  <div style={{ fontSize:12, color:"#94A3B8" }}>{p.name}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#CBD5E1" }}>{p.hours}h</div>
                </div>
              ))}
              {projBreakdown.length===0&&<div style={{ fontSize:12, color:"#334155" }}>No hours logged yet</div>}
            </div>
          );
        })}
        {teamIds.length===0&&<div className="card" style={{ padding:32, textAlign:"center", color:"#475569" }}>No team members assigned to you.</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ASSIGN TASKS (Manager)
// ══════════════════════════════════════════════
function AssignTask({ data, updateData, showToast, currentUser }) {
  const teamIds    = data.resources.filter(r=>r.managerId===currentUser.id).map(r=>r.id);
  const teamMembers= data.resources.filter(r=>teamIds.includes(r.id));
  const [form, setForm]= useState({ assignedTo:"", projectId:"", title:"", dueDate:"" });
  const allTasks   = (data.tasks||[]).filter(t=>t.assignedBy===currentUser.id);

  function assign() {
    if (!form.assignedTo||!form.title) return showToast("Employee and task title are required","error");
    const newTask = { id:uid(), assignedBy:currentUser.id, status:"Open", ...form };
    updateData(prev=>({...prev,tasks:[...(prev.tasks||[]),newTask]}));
    setForm({assignedTo:"",projectId:"",title:"",dueDate:""});
    showToast("Task assigned");
  }
  function deleteTask(id) {
    updateData(prev=>({...prev,tasks:prev.tasks.filter(t=>t.id!==id)}));
    showToast("Task removed");
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div className="section-title">Assign Tasks</div>
        <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Assign tasks to your team members</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        <div className="card" style={{ padding:24 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:18, textTransform:"uppercase", letterSpacing:".06em" }}>New Task</div>
          <div className="form-group">
            <label className="form-label">Assign To *</label>
            <select className="inp" value={form.assignedTo} onChange={e=>setForm(p=>({...p,assignedTo:e.target.value}))}>
              <option value="">— Select team member —</option>
              {teamMembers.map(r=><option key={r.id} value={r.id}>{r.name} · {r.role}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="inp" value={form.projectId} onChange={e=>setForm(p=>({...p,projectId:e.target.value}))}>
              <option value="">— Select project (optional) —</option>
              {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Task Title *</label><input className="inp" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Describe the task..." /></div>
          <div className="form-group"><label className="form-label">Due Date</label><input className="inp" type="date" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))} /></div>
          <button className="btn-coral" style={{ width:"100%" }} onClick={assign}>Assign Task</button>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:14, textTransform:"uppercase", letterSpacing:".06em" }}>Tasks Assigned by You</div>
          {allTasks.length===0&&<div style={{ fontSize:13, color:"#334155" }}>No tasks assigned yet.</div>}
          {allTasks.map(task=>{
            const emp=data.resources.find(r=>r.id===task.assignedTo);
            const proj=data.projects.find(p=>p.id===task.projectId);
            return (
              <div key={task.id} className="card" style={{ padding:16, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontWeight:600, color:"#F1F5F9", fontSize:13 }}>{task.title}</div>
                    <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>→ {emp?.name} {proj?`· ${proj.name}`:""} {task.dueDate?`· Due ${fmt(task.dueDate)}`:""}</div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span className={`tag tag-${task.status==="Done"?"done":"open"}`}>{task.status}</span>
                    <button style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:14 }} onClick={()=>deleteTask(task.id)}>✕</button>
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

// ══════════════════════════════════════════════
// EMPLOYEE REPORT
// ══════════════════════════════════════════════
function EmployeeReport({ data, currentUser, isHR }) {
  const [period, setPeriod]       = useState("daily");
  const [selectedEmp, setSelectedEmp]= useState(isHR?"all":currentUser.id);
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");

  let logs = selectedEmp==="all"?data.timeLogs:data.timeLogs.filter(t=>t.resourceId===selectedEmp);
  if (fromDate) logs=logs.filter(t=>t.date>=fromDate);
  if (toDate)   logs=logs.filter(t=>t.date<=toDate);

  function groupKey(log) {
    if (period==="daily")     return log.date;
    if (period==="weekly")    return "Week of "+isoWeek(log.date);
    if (period==="monthly")   return isoMonth(log.date);
    if (period==="quarterly") return isoQuarter(log.date);
    if (period==="yearly")    return isoYear(log.date);
    return log.date;
  }

  const grouped = logs.reduce((acc,log)=>{ const key=groupKey(log); if (!acc[key]) acc[key]=[]; acc[key].push(log); return acc; },{});
  const groupedRows = Object.entries(grouped).sort((a,b)=>b[0].localeCompare(a[0]));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div className="section-title">Employee-wise Time Report</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Employee · Date · Hours · Project · Task</div>
        </div>
        <button className="btn-coral" onClick={()=>{
          const headers=["Employee ID","Employee Name","Date","Hours","Project","Task","Status"];
          const rows=[...logs].sort((a,b)=>b.date.localeCompare(a.date)).map(log=>{
            const emp=data.resources.find(r=>r.id===log.resourceId);
            const proj=data.projects.find(p=>p.id===log.projectId);
            return[log.resourceId.toUpperCase(),emp?.name||"",log.date,log.hours,proj?.name||"",log.description||"",log.status];
          });
          downloadCSV(`HR_Employee_Report_${new Date().toISOString().slice(0,10)}.csv`,toCSV(headers,rows));
        }}>⬇ Download Excel</button>
      </div>

      <div className="card" style={{ padding:"16px 20px", marginBottom:20, display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
        {isHR&&(
          <div style={{ flex:"0 0 auto" }}>
            <div className="form-label" style={{ marginBottom:6 }}>Employee</div>
            <select className="inp" value={selectedEmp} onChange={e=>setSelectedEmp(e.target.value)} style={{ width:200 }}>
              <option value="all">All Employees</option>
              {data.resources.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ flex:"0 0 auto" }}>
          <div className="form-label" style={{ marginBottom:6 }}>Group By</div>
          <div style={{ display:"flex", gap:6 }}>
            {["daily","weekly","monthly","quarterly","yearly"].map(p=>(
              <button key={p} className={period===p?"btn-coral":"btn-ghost"} style={{ padding:"7px 13px", fontSize:12, textTransform:"capitalize" }} onClick={()=>setPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div><div className="form-label" style={{ marginBottom:6 }}>From Date</div><input className="inp" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={{ width:150 }} /></div>
        <div><div className="form-label" style={{ marginBottom:6 }}>To Date</div><input className="inp" type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={{ width:150 }} /></div>
        {(fromDate||toDate)&&<button className="btn-ghost" style={{ fontSize:12, alignSelf:"flex-end" }} onClick={()=>{setFromDate("");setToDate("");}}>✕ Clear</button>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[{label:"Total Entries",value:logs.length,color:"#60A5FA"},{label:"Total Hours",value:logs.reduce((s,t)=>s+t.hours,0)+"h",color:"#EF6461"},{label:"Approved Hours",value:logs.filter(t=>t.status==="Approved").reduce((s,t)=>s+t.hours,0)+"h",color:"#34D399"},{label:"Pending Hours",value:logs.filter(t=>t.status==="Pending").reduce((s,t)=>s+t.hours,0)+"h",color:"#FBBf24"}].map(s=>(
          <div key={s.label} style={{ background:"#1A1D27", border:"1px solid #2A2D3E", borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {groupedRows.length===0&&<div className="card" style={{ padding:32, textAlign:"center", color:"#475569" }}>No data for selected filters</div>}
        {groupedRows.map(([key,periodLogs])=>{
          const totalH=periodLogs.reduce((s,t)=>s+t.hours,0);
          const uniqueE=[...new Set(periodLogs.map(t=>t.resourceId))].length;
          return (
            <div key={key} className="card" style={{ padding:0, overflow:"hidden" }}>
              <div style={{ background:"#141720", padding:"11px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #2A2D3E" }}>
                <div style={{ fontWeight:700, color:"#F1F5F9", fontSize:14 }}>{key}</div>
                <div style={{ display:"flex", gap:20, alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"#64748B" }}>{periodLogs.length} entries · {uniqueE} employee{uniqueE!==1?"s":""}</span>
                  <span style={{ fontSize:16, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#EF6461" }}>{totalH}h</span>
                </div>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ minWidth:700 }}>
                  <thead><tr><th>Employee ID</th><th>Employee Name</th><th>Date</th><th style={{ textAlign:"center" }}>Hours</th><th>Project</th><th>Task / Activity</th><th>Status</th></tr></thead>
                  <tbody>
                    {[...periodLogs].sort((a,b)=>{
                      const ea=data.resources.find(r=>r.id===a.resourceId)?.name||"";
                      const eb=data.resources.find(r=>r.id===b.resourceId)?.name||"";
                      return ea!==eb?ea.localeCompare(eb):a.date.localeCompare(b.date);
                    }).map(log=>{
                      const emp=data.resources.find(r=>r.id===log.resourceId);
                      const proj=data.projects.find(p=>p.id===log.projectId);
                      return (
                        <tr key={log.id}>
                          <td><span style={{ fontFamily:"monospace", fontSize:12, background:"rgba(96,165,250,.1)", color:"#60A5FA", padding:"2px 8px", borderRadius:6 }}>{log.resourceId.toUpperCase()}</span></td>
                          <td>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ width:26, height:26, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(emp?.name||"")})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>{(emp?.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                              <div>
                                <div style={{ fontWeight:600, color:"#F1F5F9", fontSize:13 }}>{emp?.name||"—"}</div>
                                <div style={{ fontSize:10, color:"#475569" }}>{emp?.role}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize:12, color:"#94A3B8" }}>{fmt(log.date)}</td>
                          <td style={{ textAlign:"center" }}>
                            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:"#EF6461" }}>{log.hours}</span>
                            <span style={{ fontSize:10, color:"#475569", marginLeft:2 }}>h</span>
                          </td>
                          <td><div style={{ fontWeight:500, color:"#CBD5E1", fontSize:13 }}>{proj?.name||"—"}</div>{proj?.category&&<div style={{ fontSize:10, color:"#475569", marginTop:2 }}>{proj.category}</div>}</td>
                          <td style={{ fontSize:12, color:"#94A3B8", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.description||"—"}</td>
                          <td><span className={`tag tag-${log.status.toLowerCase()}`}>{log.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ fontWeight:700, color:"#64748B", fontSize:12, padding:"10px 14px", background:"#141720", borderTop:"1px solid #2A2D3E" }}>Subtotal</td>
                      <td style={{ textAlign:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:"#EF6461", background:"#141720", borderTop:"1px solid #2A2D3E" }}>{totalH}<span style={{ fontSize:10, color:"#475569", marginLeft:2 }}>h</span></td>
                      <td colSpan={3} style={{ background:"#141720", borderTop:"1px solid #2A2D3E" }}></td>
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

// ══════════════════════════════════════════════
// PROJECT REPORT
// ══════════════════════════════════════════════
function ProjectReport({ data }) {
  const [selectedProj, setSelectedProj]= useState("all");
  const projects= selectedProj==="all"?data.projects:data.projects.filter(p=>p.id===selectedProj);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div className="section-title">Project-wise Report</div>
        <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Hours and days spent by employees on each project</div>
      </div>
      <div style={{ marginBottom:20 }}>
        <select className="inp" value={selectedProj} onChange={e=>setSelectedProj(e.target.value)} style={{ width:280 }}>
          <option value="all">All Projects</option>
          {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        {projects.map(proj=>{
          const projLogs=data.timeLogs.filter(t=>t.projectId===proj.id);
          const totalH=projLogs.reduce((s,t)=>s+t.hours,0);
          const totalDays=Math.ceil(totalH/8);
          const empBreakdown=data.resources.map(emp=>{
            const empLogs=projLogs.filter(t=>t.resourceId===emp.id);
            if (!empLogs.length) return null;
            const hours=empLogs.reduce((s,t)=>s+t.hours,0);
            const days=[...new Set(empLogs.map(t=>t.date))].length;
            const approvedH=empLogs.filter(t=>t.status==="Approved").reduce((s,t)=>s+t.hours,0);
            return {emp,empLogs,hours,days,approvedH};
          }).filter(Boolean);

          return (
            <div key={proj.id} className="card" style={{ padding:0, overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(135deg,#2B2D42,#1A1D27)", padding:"18px 22px", borderBottom:"1px solid #2A2D3E" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:"#F1F5F9", fontSize:16 }}>{proj.name}</div>
                    <div style={{ fontSize:12, color:"#64748B", marginTop:4 }}>{proj.category} · {fmt(proj.startDate)} – {fmt(proj.endDate)}</div>
                  </div>
                  <div style={{ display:"flex", gap:20, textAlign:"right" }}>
                    <div><div style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#EF6461" }}>{totalH}h</div><div style={{ fontSize:10, color:"#475569", textTransform:"uppercase" }}>Total Hours</div></div>
                    <div><div style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#60A5FA" }}>{totalDays}d</div><div style={{ fontSize:10, color:"#475569", textTransform:"uppercase" }}>Equiv. Days</div></div>
                    <div><div style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#34D399" }}>{empBreakdown.length}</div><div style={{ fontSize:10, color:"#475569", textTransform:"uppercase" }}>Contributors</div></div>
                  </div>
                </div>
              </div>
              {empBreakdown.length===0?(
                <div style={{ padding:"20px 22px", fontSize:13, color:"#334155" }}>No time logged for this project yet.</div>
              ):(
                <table>
                  <thead><tr><th>Employee</th><th>Role</th><th>Days Active</th><th>Total Hours</th><th>Approved Hours</th><th>Pending Hours</th><th>Entries</th></tr></thead>
                  <tbody>
                    {empBreakdown.map(({emp,empLogs,hours,days,approvedH})=>{
                      const pendingH=hours-approvedH;
                      return (
                        <tr key={emp.id}>
                          <td>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(emp.name)})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                              <span style={{ fontWeight:600, color:"#F1F5F9" }}>{emp.name}</span>
                            </div>
                          </td>
                          <td style={{ fontSize:12, color:"#64748B" }}>{emp.role}</td>
                          <td style={{ fontWeight:700, color:"#60A5FA" }}>{days} day{days!==1?"s":""}</td>
                          <td style={{ fontWeight:700, color:"#EF6461" }}>{hours}h</td>
                          <td style={{ color:"#34D399", fontWeight:600 }}>{approvedH}h</td>
                          <td style={{ color:pendingH>0?"#FBBf24":"#334155", fontWeight:600 }}>{pendingH}h</td>
                          <td style={{ color:"#64748B" }}>{empLogs.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PASSWORD MANAGEMENT (HR Admin)
// ══════════════════════════════════════════════
function PasswordMgmt({ data, updateData, showToast }) {
  const [resets, setResets]= useState({});

  function resetPassword(user) {
    const tempPw=genTempPassword();
    updateData(prev=>({...prev, resources:prev.resources.map(r=>r.id===user.id?{...r,password:tempPw,mustChangePassword:true}:r), passwordResets:[...(prev.passwordResets||[]),{id:uid(),resourceId:user.id,tempPassword:tempPw,createdAt:new Date().toISOString(),used:false}]}));
    setResets(prev=>({...prev,[user.id]:tempPw}));
    showToast(`Password reset for ${user.name}. Temp: ${tempPw}`);
  }

  const resetHistory=(data.passwordResets||[]).slice().reverse().slice(0,10);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div className="section-title">Password Management</div>
        <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Reset employee passwords and send temporary credentials</div>
      </div>
      <div className="card" style={{ marginBottom:24 }}>
        <table>
          <thead><tr><th>Employee</th><th>ID (Username)</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {data.resources.map(r=>(
              <tr key={r.id}>
                <td>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(r.name)})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>{r.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                    <div><div style={{ fontWeight:600, color:"#F1F5F9", fontSize:13 }}>{r.name}</div><div style={{ fontSize:11, color:"#64748B" }}>{r.role}</div></div>
                  </div>
                </td>
                <td><span style={{ fontFamily:"monospace", fontSize:13, color:"#60A5FA" }}>{r.id}</span></td>
                <td style={{ fontSize:12, color:"#64748B" }}>{r.email}</td>
                <td>{r.mustChangePassword?<span className="tag tag-pending">Must Change</span>:<span className="tag tag-approved">Active</span>}</td>
                <td>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <button className="btn-coral" style={{ fontSize:11, padding:"6px 14px" }} onClick={()=>resetPassword(r)}>🔄 Reset Password</button>
                    {resets[r.id]&&<span style={{ fontFamily:"monospace", fontSize:12, background:"rgba(251,191,36,.1)", color:"#FBBf24", padding:"4px 10px", borderRadius:6 }}>{resets[r.id]}</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resetHistory.length>0&&(
        <div className="card" style={{ padding:22 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:14, textTransform:"uppercase", letterSpacing:".06em" }}>Recent Reset History</div>
          <table>
            <thead><tr><th>Employee</th><th>Temp Password</th><th>Reset At</th><th>Status</th></tr></thead>
            <tbody>
              {resetHistory.map(reset=>{
                const emp=data.resources.find(r=>r.id===reset.resourceId);
                return (
                  <tr key={reset.id}>
                    <td style={{ fontWeight:500, color:"#F1F5F9" }}>{emp?.name||reset.resourceId}</td>
                    <td><span style={{ fontFamily:"monospace", fontSize:12, color:"#FBBf24" }}>{reset.tempPassword}</span></td>
                    <td style={{ fontSize:12, color:"#64748B" }}>{new Date(reset.createdAt).toLocaleString("en-IN")}</td>
                    <td><span className={`tag ${reset.used?"tag-approved":"tag-pending"}`}>{reset.used?"Used":"Pending Use"}</span></td>
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

// ══════════════════════════════════════════════
// RESOURCE MOVEMENT
// ══════════════════════════════════════════════
function ResourceMovement({ data, updateData, showToast }) {
  const today=new Date().toISOString().split("T")[0];
  const [form, setForm]= useState({ resourceId:"", fromProjectIds:[], toProjectIds:[], effectiveDate:today, reason:"", movementType:"Transfer", notes:"" });
  const [tab, setTab]= useState("new");
  const movements=data.resourceMovements||[];
  const MOVEMENT_TYPES=["Transfer","Rotation","Secondment","Reallocation","Back-fill","Addition","Release"];
  const REASONS=["Project completion","Skill match","Business priority change","Resource optimisation","Manager request","Employee request","Org restructuring","New project requirement","Parallel assignment","Other"];

  function getActiveProjects(resourceId) {
    const mv=movements.filter(m=>m.resourceId===resourceId).sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate));
    const active=new Set();
    mv.forEach(m=>{
      if(["Transfer","Release","Reallocation"].includes(m.movementType)) (m.fromProjectIds||[]).forEach(id=>active.delete(id));
      (m.toProjectIds||[]).forEach(id=>active.add(id));
      if(m.exitDate)(m.fromProjectIds||[]).forEach(id=>active.delete(id));
    });
    return [...active].map(id=>data.projects.find(p=>p.id===id)).filter(Boolean);
  }

  function handleFromChange(projId,checked) {
    const newIds=checked?[...form.fromProjectIds,projId]:form.fromProjectIds.filter(id=>id!==projId);
    let autoDate=form.effectiveDate;
    if(newIds.length>0){const lp=data.projects.find(p=>p.id===newIds[newIds.length-1]);if(lp?.endDate)autoDate=lp.endDate;}
    setForm(p=>({...p,fromProjectIds:newIds,effectiveDate:autoDate}));
  }
  function handleToChange(projId,checked) {
    const newIds=checked?[...form.toProjectIds,projId]:form.toProjectIds.filter(id=>id!==projId);
    setForm(p=>({...p,toProjectIds:newIds}));
  }
  function submit() {
    if(!form.resourceId) return showToast("Select a resource","error");
    if(!form.toProjectIds.length) return showToast("Select at least one destination project","error");
    const overlap=form.toProjectIds.filter(id=>form.fromProjectIds.includes(id));
    if(overlap.length) return showToast("From and To projects cannot overlap","error");
    const movement={id:uid(),resourceId:form.resourceId,fromProjectIds:form.fromProjectIds,toProjectIds:form.toProjectIds,effectiveDate:form.effectiveDate,reason:form.reason,movementType:form.movementType,notes:form.notes,createdAt:new Date().toISOString()};
    updateData(prev=>({...prev,resourceMovements:[...(prev.resourceMovements||[]),movement]}));
    const res=data.resources.find(r=>r.id===form.resourceId);
    showToast(`${res?.name} movement recorded`);
    setForm({resourceId:"",fromProjectIds:[],toProjectIds:[],effectiveDate:today,reason:"",movementType:"Transfer",notes:""});
    setTab("history");
  }
  function deleteMovement(id) {
    updateData(prev=>({...prev,resourceMovements:prev.resourceMovements.filter(m=>m.id!==id)}));
    showToast("Movement record removed");
  }

  function exportMovementsExcel() {
    if (!movements.length) return showToast("No movements to export","error");
    const XLSX = window.XLSX;
    if (!XLSX) {
      // Fallback to CSV if SheetJS not available
      const headers=["Employee ID","Employee Name","Role","Movement Type","From Projects","To Projects","Effective Date","Reason","Notes","Recorded At"];
      const rows=filteredMovements.map(m=>{
        const res=data.resources.find(r=>r.id===m.resourceId);
        const fromNames=(m.fromProjectIds||[]).map(id=>data.projects.find(p=>p.id===id)?.name||"").join("; ");
        const toNames=(m.toProjectIds||[]).map(id=>data.projects.find(p=>p.id===id)?.name||"").join("; ");
        return[res?.id||"",res?.name||"",res?.role||"",m.movementType,fromNames||"—",toNames,m.effectiveDate,m.reason||"",m.notes||"",new Date(m.createdAt).toLocaleString("en-IN")];
      });
      downloadCSV(`Resource_Movements_${new Date().toISOString().slice(0,10)}.csv`,toCSV(headers,rows));
      showToast("Movements exported as CSV");
      return;
    }

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Movement Log (chronological) ──────────────
    const logHeaders=["#","Employee ID","Employee Name","Designation / Role","Movement Type","From Projects","To Projects","Effective Date","Reason","Notes","Recorded At"];
    const logRows=filteredMovements.map((m,i)=>{
      const res=data.resources.find(r=>r.id===m.resourceId);
      const fromNames=(m.fromProjectIds||[]).map(id=>data.projects.find(p=>p.id===id)?.name||"").join("; ");
      const toNames=(m.toProjectIds||[]).map(id=>data.projects.find(p=>p.id===id)?.name||"").join("; ");
      return[i+1,res?.id||"",res?.name||"",res?.role||"",m.movementType,fromNames||"— New Assignment",toNames,m.effectiveDate,m.reason||"",m.notes||"",new Date(m.createdAt).toLocaleDateString("en-IN")];
    });
    const ws1=XLSX.utils.aoa_to_sheet([logHeaders,...logRows]);
    ws1["!cols"]=[{wch:4},{wch:12},{wch:22},{wch:26},{wch:14},{wch:36},{wch:36},{wch:14},{wch:28},{wch:30},{wch:16}];
    // Bold header row
    logHeaders.forEach((_,i)=>{
      const cell=ws1[XLSX.utils.encode_cell({r:0,c:i})];
      if(cell) cell.s={font:{bold:true,color:{rgb:"FFFFFF"}},fill:{fgColor:{rgb:"2B2D42"}}};
    });
    XLSX.utils.book_append_sheet(wb,ws1,"Movement Log");

    // ── Sheet 2: Resource Summary ──────────────────────────
    const sumHeaders=["Employee ID","Employee Name","Role","Total Movements","Current Projects","All Projects Ever","Last Movement Date","Last Movement Type","Last Reason"];
    const sumRows=data.resources.map(r=>{
      const mv=[...movements.filter(m=>m.resourceId===r.id)].sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate));
      if(!mv.length) return null;
      const curProjs=getActiveProjects(r.id).map(p=>p.name).join(", ");
      const allProjIds=new Set(mv.flatMap(m=>[...(m.fromProjectIds||[]),...(m.toProjectIds||[])]));
      const allProjs=[...allProjIds].map(id=>data.projects.find(p=>p.id===id)?.name||"").filter(Boolean).join(", ");
      const last=mv[0];
      return[r.id,r.name,r.role,mv.length,curProjs||"— Unassigned",allProjs,last.effectiveDate,last.movementType,last.reason||""];
    }).filter(Boolean);
    const ws2=XLSX.utils.aoa_to_sheet([sumHeaders,...sumRows]);
    ws2["!cols"]=[{wch:12},{wch:22},{wch:26},{wch:16},{wch:36},{wch:40},{wch:16},{wch:16},{wch:28}];
    sumHeaders.forEach((_,i)=>{const cell=ws2[XLSX.utils.encode_cell({r:0,c:i})];if(cell)cell.s={font:{bold:true,color:{rgb:"FFFFFF"}},fill:{fgColor:{rgb:"2B2D42"}}};});
    XLSX.utils.book_append_sheet(wb,ws2,"Resource Summary");

    // ── Sheet 3: Project Allocation Matrix ─────────────────
    const projNames=data.projects.map(p=>p.name);
    const matrixHeaders=["Employee ID","Employee Name","Role","Total Movements",...projNames,"Currently Active On"];
    const matrixRows=data.resources.map(r=>{
      const mv=movements.filter(m=>m.resourceId===r.id);
      const curProjs=getActiveProjects(r.id).map(p=>p.name).join(", ");
      const projsWorked=new Set(mv.flatMap(m=>[...(m.fromProjectIds||[]),...(m.toProjectIds||[])]));
      const curProjIds=new Set(getActiveProjects(r.id).map(p=>p.id));
      const projCells=data.projects.map(p=>{
        if(curProjIds.has(p.id)) return "Current";
        if(projsWorked.has(p.id)) return "Past";
        return "";
      });
      return[r.id,r.name,r.role,mv.length,...projCells,curProjs||"—"];
    });
    const ws3=XLSX.utils.aoa_to_sheet([matrixHeaders,...matrixRows]);
    ws3["!cols"]=[{wch:12},{wch:22},{wch:26},{wch:14},...data.projects.map(()=>({wch:12})),{wch:36}];
    matrixHeaders.forEach((_,i)=>{const cell=ws3[XLSX.utils.encode_cell({r:0,c:i})];if(cell)cell.s={font:{bold:true,color:{rgb:"FFFFFF"}},fill:{fgColor:{rgb:"2B2D42"}}};});
    XLSX.utils.book_append_sheet(wb,ws3,"Allocation Matrix");

    // ── Sheet 4: Movement Type Summary ────────────────────
    const typeHeaders=["Movement Type","Count","Employees Involved","Most Recent Date"];
    const typeMap={};
    filteredMovements.forEach(m=>{
      if(!typeMap[m.movementType])typeMap[m.movementType]={count:0,emps:new Set(),dates:[]};
      typeMap[m.movementType].count++;
      typeMap[m.movementType].emps.add(m.resourceId);
      typeMap[m.movementType].dates.push(m.effectiveDate);
    });
    const typeRows=Object.entries(typeMap).map(([type,d])=>[type,d.count,d.emps.size,[...d.dates].sort().reverse()[0]]);
    const ws4=XLSX.utils.aoa_to_sheet([typeHeaders,...typeRows]);
    ws4["!cols"]=[{wch:16},{wch:8},{wch:20},{wch:16}];
    typeHeaders.forEach((_,i)=>{const cell=ws4[XLSX.utils.encode_cell({r:0,c:i})];if(cell)cell.s={font:{bold:true,color:{rgb:"FFFFFF"}},fill:{fgColor:{rgb:"2B2D42"}}};});
    XLSX.utils.book_append_sheet(wb,ws4,"By Movement Type");

    XLSX.writeFile(wb,`Resource_Movement_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Resource movement report downloaded!");
  }

  const filteredMovements=[...movements].sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate));
  const activeOnSelected=form.resourceId?getActiveProjects(form.resourceId):[];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div className="section-title">Resource Movement</div>
          <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Assign resources to projects · Track transfers and history</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {movements.length>0&&(
            <button className="btn-ghost" style={{ fontSize:12, color:"#34D399", borderColor:"rgba(52,211,153,.3)" }} onClick={exportMovementsExcel}>
              ⬇ Download Excel Report
            </button>
          )}
          <div style={{ display:"flex", background:"#141720", border:"1px solid #2A2D3E", borderRadius:9, padding:3, gap:3 }}>
            {[{id:"new",label:"New Movement"},{id:"history",label:`History (${movements.length})`},{id:"matrix",label:"Allocation View"}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:tab===t.id?"linear-gradient(135deg,#EF6461,#D94F4C)":"transparent", color:tab===t.id?"#fff":"#64748B", border:"none", borderRadius:7, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .18s" }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {tab==="new"&&(
        <div style={{ display:"grid", gridTemplateColumns:"1.1fr .9fr", gap:24 }}>
          <div className="card" style={{ padding:26 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:20, textTransform:"uppercase", letterSpacing:".06em" }}>Record Resource Movement</div>
            <div className="form-group">
              <label className="form-label">Employee *</label>
              <select className="inp" value={form.resourceId} onChange={e=>setForm(p=>({...p,resourceId:e.target.value,fromProjectIds:[],toProjectIds:[]}))}>
                <option value="">— Select employee —</option>
                {data.resources.map(r=><option key={r.id} value={r.id}>{r.name} · {r.role}</option>)}
              </select>
            </div>
            {form.resourceId&&(
              <div style={{ marginBottom:16 }}>
                {activeOnSelected.length>0?(
                  <div style={{ padding:"10px 14px", background:"rgba(52,211,153,.07)", border:"1px solid rgba(52,211,153,.2)", borderRadius:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#34D399", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Currently Active On</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{activeOnSelected.map(p=><span key={p.id} style={{ fontSize:12, background:"rgba(52,211,153,.12)", color:"#34D399", padding:"3px 10px", borderRadius:12, fontWeight:500 }}>📁 {p.name}</span>)}</div>
                  </div>
                ):(
                  <div style={{ padding:"9px 14px", background:"rgba(251,191,36,.07)", border:"1px solid rgba(251,191,36,.2)", borderRadius:8, fontSize:12, color:"#FBBf24" }}>ℹ️ No current project assignments recorded</div>
                )}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Moving Out From</label>
              <div style={{ background:"#0F1117", border:"1px solid #2A2D3E", borderRadius:8, padding:"10px 12px", maxHeight:150, overflowY:"auto" }}>
                {data.projects.map(p=>(
                  <label key={p.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", borderBottom:"1px solid #1E2130" }}>
                    <input type="checkbox" checked={form.fromProjectIds.includes(p.id)} onChange={e=>handleFromChange(p.id,e.target.checked)} />
                    <span style={{ fontSize:13, color:form.fromProjectIds.includes(p.id)?"#EF6461":"#CBD5E1" }}>{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Assigning To *</label>
              <div style={{ background:"#0F1117", border:"1px solid #2A2D3E", borderRadius:8, padding:"10px 12px", maxHeight:160, overflowY:"auto" }}>
                {data.projects.filter(p=>!form.fromProjectIds.includes(p.id)).map(p=>(
                  <label key={p.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", borderBottom:"1px solid #1E2130" }}>
                    <input type="checkbox" checked={form.toProjectIds.includes(p.id)} onChange={e=>handleToChange(p.id,e.target.checked)} />
                    <span style={{ fontSize:13, color:form.toProjectIds.includes(p.id)?"#34D399":"#CBD5E1" }}>{p.name}</span>
                    {form.toProjectIds.includes(p.id)&&<span style={{ color:"#34D399", fontSize:14, marginLeft:"auto" }}>✓</span>}
                  </label>
                ))}
              </div>
              {form.toProjectIds.length>0&&(
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
                  {form.toProjectIds.map(id=>(
                    <span key={id} style={{ fontSize:11, background:"rgba(52,211,153,.12)", color:"#34D399", padding:"3px 9px", borderRadius:10 }}>
                      {data.projects.find(p=>p.id===id)?.name}
                      <span style={{ marginLeft:4, cursor:"pointer" }} onClick={()=>handleToChange(id,false)}>✕</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div className="form-group"><label className="form-label">Effective Date *</label><input className="inp" type="date" value={form.effectiveDate} onChange={e=>setForm(p=>({...p,effectiveDate:e.target.value}))} /></div>
              <div className="form-group">
                <label className="form-label">Movement Type</label>
                <select className="inp" value={form.movementType} onChange={e=>setForm(p=>({...p,movementType:e.target.value}))}>
                  {MOVEMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <select className="inp" value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}>
                <option value="">— Select reason —</option>
                {REASONS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="inp" rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Any additional context..." style={{ resize:"vertical" }} /></div>
            <button className="btn-coral" style={{ width:"100%", padding:12 }} onClick={submit}>🔄 Record Movement</button>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:14, textTransform:"uppercase", letterSpacing:".06em" }}>Current Assignments</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {data.resources.map(r=>{
                const active=getActiveProjects(r.id);
                const mvCount=movements.filter(m=>m.resourceId===r.id).length;
                return (
                  <div key={r.id} className="card" style={{ padding:"14px 18px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:active.length>0?8:0 }}>
                      <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(r.name)})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{r.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, color:"#F1F5F9", fontSize:13 }}>{r.name}</div>
                        <div style={{ fontSize:11, color:"#475569" }}>{r.role}</div>
                      </div>
                      {mvCount>0&&<div style={{ fontSize:10, color:"#475569" }}>{mvCount} movement{mvCount!==1?"s":""}</div>}
                    </div>
                    {active.length===0?<div style={{ fontSize:11, color:"#334155" }}>— Unassigned</div>:active.map(p=>(
                      <div key={p.id} style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:"#34D399", flexShrink:0 }}></span>
                        <span style={{ fontSize:12, color:"#34D399", fontWeight:500 }}>{p.name}</span>
                        {p.endDate&&<span style={{ fontSize:10, color:"#475569", marginLeft:"auto" }}>until {fmt(p.endDate)}</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab==="history"&&(
        <div>
          {filteredMovements.length===0?(
            <div className="card" style={{ padding:32, textAlign:"center", color:"#475569" }}>No movements recorded yet. Record movements to see history here.</div>
          ):(
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:13, color:"#475569" }}>{filteredMovements.length} movement record{filteredMovements.length!==1?"s":""} · sorted by most recent</div>
                <button className="btn-ghost" style={{ fontSize:12, color:"#34D399", borderColor:"rgba(52,211,153,.3)" }} onClick={exportMovementsExcel}>⬇ Download Excel</button>
              </div>
              <div style={{ overflowX:"auto" }}>
              <table style={{ minWidth:800 }}>
                <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Effective Date</th><th>Reason</th><th></th></tr></thead>
                <tbody>
                  {filteredMovements.map(m=>{
                    const res=data.resources.find(r=>r.id===m.resourceId);
                    const fromProjs=(m.fromProjectIds||[]).map(id=>data.projects.find(p=>p.id===id)).filter(Boolean);
                    const toProjs=(m.toProjectIds||[]).map(id=>data.projects.find(p=>p.id===id)).filter(Boolean);
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(res?.name||"")})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>{(res?.name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                            <div><div style={{ fontWeight:600, color:"#F1F5F9", fontSize:13 }}>{res?.name}</div><div style={{ fontSize:10, color:"#475569" }}>{res?.role}</div></div>
                          </div>
                        </td>
                        <td><span style={{ fontSize:11, background:"rgba(167,139,250,.12)", color:"#A78BFA", padding:"3px 9px", borderRadius:12, fontWeight:600 }}>{m.movementType}</span></td>
                        <td>{fromProjs.length>0?fromProjs.map(p=><div key={p.id} style={{ fontSize:12, color:"#EF6461" }}>{p.name}</div>):<span style={{ color:"#334155", fontSize:12 }}>— New assignment</span>}</td>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ color:"#34D399", fontSize:14 }}>→</span>
                            <div>{toProjs.map(p=><div key={p.id} style={{ fontSize:12, color:"#34D399", fontWeight:600 }}>{p.name}</div>)}</div>
                          </div>
                        </td>
                        <td style={{ fontSize:12, color:"#94A3B8" }}>{fmt(m.effectiveDate)}</td>
                        <td style={{ fontSize:12, color:"#64748B", maxWidth:160 }}>{m.reason||"—"}</td>
                        <td><button style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:14, padding:4 }} onClick={()=>deleteMovement(m.id)}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {tab==="matrix"&&(
        <div>
          <div style={{ fontSize:13, color:"#475569", marginBottom:16 }}>Shows every project each resource has been assigned to, based on movement records.</div>
          {movements.length===0?(
            <div className="card" style={{ padding:32, textAlign:"center", color:"#475569" }}>No movements recorded yet. Add movements to see the allocation matrix.</div>
          ):(
            <div style={{ overflowX:"auto" }}>
              <table style={{ minWidth:800 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth:160 }}>Employee</th>
                    <th style={{ minWidth:120 }}>Current Project</th>
                    {data.projects.map(p=><th key={p.id} style={{ minWidth:100, textAlign:"center", fontSize:10 }}><div style={{ maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={p.name}>{p.name}</div></th>)}
                    <th style={{ minWidth:70, textAlign:"center" }}>Moves</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resources.filter(r=>movements.some(m=>m.resourceId===r.id)).map(r=>{
                    const cur=getActiveProjects(r.id)[0];
                    const rMvs=movements.filter(m=>m.resourceId===r.id);
                    const projsWorked=new Set(rMvs.flatMap(m=>[...(m.fromProjectIds||[]),...(m.toProjectIds||[])].filter(Boolean)));
                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:26, height:26, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(r.name)})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>{r.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                            <div><div style={{ fontWeight:600, color:"#F1F5F9", fontSize:12 }}>{r.name}</div><div style={{ fontSize:10, color:"#475569" }}>{r.role}</div></div>
                          </div>
                        </td>
                        <td>{cur?<span style={{ fontSize:11, fontWeight:600, color:"#34D399" }}>{cur.name}</span>:<span style={{ fontSize:11, color:"#334155" }}>—</span>}</td>
                        {data.projects.map(p=>{
                          const wasThere=projsWorked.has(p.id);
                          const isCurrent=cur?.id===p.id;
                          return (
                            <td key={p.id} style={{ textAlign:"center" }}>
                              {isCurrent?<span title="Current">🟢</span>:wasThere?<span title="Previously" style={{ fontSize:14, color:"#FBBf24" }}>◐</span>:<span style={{ color:"#1E2130", fontSize:13 }}>—</span>}
                            </td>
                          );
                        })}
                        <td style={{ textAlign:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#A78BFA", fontSize:16 }}>{rMvs.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display:"flex", gap:20, marginTop:14, fontSize:12, color:"#475569" }}>
            <span>🟢 Current project</span>
            <span style={{ color:"#FBBf24" }}>◐ Previously worked on</span>
            <span>— Not assigned</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// IMPORT / EXPORT PANEL
// ══════════════════════════════════════════════
function ExcelPanel({ data, updateData, showToast }) {
  const [uploadType, setUploadType]= useState("resources");
  const [preview, setPreview]      = useState(null);
  const [dragOver, setDragOver]    = useState(false);

  const TYPES=[{id:"resources",label:"Resources"},{id:"projects",label:"Projects"},{id:"timelogs",label:"Time Logs"}];

  function handleFile(file) {
    if (!file) return;
    const ext=file.name.split(".").pop().toLowerCase();
    if (!["csv","txt"].includes(ext)) return showToast("Please upload a CSV file (.csv)","error");
    const reader=new FileReader();
    reader.onload=e=>{
      try {
        const rows=parseCSVText(e.target.result);
        if (!rows.length) return showToast("No data found","error");
        setPreview({rows,file:file.name,type:uploadType});
      } catch (err) { showToast("Error parsing file","error"); }
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!preview) return;
    if (preview.type==="resources") {
      const newResources=preview.rows.map(row=>{
        const existing=data.resources.find(r=>r.name.toLowerCase()===(row.name||"").toLowerCase());
        const mgr=data.resources.find(r=>r.name.toLowerCase()===(row.manager_name||"").toLowerCase());
        // Resolve system_role → isHR / isManager flags
        const rawSysRole=(row.system_role||row.is_manager||"").trim();
        let sysRole="Employee";
        if (/hr.?admin|hr.?manager|admin/i.test(rawSysRole)) sysRole="HR Admin";
        else if (/manager|yes/i.test(rawSysRole))            sysRole="Manager";
        const flags=systemRoleToFlags(sysRole);
        return {
          id:existing?.id||uid(),
          name:row.name||"Unknown",
          role:row.job_role||row.role||"",
          email:row.email||"",
          ...flags,
          managerId:mgr?.id||null,
          password:existing?.password||uid().slice(0,6).toUpperCase(),
          mustChangePassword:existing?existing.mustChangePassword:true,
        };
      }).filter(r=>r.name!=="Unknown");
      updateData(prev=>{const merged=[...prev.resources];newResources.forEach(nr=>{const idx=merged.findIndex(r=>r.id===nr.id);if(idx>=0)merged[idx]={...merged[idx],...nr};else merged.push(nr);});return{...prev,resources:merged};});
      showToast(`${newResources.length} resources imported/updated`);
    }
    if (preview.type==="projects") {
      const newProjects=preview.rows.map(row=>({id:uid(),name:row.name||"Untitled",category:row.category||"General",status:row.status||"Active",startDate:row.start_date||"",endDate:row.end_date||""}));
      updateData(prev=>({...prev,projects:[...prev.projects,...newProjects]}));
      showToast(`${newProjects.length} projects imported`);
    }
    if (preview.type==="timelogs") {
      const newLogs=preview.rows.map(row=>{
        const emp=data.resources.find(r=>r.name.toLowerCase()===(row.employee_name||"").toLowerCase());
        const proj=data.projects.find(p=>p.name.toLowerCase()===(row.project_name||"").toLowerCase());
        if (!emp||!proj) return null;
        return {id:uid(),resourceId:emp.id,projectId:proj.id,date:row.date||new Date().toISOString().split("T")[0],hours:parseFloat(row.hours)||0,description:row.description||"",status:"Pending",approverId:null};
      }).filter(Boolean);
      updateData(prev=>({...prev,timeLogs:[...prev.timeLogs,...newLogs]}));
      showToast(`${newLogs.length} time logs imported`);
    }
    setPreview(null);
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div className="section-title">Import / Export</div>
        <div style={{ fontSize:13, color:"#475569", marginTop:4 }}>Bulk import or export HR data as CSV</div>
      </div>
      {/* Export section */}
      <div className="card" style={{ padding:22, marginBottom:24 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:16, textTransform:"uppercase", letterSpacing:".06em" }}>Export Data</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {[
            {label:"Export Resources",fn:()=>{const h=["ID","Name","Job Role / Designation","System Role","Email","Manager"];const r=data.resources.map(x=>[x.id,x.name,x.role,systemRoleFromResource(x),x.email||"",data.resources.find(y=>y.id===x.managerId)?.name||""]);downloadCSV("hr_resources.csv",toCSV(h,r));showToast("Exported");}},
            {label:"Export Projects",fn:()=>{const h=["ID","Name","Category","Status","Start","End","Hours"];const r=data.projects.map(p=>[p.id,p.name,p.category,p.status,p.startDate,p.endDate,data.timeLogs.filter(t=>t.projectId===p.id).reduce((s,t)=>s+t.hours,0)]);downloadCSV("hr_projects.csv",toCSV(h,r));showToast("Exported");}},
            {label:"Export Time Logs",fn:()=>{const h=["ID","Employee","Project","Date","Hours","Description","Status","Approved By"];const r=data.timeLogs.map(t=>[t.id,data.resources.find(x=>x.id===t.resourceId)?.name||"",data.projects.find(p=>p.id===t.projectId)?.name||"",t.date,t.hours,t.description,t.status,t.approverId?data.resources.find(x=>x.id===t.approverId)?.name||"":""]);downloadCSV("hr_timelogs.csv",toCSV(h,r));showToast("Exported");}},
            {label:"Full Report",fn:()=>{const h=["Employee","System Role","Job Role","Project","Category","Date","Hours","Task","Status"];const r=data.timeLogs.map(t=>[data.resources.find(x=>x.id===t.resourceId)?.name||"",systemRoleFromResource(data.resources.find(x=>x.id===t.resourceId)||{}),data.resources.find(x=>x.id===t.resourceId)?.role||"",data.projects.find(p=>p.id===t.projectId)?.name||"",data.projects.find(p=>p.id===t.projectId)?.category||"",t.date,t.hours,t.description,t.status]);downloadCSV("hr_full_report.csv",toCSV(h,r));showToast("Exported");}},
          ].map(({label,fn})=>(<button key={label} className="btn-ghost" style={{ fontSize:13 }} onClick={fn}>⬇ {label}</button>))}
        </div>
      </div>
      {/* Import section */}
      <div className="card" style={{ padding:22 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:16, textTransform:"uppercase", letterSpacing:".06em" }}>Import Data (CSV)</div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {TYPES.map(t=>(<button key={t.id} className={uploadType===t.id?"btn-coral":"btn-ghost"} style={{ fontSize:12, padding:"7px 16px" }} onClick={()=>{setUploadType(t.id);setPreview(null);}}>{t.label}</button>))}
        </div>

        {/* Format hint for resources */}
        {uploadType==="resources"&&(
          <div style={{ background:"rgba(96,165,250,.06)", border:"1px solid rgba(96,165,250,.15)", borderRadius:8, padding:"12px 16px", marginBottom:16, fontSize:12 }}>
            <div style={{ fontWeight:700, color:"#60A5FA", marginBottom:8 }}>📋 Required CSV columns for Resources</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
              {[["name","required"],["job_role","required"],["system_role","optional"],["email","optional"],["manager_name","optional"]].map(([col,req])=>(
                <span key={col} style={{ fontFamily:"monospace", fontSize:11, background:req==="required"?"rgba(239,100,97,.12)":"rgba(96,165,250,.08)", color:req==="required"?"#EF6461":"#60A5FA", padding:"2px 8px", borderRadius:4 }}>{col}{req==="required"?" *":""}</span>
              ))}
            </div>
            <div style={{ color:"#64748B", lineHeight:1.6 }}>
              <strong style={{ color:"#94A3B8" }}>system_role</strong> accepted values: <span style={{ color:"#60A5FA", fontFamily:"monospace" }}>Employee</span> · <span style={{ color:"#A78BFA", fontFamily:"monospace" }}>Manager</span> · <span style={{ color:"#60A5FA", fontFamily:"monospace" }}>HR Admin</span> (defaults to Employee if blank)
            </div>
          </div>
        )}
        {!preview?(
          <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}
            style={{ border:`2px dashed ${dragOver?"#EF6461":"#2A2D3E"}`, borderRadius:14, padding:"48px 24px", textAlign:"center", background:dragOver?"rgba(239,100,97,.04)":"#0F1117", transition:"all .2s", cursor:"pointer" }}
            onClick={()=>document.getElementById("excel-upload").click()}>
            <input id="excel-upload" type="file" accept=".csv,.txt" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
            <div style={{ fontSize:44, marginBottom:12 }}>📂</div>
            <div style={{ fontWeight:700, fontSize:15, color:"#F1F5F9", marginBottom:6 }}>Drop your CSV file here or <span style={{ color:"#EF6461" }}>click to browse</span></div>
            <div style={{ fontSize:12, color:"#475569" }}>Supports .CSV files · Currently importing: <strong style={{ color:"#EF6461" }}>{TYPES.find(t=>t.id===uploadType)?.label}</strong></div>
          </div>
        ):(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <span style={{ fontSize:13, fontWeight:700, color:"#34D399" }}>✓ File loaded: </span>
                <span style={{ fontSize:13, color:"#94A3B8" }}>{preview.file}</span>
                <span style={{ fontSize:12, color:"#475569", marginLeft:10 }}>{preview.rows.length} rows</span>
              </div>
              <button className="btn-ghost" style={{ fontSize:12 }} onClick={()=>setPreview(null)}>✕ Clear</button>
            </div>
            <div style={{ maxHeight:250, overflowY:"auto", border:"1px solid #2A2D3E", borderRadius:10, marginBottom:16 }}>
              <table>
                <thead><tr>{Object.keys(preview.rows[0]).map(k=><th key={k}>{k}</th>)}</tr></thead>
                <tbody>{preview.rows.slice(0,8).map((row,i)=><tr key={i}>{Object.values(row).map((v,j)=><td key={j} style={{ fontSize:12 }}>{String(v)}</td>)}</tr>)}</tbody>
              </table>
              {preview.rows.length>8&&<div style={{ padding:"8px 14px", fontSize:12, color:"#475569", borderTop:"1px solid #2A2D3E" }}>... and {preview.rows.length-8} more rows</div>}
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="btn-ghost" onClick={()=>setPreview(null)}>Cancel</button>
              <button className="btn-coral" onClick={confirmImport}>✓ Import {preview.rows.length} rows</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════
export default function App() {
  const [data, setData]           = useState(SEED);
  const [session, setSession]     = useState(null);
  const [activeSection, setActiveSection]= useState("dashboard");
  const [toast, setToast]         = useState(null);

  // Load SheetJS for Excel export
  useEffect(()=>{
    if (window.XLSX) return;
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.head.appendChild(s);
  },[]);

  function showToast(msg, type="success") {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3000);
  }
  function updateData(updater) { setData(prev=>updater(prev)); }

  const currentUser = session ? data.resources.find(r=>r.id===session.userId) : null;

  function handleLogin(user) { setSession({userId:user.id}); setActiveSection("dashboard"); }
  function handleLogout() { setSession(null); setActiveSection("dashboard"); }

  if (!currentUser) return (
    <>
      <style>{CSS}</style>
      <LoginScreen data={data} onLogin={handleLogin} />
    </>
  );

  if (currentUser.mustChangePassword) return (
    <>
      <style>{CSS}</style>
      <ChangePasswordScreen user={currentUser} updateData={updateData} showToast={showToast} onDone={u=>setSession({userId:u.id})} />
    </>
  );

  const isHR      = currentUser.isHR;
  const isManager = currentUser.isManager;

  const navGroups = [
    ...(isHR?[{groupLabel:"HR Admin",items:[
      {id:"dashboard",label:"Dashboard",icon:"🏠"},
      {id:"resources",label:"Resources",icon:"👥"},
      {id:"projects",label:"Projects",icon:"📁"},
      {id:"res-movement",label:"Resource Movement",icon:"🔄"},
      {id:"excel",label:"Import / Export",icon:"📥"},
      {id:"pwd-mgmt",label:"Password Mgmt",icon:"🔑"},
    ]}]:[]),
    {groupLabel:"My Work",items:[
      {id:"emp-dashboard",label:"My Dashboard",icon:"🏠"},
      {id:"log-hours",label:"Log Hours",icon:"⏱️"},
      {id:"my-logs",label:"My Timesheets",icon:"📋"},
      {id:"my-tasks",label:"My Tasks",icon:"✅"},
    ]},
    ...(isManager?[{groupLabel:"Manager",items:[
      {id:"approvals",label:"Approvals",icon:"✅"},
      {id:"team-view",label:"Team Overview",icon:"📈"},
      {id:"assign-task",label:"Assign Tasks",icon:"📝"},
    ]}]:[]),
    ...((isHR||isManager)?[{groupLabel:"Reports",items:[
      {id:"report-employee",label:"Employee Report",icon:"👤"},
      {id:"report-project",label:"Project Report",icon:"📁"},
    ]}]:[]),
  ];

  const teamIds     = data.resources.filter(r=>r.managerId===currentUser.id).map(r=>r.id);
  const pendingCount= data.timeLogs.filter(t=>teamIds.includes(t.resourceId)&&t.status==="Pending").length;

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#0F1117", minHeight:"100vh", color:"#E2E8F0", position:"relative" }}>
      <style>{CSS}</style>

      {/* Toast */}
      {toast&&(
        <div style={{ position:"sticky", top:0, right:0, zIndex:200, display:"flex", justifyContent:"flex-end", pointerEvents:"none" }}>
          <div style={{ background:toast.type==="success"?"#1A3A2A":"#3A1A1A", border:`1px solid ${toast.type==="success"?"#34D399":"#EF6461"}`, borderRadius:10, padding:"12px 20px", fontSize:13, color:toast.type==="success"?"#34D399":"#EF6461", fontWeight:600, margin:"12px 12px 0 0", pointerEvents:"auto" }}>
            {toast.type==="success"?"✓ ":"✗ "}{toast.msg}
          </div>
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
            <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${stringToColor(currentUser.name)})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff" }}>{currentUser.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#F1F5F9" }}>{currentUser.name}</div>
              <div style={{ fontSize:10, color:"#475569" }}>{currentUser.id}{currentUser.isHR?" · HR Admin":""}{currentUser.isManager?" · Manager":""}</div>
            </div>
          </div>
          {pendingCount>0&&isManager&&(
            <div style={{ background:"rgba(251,191,36,.15)", border:"1px solid rgba(251,191,36,.3)", borderRadius:8, padding:"5px 12px", fontSize:12, color:"#FBBf24", fontWeight:600 }}>
              ⏳ {pendingCount} pending approval{pendingCount!==1?"s":""}
            </div>
          )}
          <button className="btn-ghost" style={{ fontSize:12, padding:"6px 14px" }} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      {/* LAYOUT */}
      <div style={{ display:"flex", minHeight:"calc(100vh - 60px)" }}>
        {/* SIDEBAR */}
        <div style={{ width:210, background:"#141720", borderRight:"1px solid #2A2D3E", padding:"12px 10px", flexShrink:0, overflowY:"auto" }}>
          {navGroups.map(group=>(
            <div key={group.groupLabel}>
              <div className="nav-group-label">{group.groupLabel}</div>
              {group.items.map(item=>(
                <div key={item.id} className={`nav-item${activeSection===item.id?" active":""}`} onClick={()=>setActiveSection(item.id)}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id==="approvals"&&pendingCount>0&&(
                    <span style={{ marginLeft:"auto", background:"#EF6461", color:"#fff", borderRadius:20, padding:"1px 6px", fontSize:10 }}>{pendingCount}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex:1, padding:"26px 30px", overflowY:"auto" }}>
          {isHR&&activeSection==="dashboard"      && <HRDashboard data={data} />}
          {isHR&&activeSection==="resources"      && <ResourcesPanel data={data} updateData={updateData} showToast={showToast} />}
          {isHR&&activeSection==="projects"       && <ProjectsPanel data={data} updateData={updateData} showToast={showToast} />}
          {isHR&&activeSection==="res-movement"   && <ResourceMovement data={data} updateData={updateData} showToast={showToast} />}
          {isHR&&activeSection==="excel"          && <ExcelPanel data={data} updateData={updateData} showToast={showToast} />}
          {isHR&&activeSection==="pwd-mgmt"       && <PasswordMgmt data={data} updateData={updateData} showToast={showToast} />}

          {activeSection==="emp-dashboard"        && <EmployeeDashboard data={data} currentUser={currentUser} />}
          {activeSection==="log-hours"            && <LogHours data={data} updateData={updateData} showToast={showToast} currentUser={currentUser} />}
          {activeSection==="my-logs"              && <MyLogs data={data} currentUser={currentUser} />}
          {activeSection==="my-tasks"             && <MyTasks data={data} updateData={updateData} showToast={showToast} currentUser={currentUser} />}

          {isManager&&activeSection==="approvals"   && <Approvals data={data} updateData={updateData} showToast={showToast} currentUser={currentUser} />}
          {isManager&&activeSection==="team-view"   && <TeamView data={data} currentUser={currentUser} />}
          {isManager&&activeSection==="assign-task" && <AssignTask data={data} updateData={updateData} showToast={showToast} currentUser={currentUser} />}

          {(isHR||isManager)&&activeSection==="report-employee" && <EmployeeReport data={data} currentUser={currentUser} isHR={isHR} />}
          {(isHR||isManager)&&activeSection==="report-project"  && <ProjectReport data={data} />}
        </div>
      </div>
    </div>
  );
}