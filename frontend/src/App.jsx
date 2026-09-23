import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Bell, BriefcaseBusiness, Building2, Check, ChevronDown, Download, Edit3, Eye, EyeOff, Filter, Grid2X2, LayoutList, LogOut, MapPin, Menu, MoreHorizontal, Phone, Plus, Search, Settings2, ShieldCheck, Sparkles, Trash2, UserRound, Users, X } from 'lucide-react'

const seedUsers = [
  { id: 1, name: 'Olivia Rhye', email: 'olivia@lumina.co', role: 'Admin', status: 'Active', joined: 'Jan 12, 2026', initials: 'OR', color: 'peach' },
  { id: 2, name: 'Phoenix Baker', email: 'phoenix@lumina.co', role: 'Editor', status: 'Active', joined: 'Jan 18, 2026', initials: 'PB', color: 'lilac' },
  { id: 3, name: 'Lana Steiner', email: 'lana@lumina.co', role: 'Viewer', status: 'Active', joined: 'Feb 02, 2026', initials: 'LS', color: 'mint' },
  { id: 4, name: 'Demi Wilkinson', email: 'demi@lumina.co', role: 'Editor', status: 'Pending', joined: 'Feb 14, 2026', initials: 'DW', color: 'yellow' },
  { id: 5, name: 'Candice Wu', email: 'candice@lumina.co', role: 'Viewer', status: 'Active', joined: 'Mar 09, 2026', initials: 'CW', color: 'blue' },
  { id: 6, name: 'Natali Craig', email: 'natali@lumina.co', role: 'Admin', status: 'Active', joined: 'Mar 21, 2026', initials: 'NC', color: 'rose' }
]

const navItems = [{ label: 'Overview', icon: Grid2X2 }, { label: 'People', icon: Users, count: '24' }, { label: 'Permissions', icon: ShieldCheck }, { label: 'Settings', icon: Settings2 }]
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const avatarColors = ['peach', 'lilac', 'mint', 'yellow', 'blue', 'rose']

function normalizeUser(user, index = 0) {
  const name = user.name || 'Lumina user'
  return { ...user, id: user.id || user._id, status: user.status || 'Active', department: user.department || 'General', jobTitle: user.jobTitle || 'Team member', employmentType: user.employmentType || 'Full-time', joined: user.joined || new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), initials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), color: user.color || avatarColors[index % avatarColors.length] }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed')
  return data
}

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('lumina_session') || 'null'))
  const [users, setUsers] = useState([])
  const [activeNav, setActiveNav] = useState('People')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('All roles')
  const [department, setDepartment] = useState('All departments')
  const [view, setView] = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
  const [status, setStatus] = useState('All status')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedIds, setSelectedIds] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [viewingUser, setViewingUser] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)
  const [transferTarget, setTransferTarget] = useState('')
  const [bulkRole, setBulkRole] = useState('')
  const [page, setPage] = useState(1)
  const [workspaceSettings, setWorkspaceSettings] = useState(() => JSON.parse(localStorage.getItem('lumina_settings') || '{"workspaceName":"Lumina Inc.","timezone":"Asia/Kolkata","emailNotifications":true,"compactView":false}'))
  const pageSize = 8

  useEffect(() => {
    if (!session?.token) return
    request('/users', { token: session.token }).then((data) => setUsers(data.map(normalizeUser))).catch((error) => { setToast(error.message); handleLogout() })
  }, [session?.token])

  function handleAuth(authSession) {
    localStorage.setItem('lumina_session', JSON.stringify(authSession))
    setSession(authSession)
  }

  function handleLogout() {
    localStorage.removeItem('lumina_session')
    setSession(null)
    setUsers([])
  }

  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesQuery = `${user.name} ${user.email} ${user.jobTitle} ${user.department} ${user.employeeId}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (role === 'All roles' || user.role === role) && (department === 'All departments' || user.department === department) && (status === 'All status' || user.status === status)
  }).sort((first, second) => sortBy === 'name' ? first.name.localeCompare(second.name) : sortBy === 'role' ? first.role.localeCompare(second.role) : new Date(second.createdAt || 0) - new Date(first.createdAt || 0)), [users, query, role, department, status, sortBy])

  const departments = [...new Set(users.map((user) => user.department).filter(Boolean))].sort()

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize)
  const allVisibleSelected = visibleUsers.length > 0 && visibleUsers.every((user) => selectedIds.includes(user.id))

  function flash(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }

  function saveWorkspaceSettings(event) {
    event.preventDefault()
    localStorage.setItem('lumina_settings', JSON.stringify(workspaceSettings))
    flash('Workspace settings saved')
  }

  function showRoleMembers(selectedRole) {
    setRole(selectedRole)
    setPage(1)
    setActiveNav('People')
  }

  async function transferAdmin(event) {
    event.preventDefault()
    if (!transferTarget) return flash('Select a member first')
    const target = users.find((user) => String(user.id) === String(transferTarget))
    if (!target) return flash('Selected member was not found')
    if (!window.confirm(`Make ${target.name} the new Admin? Your role will become Viewer.`)) return
    try {
      const result = await request('/users/transfer-admin', { method: 'POST', token: session.token, body: { userId: transferTarget } })
      const nextSession = { ...session, user: normalizeUser(result.currentUser) }
      localStorage.setItem('lumina_session', JSON.stringify(nextSession))
      setSession(nextSession)
      setUsers((current) => current.map((user) => String(user.id) === String(result.targetUser.id || result.targetUser._id) ? normalizeUser({ ...result.targetUser, id: result.targetUser.id || result.targetUser._id }, current.indexOf(user)) : String(user.id) === String(session.user.id) ? { ...user, role: 'Viewer' } : user))
      setTransferTarget('')
      flash('Admin role transferred successfully')
    } catch (error) { flash(error.message) }
  }

  function toggleSelected(id) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }
  function toggleAllVisible() { setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleUsers.some((user) => user.id === id)) : [...new Set([...current, ...visibleUsers.map((user) => user.id)])]) }

  async function applyBulkRole() {
    if (!bulkRole || session.user.role !== 'Admin') return
    try {
      const selectedUsers = users.filter((user) => selectedIds.includes(user.id))
      const updatedUsers = await Promise.all(selectedUsers.map((user) => request(`/users/${user.id}`, { method: 'PATCH', token: session.token, body: { role: bulkRole } })))
      setUsers((current) => current.map((user) => updatedUsers.find((updated) => updated._id === user.id || updated.id === user.id) ? { ...user, role: bulkRole } : user))
      setSelectedIds([])
      setBulkRole('')
      flash(`${updatedUsers.length} member${updatedUsers.length === 1 ? '' : 's'} updated`)
    } catch (error) { flash(error.message) }
  }

  async function deleteSelectedUsers() {
    if (session.user.role !== 'Admin' || selectedIds.length === 0) return
    const selectedUsers = users.filter((user) => selectedIds.includes(user.id))
    if (!window.confirm(`Remove ${selectedUsers.length} selected member${selectedUsers.length === 1 ? '' : 's'} from this workspace?`)) return
    try {
      await Promise.all(selectedUsers.map((user) => request(`/users/${user.id}`, { method: 'DELETE', token: session.token })))
      setUsers((current) => current.filter((user) => !selectedIds.includes(user.id)))
      setSelectedIds([])
      flash(`${selectedUsers.length} member${selectedUsers.length === 1 ? '' : 's'} removed`)
    } catch (error) { flash(error.message) }
  }

  function updateUser(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    request(`/users/${editingUser.id}`, { method: 'PATCH', token: session.token, body: { name: form.get('name'), email: form.get('email'), role: form.get('role'), employeeId: form.get('employeeId'), department: form.get('department'), jobTitle: form.get('jobTitle'), phone: form.get('phone'), location: form.get('location'), employmentType: form.get('employmentType'), manager: form.get('manager') } })
      .then((updatedUser) => { setUsers((current) => current.map((user) => user.id === editingUser.id ? normalizeUser({ ...updatedUser, color: user.color }) : user)); setEditingUser(null); flash('Member details updated') })
      .catch((error) => flash(error.message))
  }

  function deleteUser(user) {
    if (!window.confirm(`Remove ${user.name} from this workspace?`)) return
    request(`/users/${user.id}`, { method: 'DELETE', token: session.token })
      .then(() => { setUsers((current) => current.filter((item) => item.id !== user.id)); setSelectedIds((current) => current.filter((id) => id !== user.id)); setViewingUser(null); flash(`${user.name} was removed`) })
      .catch((error) => flash(error.message))
  }

  function exportUsers() {
    const rows = [['Name', 'Email', 'Role', 'Status', 'Joined'], ...filteredUsers.map((user) => [user.name, user.email, user.role, user.status, user.joined])]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'lumina-members.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    flash('Member list exported')
  }

  function addUser(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name')
    const email = form.get('email')
    request('/users', { method: 'POST', token: session.token, body: { name, email, password: `${crypto.randomUUID()}A!`, role: form.get('role'), employeeId: form.get('employeeId'), department: form.get('department'), jobTitle: form.get('jobTitle'), phone: form.get('phone'), location: form.get('location'), employmentType: form.get('employmentType'), manager: form.get('manager') } })
      .then((newUser) => { setUsers((current) => [normalizeUser(newUser, current.length), ...current]); setShowModal(false); setInviteResult({ name, email, inviteCode: newUser.inviteCode }); flash(`${name} was invited to Lumina`) })
      .catch((error) => flash(error.message))
  }

  if (!session?.token) return <AuthPage onAuthenticated={handleAuth} />

  const renderWorkspaceContent = () => {
    if (activeNav === 'Overview') {
      return <section className="content-wrap"><div className="page-heading"><div><p className="eyebrow">Overview</p><h1>Workspace snapshot</h1><p className="subheading">A quick look at your team health and activity.</p></div></div><div className="metric-row"><Metric label="Total members" value={users.length} change="Live" accent="mint" /><Metric label="Active today" value={users.filter((user) => user.status !== 'Pending').length} change="Live" accent="peach" /><Metric label="Pending invites" value={users.filter((user) => user.status === 'Pending').length} change="Live" accent="lilac" /><div className="metric-note"><span className="pulse-dot" /> <strong>Workspace health</strong><span>Everything looks good</span></div></div><div className="directory-head"><div><h2>Team overview</h2><p>Recent workspace performance and access coverage.</p></div></div><div className="user-grid">{[
        { title: 'Members', value: users.length, tone: 'mint' },
        { title: 'Admins', value: users.filter((user) => user.role === 'Admin').length, tone: 'peach' },
        { title: 'Editors', value: users.filter((user) => user.role === 'Editor').length, tone: 'blue' },
        { title: 'Viewers', value: users.filter((user) => user.role === 'Viewer').length, tone: 'lilac' }
      ].map((item) => <article key={item.title} className="user-card"><div className="card-top"><span className={`avatar ${item.tone}`}>{item.title.slice(0, 2).toUpperCase()}</span></div><button className="card-person-button"><strong>{item.value}</strong><small>{item.title}</small></button></article>)}</div></section>
    }

    if (activeNav === 'Permissions') {
      return <section className="content-wrap"><div className="page-heading"><div><p className="eyebrow">Permissions</p><h1>Access control</h1><p className="subheading">Review who can manage people, edit records, and view workspace data.</p></div></div><div className="directory-head"><div><h2>Role matrix</h2><p>Current permissions across your workspace.</p></div></div><div className="user-grid">{[
        { role: 'Admin', description: 'Full access to all workspace controls', tone: 'peach' },
        { role: 'Editor', description: 'Can update directory and member details', tone: 'mint' },
        { role: 'Viewer', description: 'Read-only access to member profiles', tone: 'lilac' }
      ].map((role) => <button key={role.role} className="user-card role-card" onClick={() => showRoleMembers(role.role)}><div className="card-top"><span className={`avatar ${role.tone}`}>{role.role.slice(0, 2).toUpperCase()}</span><span className="role-card-action">View members <ArrowUpRight size={13} /></span></div><span className="card-person-button"><strong>{role.role}</strong><small>{role.description}</small></span></button>)}</div>{session.user.role === 'Admin' && <form className="transfer-admin" onSubmit={transferAdmin}><div><h2>Transfer workspace Admin</h2><p>Choose an active member. You will become a Viewer after the transfer.</p></div><div className="transfer-controls"><select aria-label="New Admin" value={transferTarget} onChange={(event) => setTransferTarget(event.target.value)}><option value="">Select a member...</option>{users.filter((user) => user.status === 'Active' && user.id !== session.user.id).map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select><button className="primary-button" type="submit">Make Admin <ShieldCheck size={16} /></button></div></form>}</section>
    }

    if (activeNav === 'Settings') {
      return <section className="content-wrap"><div className="page-heading"><div><p className="eyebrow">Settings</p><h1>Workspace preferences</h1><p className="subheading">Configure how your workspace looks and behaves.</p></div></div><form className="settings-panel" onSubmit={saveWorkspaceSettings}><div className="settings-section"><div><h2>Workspace profile</h2><p>Update the name and region shown across your workspace.</p></div><div className="settings-fields"><label>Workspace name<input value={workspaceSettings.workspaceName} onChange={(event) => setWorkspaceSettings((current) => ({ ...current, workspaceName: event.target.value }))} required /></label><label>Timezone<select value={workspaceSettings.timezone} onChange={(event) => setWorkspaceSettings((current) => ({ ...current, timezone: event.target.value }))}><option value="Asia/Kolkata">India Standard Time (IST)</option><option value="UTC">Coordinated Universal Time (UTC)</option><option value="America/New_York">Eastern Time (ET)</option><option value="Europe/London">Greenwich Mean Time (GMT)</option></select></label></div></div><div className="settings-section"><div><h2>Workspace preferences</h2><p>Choose how updates and member lists behave.</p></div><div className="settings-options"><label className="setting-toggle"><input type="checkbox" checked={workspaceSettings.emailNotifications} onChange={(event) => setWorkspaceSettings((current) => ({ ...current, emailNotifications: event.target.checked }))} /><span><strong>Email notifications</strong><small>Receive updates when members are invited or changed.</small></span></label><label className="setting-toggle"><input type="checkbox" checked={workspaceSettings.compactView} onChange={(event) => setWorkspaceSettings((current) => ({ ...current, compactView: event.target.checked }))} /><span><strong>Compact people list</strong><small>Use tighter spacing in the People directory.</small></span></label></div></div><div className="settings-footer"><span>Changes are saved for this browser.</span><button className="primary-button" type="submit"><Check size={16} /> Save settings</button></div></form></section>
    }

    return <section className="content-wrap">
      <div className="page-heading"><div><p className="eyebrow">People directory</p><h1>Good morning, {session.user.name.split(' ')[0]} <span>✦</span></h1><p className="subheading">Manage your team, roles and access in one clear view.</p></div><button className={`primary-button ${session.user.role !== 'Admin' ? 'restricted-button' : ''}`} title={session.user.role !== 'Admin' ? 'Only Admins can invite members' : 'Invite a member'} onClick={() => session.user.role === 'Admin' ? setShowModal(true) : flash('Only Admins can invite members')}><Plus size={17} /> Invite member</button></div>
      <div className="metric-row"><Metric label="Total members" value={users.length} change="Live" accent="mint" /><Metric label="Active today" value={users.filter((user) => user.status !== 'Pending').length} change="Live" accent="peach" /><Metric label="Pending invites" value={users.filter((user) => user.status === 'Pending').length} change="Live" accent="lilac" /><div className="metric-note"><span className="pulse-dot" /> <strong>Workspace health</strong><span>Everything looks good</span></div></div>
      <div className="directory-head"><div><h2>All people <small>{filteredUsers.length} members</small></h2><p>Everyone with access to your workspace.</p></div><div className="directory-actions"><button className="secondary-button" onClick={exportUsers}><Download size={15} /> Export</button><div className="view-toggle"><button aria-label="List view" className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}><LayoutList size={16} /></button><button aria-label="Grid view" className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')}><Grid2X2 size={16} /></button></div></div></div>
      <div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search by name, title or email..." /></div><div className="filter-wrap"><Filter size={15} /><select aria-label="Filter by role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }}><option>All roles</option><option>Admin</option><option>Editor</option><option>Viewer</option></select><ChevronDown size={14} /></div><div className="filter-wrap"><Building2 size={14} /><select aria-label="Filter by department" value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1) }}><option>All departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></div><div className="filter-wrap"><span className="status-filter-dot" /><select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option>All status</option><option>Active</option><option>Pending</option></select><ChevronDown size={14} /></div><div className="filter-wrap sort-wrap"><select aria-label="Sort members" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="newest">Recently joined</option><option value="name">Name A-Z</option><option value="role">Role</option></select><ChevronDown size={14} /></div>{(query || role !== 'All roles' || department !== 'All departments' || status !== 'All status') && <button className="clear-button" onClick={() => { setQuery(''); setRole('All roles'); setDepartment('All departments'); setStatus('All status'); setPage(1) }}>Clear</button>}</div>
      {selectedIds.length > 0 && <div className="bulk-bar"><strong>{selectedIds.length} selected</strong><span>Manage selected members</span>{session.user.role === 'Admin' && <><select aria-label="Bulk role" value={bulkRole} onChange={(event) => setBulkRole(event.target.value)}><option value="">Change role...</option><option>Admin</option><option>Editor</option><option>Viewer</option></select><button className="bulk-apply" disabled={!bulkRole} onClick={applyBulkRole}>Apply</button><button className="bulk-delete" onClick={deleteSelectedUsers}><Trash2 size={13} /> Delete selected</button></>}<button className="clear-selection" onClick={() => { setSelectedIds([]); setBulkRole(''); flash('Selection cleared') }}>Clear selection</button></div>}
      {view === 'list' ? <UserTable users={visibleUsers} selectedIds={selectedIds} allVisibleSelected={allVisibleSelected} onToggleAll={toggleAllVisible} onToggle={toggleSelected} onView={setViewingUser} onEdit={setEditingUser} onDelete={deleteUser} canManage={session.user.role === 'Admin'} /> : <div className="user-grid">{visibleUsers.map((user) => <UserCard key={user.id} user={user} onView={setViewingUser} onEdit={setEditingUser} onDelete={deleteUser} canManage={session.user.role === 'Admin'} />)}</div>}
      <footer className="table-footer"><span>Showing <strong>{filteredUsers.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong> members</span><div><button aria-label="Previous page" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>←</button>{Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 5).map((number) => <button key={number} className={page === number ? 'page-active' : ''} onClick={() => setPage(number)}>{number}</button>)}<button aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>→</button></div></footer>
    </section>
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>lumina</span></div>
      <div className="workspace-switcher"><span className="workspace-avatar">L</span><span><strong>Lumina Inc.</strong><small>Workspace</small></span><ChevronDown size={15} /></div>
      <p className="nav-label">Workspace</p>
      <nav>{navItems.map(({ label, icon: Icon, count }) => <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => setActiveNav(label)}><Icon size={17} /><span>{label}</span>{count && <em>{count}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="plan-card"><span className="tiny-spark">✦</span><strong>Pro plan</strong><p>You’re making great progress.</p><a href="#usage">View usage <ArrowUpRight size={13} /></a></div><button className="profile-mini" onClick={handleLogout}><span className="avatar peach">{session.user.initials || session.user.name.slice(0, 2).toUpperCase()}</span><span><strong>{session.user.name}</strong><small>{session.user.email}</small><em className={`role-badge ${session.user.role.toLowerCase()}`}>{session.user.role}</em></span><LogOut size={15} /></button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu"><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{activeNav}</strong></div><div className="top-actions"><span className={`current-role role-badge ${session.user.role.toLowerCase()}`}>{session.user.role}</span><div className="notification-wrap"><button aria-label="Notifications" className="icon-button" onClick={() => setShowNotifications((current) => !current)}><Bell size={18} /><i /></button>{showNotifications && <div className="notification-panel"><div><strong>Notifications</strong><span>2 new</span></div><article><span className="notification-icon mint"><Users size={14} /></span><p><strong>Workspace sync complete</strong><small>All member data is up to date.</small></p></article><article><span className="notification-icon peach"><UserRound size={14} /></span><p><strong>New member joined</strong><small>Review your latest workspace activity.</small></p></article></div>}</div><button className="help-button">?</button><button className="top-avatar">{session.user.name.slice(0, 2).toUpperCase()}</button></div></header>
      {renderWorkspaceContent()}
    </main>
    {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><div className="invite-modal company-form" onClick={(event) => event.stopPropagation()}><button aria-label="Close invite dialog" className="close-modal" onClick={() => setShowModal(false)}><X size={18} /></button><span className="modal-icon"><Plus size={20} /></span><h2>Invite an employee</h2><p>Add a teammate to your company directory.</p><form onSubmit={addUser}><div className="form-grid"><label>Full name<input required name="name" placeholder="e.g. Alex Morgan" /></label><label>Employee ID<input required name="employeeId" placeholder="EMP-1042" /></label><label>Email address<input required type="email" name="email" placeholder="alex@company.com" /></label><label>Job title<input required name="jobTitle" placeholder="Product Designer" /></label><label>Department<select name="department"><option>Engineering</option><option>Product</option><option>Design</option><option>Marketing</option><option>Sales</option><option>Finance</option><option>People</option></select></label><label>Employment type<select name="employmentType"><option>Full-time</option><option>Part-time</option><option>Contractor</option><option>Intern</option></select></label><label>Location<input name="location" placeholder="Mumbai, India" /></label><label>Manager<input name="manager" placeholder="Manager name" /></label><label>Role<select name="role"><option>Viewer</option><option>Editor</option><option>Admin</option></select></label><label>Phone number<input name="phone" placeholder="+91 98765 43210" /></label></div><button className="primary-button" type="submit">Create invitation <ArrowUpRight size={16} /></button></form></div></div>}
    {inviteResult && <div className="modal-backdrop" onClick={() => setInviteResult(null)}><div className="invite-modal invite-result" onClick={(event) => event.stopPropagation()}><button aria-label="Close invitation result" className="close-modal" onClick={() => setInviteResult(null)}><X size={18} /></button><span className="modal-icon"><Check size={20} /></span><h2>Invitation created</h2><p>Email is not required. Share this code with {inviteResult.name}; they can choose a password from the Accept invitation screen.</p><div className="invite-code"><span>Invitation code</span><strong>{inviteResult.inviteCode}</strong></div><button className="primary-button" onClick={() => { navigator.clipboard?.writeText(inviteResult.inviteCode); flash('Invitation code copied'); setInviteResult(null) }}>Copy code and close</button></div></div>}
    {editingUser && <div className="modal-backdrop" onClick={() => setEditingUser(null)}><div className="invite-modal company-form" onClick={(event) => event.stopPropagation()}><button aria-label="Close edit dialog" className="close-modal" onClick={() => setEditingUser(null)}><X size={18} /></button><span className="modal-icon"><Edit3 size={20} /></span><h2>Edit employee</h2><p>Keep company directory information accurate.</p><form onSubmit={updateUser}><div className="form-grid"><label>Full name<input required minLength="2" name="name" defaultValue={editingUser.name} /></label><label>Employee ID<input name="employeeId" defaultValue={editingUser.employeeId} /></label><label>Email address<input required type="email" name="email" defaultValue={editingUser.email} /></label><label>Job title<input name="jobTitle" defaultValue={editingUser.jobTitle} /></label><label>Department<input name="department" defaultValue={editingUser.department} /></label><label>Employment type<select name="employmentType" defaultValue={editingUser.employmentType}><option>Full-time</option><option>Part-time</option><option>Contractor</option><option>Intern</option></select></label><label>Location<input name="location" defaultValue={editingUser.location} /></label><label>Manager<input name="manager" defaultValue={editingUser.manager} /></label><label>Role<select name="role" defaultValue={editingUser.role}><option>Viewer</option><option>Editor</option><option>Admin</option></select></label><label>Phone number<input name="phone" defaultValue={editingUser.phone} /></label></div><button className="primary-button" type="submit">Save employee <Check size={16} /></button></form></div></div>}
    {viewingUser && <div className="drawer-backdrop" onClick={() => setViewingUser(null)}><aside className="profile-drawer" onClick={(event) => event.stopPropagation()}><button aria-label="Close profile" className="close-modal" onClick={() => setViewingUser(null)}><X size={18} /></button><div className={`drawer-avatar avatar ${viewingUser.color}`}>{viewingUser.initials}</div><h2>{viewingUser.name}</h2><p>{viewingUser.jobTitle} · {viewingUser.department}</p><span className={`status ${viewingUser.status.toLowerCase()}`}><span />{viewingUser.status} employee</span><div className="profile-details"><div><span><BriefcaseBusiness size={13} /> Employee ID</span><strong>{viewingUser.employeeId || 'Not assigned'}</strong></div><div><span><Building2 size={13} /> Department</span><strong>{viewingUser.department}</strong></div><div><span>Access role</span><strong>{viewingUser.role}</strong></div><div><span><MapPin size={13} /> Location</span><strong>{viewingUser.location || 'Not added'}</strong></div><div><span><Phone size={13} /> Phone</span><strong>{viewingUser.phone || 'Not added'}</strong></div><div><span>Manager</span><strong>{viewingUser.manager || 'Not assigned'}</strong></div><div><span>Joined</span><strong>{viewingUser.joined}</strong></div></div>{session.user.role === 'Admin' && <div className="drawer-actions"><button className="secondary-button" onClick={() => { setEditingUser(viewingUser); setViewingUser(null) }}><Edit3 size={15} /> Edit employee</button><button className="danger-button" onClick={() => deleteUser(viewingUser)}><Trash2 size={15} /> Remove</button></div>}</aside></div>}
    {toast && <div className="toast"><Check size={16} /> {toast}</div>}
  </div>
}

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const strength = password.length >= 12 ? 'Strong' : password.length >= 8 ? 'Good' : password.length ? 'Weak' : ''

  function resetAuthState(nextMode) {
    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const passwordValue = String(form.get('password') ?? '').trim()
    const body = { email, password: passwordValue }
    if (mode === 'signup') Object.assign(body, { name: String(form.get('name') ?? '').trim() })
    if (mode === 'invite') body.inviteCode = String(form.get('inviteCode') ?? '').trim()
    if ((mode === 'signup' || mode === 'invite') && password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return }
    if (!email || !passwordValue || (mode === 'signup' && !body.name) || (mode === 'invite' && !body.inviteCode)) { setError('Please fill in all required fields'); setLoading(false); return }
    try {
      const result = await request(mode === 'invite' ? '/auth/activate-invite' : `/auth/${mode}`, { method: 'POST', body })
      onAuthenticated({ token: result.token, user: normalizeUser(result.user) })
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  return <div className="auth-shell"><div className="auth-visual"><div className="brand auth-brand"><span className="brand-mark"><Sparkles size={16} /></span><span>lumina</span></div><div className="auth-quote"><span className="quote-mark">“</span><h1>Make space for better work.</h1><p>A calmer, clearer way to manage the people who make your work matter.</p><span className="quote-credit">Lumina workspace · 2026</span><div className="auth-proof"><div><strong>4.9/5</strong><span>from happy teams</span></div><div><strong>24k+</strong><span>people organized</span></div></div></div><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></div><div className="auth-panel"><div className="auth-panel-inner"><div className="auth-mobile-brand"><div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>lumina</span></div></div><div className="auth-security"><span className="security-dot" /> Secure workspace access <span>·</span> 256-bit encryption</div><div className="auth-heading"><p className="eyebrow">{mode === 'login' ? 'Welcome back' : mode === 'invite' ? 'Invitation request' : 'Start your workspace'}</p><h2>{mode === 'login' ? 'Sign in to Lumina' : mode === 'invite' ? 'Accept invitation' : 'Create your account'}</h2><p>{mode === 'login' ? 'Enter your details to continue to your workspace.' : mode === 'invite' ? 'Use the code shared by your workspace admin.' : 'Bring your team together in a few simple steps.'}</p></div><form className="auth-form" onSubmit={submit}>{mode === 'invite' && <label>Invitation code<input required name="inviteCode" placeholder="e.g. A1B2C3D4E5F6" /></label>}{mode === 'signup' && <label>Full name<input required minLength="2" name="name" placeholder="Olivia Rhye" /></label>}<label>Email address<input required type="email" name="email" placeholder="you@company.com" /></label><label>Password<div className="password-field"><input required minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} name="password" placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{mode === 'signup' && <div className="password-meter"><span className={strength.toLowerCase()} /><span className={strength.toLowerCase()} /><span className={strength.toLowerCase()} /><small>{strength ? `${strength} password` : 'Use 8 or more characters'}</small></div>}</label>{(mode === 'signup' || mode === 'invite') && <label>Confirm password<div className="password-field"><input required minLength="8" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" name="confirmPassword" placeholder="Repeat your password" /></div></label>}{mode === 'login' && <div className="auth-options"><label className="check-label"><input type="checkbox" /> Remember me</label><a href="#forgot">Forgot password?</a></div>}{error && <div className="auth-error">{error}</div>}<button className="primary-button auth-submit" disabled={loading}>{loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : mode === 'invite' ? 'Accept invitation' : 'Create account'} <ArrowUpRight size={16} /></button></form><p className="auth-switch">{mode === 'login' ? 'New to Lumina?' : 'Already have an account?'} <button type="button" onClick={() => resetAuthState(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in instead'}</button></p>{mode !== 'invite' && <p className="auth-switch"><span>Have an invitation code?</span> <button type="button" onClick={() => resetAuthState('invite')}>Accept invitation</button></p>}<p className="auth-legal">By continuing, you agree to Lumina’s Terms of Service and Privacy Policy.</p></div></div></div>
}

function Metric({ label, value, change, accent }) { return <div className={`metric-card ${accent}`}><span>{label}</span><div><strong>{value}</strong><em>{change}</em></div></div> }
function UserTable({ users, selectedIds, allVisibleSelected, onToggleAll, onToggle, onView, onEdit, onDelete, canManage }) { return <div className="table-wrap"><table><thead><tr><th className="check-cell"><input aria-label="Select all visible members" type="checkbox" checked={allVisibleSelected} onChange={onToggleAll} /></th><th>Employee</th><th>Department</th><th>Access</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td className="check-cell"><input aria-label={`Select ${user.name}`} type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => onToggle(user.id)} /></td><td><button className="person person-button" onClick={() => onView(user)}><span className={`avatar ${user.color}`}>{user.initials}</span><span><strong>{user.name}</strong><small>{user.jobTitle} · {user.email}</small></span></button></td><td><span className="department-cell"><Building2 size={13} />{user.department}</span></td><td><span className="role-pill"><span />{user.role}</span></td><td><span className={`status ${user.status.toLowerCase()}`}><span />{user.status}</span></td><td><div className="row-actions"><button aria-label={`View ${user.name}`} className="more-button" onClick={() => onView(user)}><UserRound size={15} /></button>{canManage && <><button aria-label={`Edit ${user.name}`} className="more-button" onClick={() => onEdit(user)}><Edit3 size={15} /></button><button aria-label={`Delete ${user.name}`} className="more-button danger-icon" onClick={() => onDelete(user)}><Trash2 size={15} /></button></>}</div></td></tr>)}</tbody></table>{users.length === 0 && <div className="empty-state"><UserRound size={22} /><strong>No employees found</strong><span>Try changing your search or filters.</span></div>}</div> }
function UserCard({ user, onView, onEdit, onDelete, canManage }) { return <article className="user-card"><div className="card-top"><button className="person-button" onClick={() => onView(user)}><span className={`avatar ${user.color}`}>{user.initials}</span></button><div className="row-actions"><button aria-label={`View ${user.name}`} className="more-button" onClick={() => onView(user)}><UserRound size={15} /></button>{canManage && <button aria-label={`Edit ${user.name}`} className="more-button" onClick={() => onEdit(user)}><Edit3 size={15} /></button>}</div></div><button className="card-person-button" onClick={() => onView(user)}><strong>{user.name}</strong><small>{user.jobTitle}</small><small>{user.department} · {user.email}</small></button><div className="card-meta"><span className="role-pill"><span />{user.role}</span><span className={`status ${user.status.toLowerCase()}`}><span />{user.status}</span></div>{canManage && <button className="card-remove" onClick={() => onDelete(user)}><Trash2 size={13} /> Remove member</button>}</article> }
function MoreDots() { return <MoreHorizontal size={16} /> }

export default App