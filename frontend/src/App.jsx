import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Bell, Check, ChevronDown, Eye, EyeOff, Filter, Grid2X2, LayoutList, LogOut, Menu, Plus, Search, Settings2, ShieldCheck, Sparkles, Users, X } from 'lucide-react'

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
  if (!user) return user
  const name = user.name || 'Lumina user'
  const safeUser = { ...user, id: user.id || user._id || user._id?.toString?.(), status: user.status || 'Active' }
  return { ...safeUser, joined: safeUser.joined || new Date(safeUser.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), initials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), color: avatarColors[index % avatarColors.length] }
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
  const [view, setView] = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')

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
    const matchesQuery = `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (role === 'All roles' || user.role === role)
  }), [users, query, role])

  function addUser(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name')
    const email = form.get('email')
    request('/users', { method: 'POST', token: session.token, body: { name, email, password: `${crypto.randomUUID()}A!`, role: form.get('role') } })
      .then((newUser) => { setUsers((current) => [normalizeUser(newUser), ...current]); setShowModal(false); setToast(`${name} was invited to Lumina`); setTimeout(() => setToast(''), 3500) })
      .catch((error) => setToast(error.message))
  }

  function handleDeleteUser(userId, userName) {
    const targetUser = users.find((user) => user.id === userId)
    if (!targetUser) return
    if (targetUser.id === session.user.id) {
      setToast('Transfer admin rights before deleting your own profile')
      return
    }
    if (targetUser.role === 'Admin' && users.filter((user) => user.role === 'Admin').length <= 1) {
      setToast('Transfer admin role to another member before removing the last admin')
      return
    }
    const confirmed = window.confirm(`Remove ${userName} from the workspace? This action cannot be undone.`)
    if (!confirmed) return
    request(`/users/${userId}`, { method: 'DELETE', token: session.token })
      .then(() => {
        setUsers((current) => current.filter((user) => user.id !== userId))
        setToast(`${userName} was removed from the workspace`)
        setTimeout(() => setToast(''), 3500)
      })
      .catch((error) => setToast(error.message))
  }

  if (!session?.token) return <AuthPage onAuthenticated={handleAuth} />

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>lumina</span></div>
      <div className="workspace-switcher"><span className="workspace-avatar">L</span><span><strong>Lumina Inc.</strong><small>Workspace</small></span><ChevronDown size={15} /></div>
      <p className="nav-label">Workspace</p>
      <nav>{navItems.map(({ label, icon: Icon, count }) => <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => setActiveNav(label)}><Icon size={17} /><span>{label}</span>{count && <em>{count}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="plan-card"><span className="tiny-spark">✦</span><strong>Pro plan</strong><p>You’re making great progress.</p><a href="#usage">View usage <ArrowUpRight size={13} /></a></div><button className="profile-mini" onClick={handleLogout}><span className="avatar peach">{session.user.initials || session.user.name.slice(0, 2).toUpperCase()}</span><span><strong>{session.user.name}</strong><small>{session.user.email}</small></span><LogOut size={15} /></button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu"><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-button"><Bell size={18} /><i /></button><button className="help-button">?</button><button className="top-avatar">{session.user.name.slice(0, 2).toUpperCase()}</button></div></header>
      <section className="content-wrap">
        {activeNav === 'Overview' && <OverviewPage users={users} onNavigate={setActiveNav} />}
        {activeNav === 'People' && <PeoplePage session={session} users={users} filteredUsers={filteredUsers} query={query} setQuery={setQuery} role={role} setRole={setRole} view={view} setView={setView} onInvite={() => setShowModal(true)} onDeleteUser={handleDeleteUser} />}
        {activeNav === 'Permissions' && <PermissionsPage isAdmin={session.user.role === 'Admin'} users={users} token={session.token} onUserUpdated={(updatedUsers) => {
          const list = Array.isArray(updatedUsers) ? updatedUsers : [updatedUsers]
          setUsers((current) => current.map((user) => {
            const nextUser = list.find((member) => member.id === user.id)
            return nextUser ? normalizeUser(nextUser) : user
          }))
          const currentUser = list.find((member) => member.id === session.user.id)
          if (currentUser) setSession((prev) => ({ ...prev, user: normalizeUser(currentUser) }))
        }} onSaved={(message) => { setToast(message); setTimeout(() => setToast(''), 3000) }} />}
        {activeNav === 'Settings' && <SettingsPage user={session.user} onSaved={(message) => { setToast(message); setTimeout(() => setToast(''), 3000) }} />}
      </section>
    </main>
    {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><div className="invite-modal" onClick={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setShowModal(false)}><X size={18} /></button><span className="modal-icon"><Plus size={20} /></span><h2>Invite a teammate</h2><p>Give someone a place in your workspace.</p><form onSubmit={addUser}><label>Full name<input required name="name" placeholder="e.g. Alex Morgan" /></label><label>Email address<input required type="email" name="email" placeholder="alex@company.com" /></label><label>Role<select name="role"><option>Viewer</option><option>Editor</option><option>Admin</option></select></label><button className="primary-button" type="submit">Send invitation <ArrowUpRight size={16} /></button></form></div></div>}
    {toast && <div className="toast"><Check size={16} /> {toast}</div>}
  </div>
}

function OverviewPage({ users, onNavigate }) {
  const activeUsers = users.filter((user) => user.status !== 'Pending').length
  return <>
    <div className="page-heading"><div><p className="eyebrow">Workspace overview</p><h1>Good morning, your workspace <span>✦</span></h1><p className="subheading">A quick view of your team and access health.</p></div><button className="primary-button" onClick={() => onNavigate('People')}><Users size={17} /> View people</button></div>
    <div className="metric-row"><Metric label="Total members" value={users.length} change="Live" accent="mint" /><Metric label="Active members" value={activeUsers} change="Live" accent="peach" /><Metric label="Pending invites" value={users.length - activeUsers} change="Live" accent="lilac" /><div className="metric-note"><span className="pulse-dot" /> <strong>Workspace health</strong><span>Everything looks good</span></div></div>
    <div className="directory-head"><div><h2>Workspace activity</h2><p>Keep your team structure clear and current.</p></div></div>
    <div className="settings-panel">
      <div className="settings-section"><div><h2>People directory</h2><p>Review members, roles and invitations in one place.</p></div><button className="secondary-button" onClick={() => onNavigate('People')}><Users size={15} /> Manage people</button></div>
      <div className="settings-section"><div><h2>Role permissions</h2><p>Control what each role can access across the workspace.</p></div><button className="secondary-button" onClick={() => onNavigate('Permissions')}><ShieldCheck size={15} /> Review permissions</button></div>
    </div>
  </>
}

function PeoplePage({ session, users, filteredUsers, query, setQuery, role, setRole, view, setView, onInvite, onDeleteUser }) {
  const isAdmin = session.user.role === 'Admin'
  return <>
    <div className="page-heading"><div><p className="eyebrow">People directory</p><h1>Good morning, {session.user.name.split(' ')[0]} <span>✦</span></h1><p className="subheading">Manage your team, roles and access in one clear view.</p></div><button className="primary-button" disabled={!isAdmin} title={!isAdmin ? 'Only admins can invite members' : 'Invite a member'} onClick={onInvite}><Plus size={17} /> Invite member</button></div>
    <div className="metric-row"><Metric label="Total members" value={users.length} change="Live" accent="mint" /><Metric label="Active today" value={users.filter((user) => user.status !== 'Pending').length} change="Live" accent="peach" /><Metric label="Pending invites" value={users.filter((user) => user.status === 'Pending').length} change="Live" accent="lilac" /><div className="metric-note"><span className="pulse-dot" /> <strong>Workspace health</strong><span>Everything looks good</span></div></div>
    <div className="directory-head"><div><h2>All people <small>{filteredUsers.length} members</small></h2><p>Everyone with access to your workspace.</p></div><div className="view-toggle"><button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}><LayoutList size={16} /></button><button className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')}><Grid2X2 size={16} /></button></div></div>
    <div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people..." /></div><div className="filter-wrap"><Filter size={15} /><select value={role} onChange={(event) => setRole(event.target.value)}><option>All roles</option><option>Admin</option><option>Editor</option><option>Viewer</option></select><ChevronDown size={14} /></div><button className="filter-button"><Filter size={15} /> Filters <span>0</span></button></div>
    {view === 'list' ? <UserTable users={filteredUsers} isAdmin={isAdmin} onDeleteUser={onDeleteUser} /> : <div className="user-grid">{filteredUsers.map((user) => <UserCard key={user.id} user={user} isAdmin={isAdmin} onDeleteUser={onDeleteUser} />)}</div>}
    <footer className="table-footer"><span>Showing <strong>1–{filteredUsers.length}</strong> of <strong>{users.length}</strong> members</span><div><button disabled>←</button><button className="page-active">1</button><button>2</button><button>3</button><button>→</button></div></footer>
  </>
}

function PermissionsPage({ isAdmin, users, token, onUserUpdated, onSaved }) {
  const [roles, setRoles] = useState({ Admin: true, Editor: true, Viewer: true })
  const [selectedUser, setSelectedUser] = useState('')
  const [saving, setSaving] = useState(false)
  const permissions = ['Invite and remove members', 'Manage workspace settings', 'Edit team profiles', 'View people directory']
  async function makeAdmin() {
    if (!selectedUser) return
    setSaving(true)
    try {
      const result = await request('/users/transfer-admin', { method: 'POST', token, body: { userId: selectedUser } })
      onUserUpdated([result.targetUser, result.currentUser])
      onSaved('Member is now an Admin')
      setSelectedUser('')
    } catch (error) { onSaved(error.message) } finally { setSaving(false) }
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">Access control</p><h1>Permissions <span>✦</span></h1><p className="subheading">Define the level of access each role has in your workspace.</p></div><span className="role-badge admin">{isAdmin ? 'Admin access' : 'View only'}</span></div>
    <div className="settings-panel"><div className="settings-section"><div><h2>Workspace roles</h2><p>Roles keep permissions consistent as your team grows.</p></div><div className="settings-options">{Object.keys(roles).map((roleName) => <label className="setting-toggle" key={roleName}><input type="checkbox" checked={roles[roleName]} onChange={() => setRoles((current) => ({ ...current, [roleName]: !current[roleName] }))} disabled={roleName === 'Admin' || !isAdmin} /><span><strong>{roleName}</strong><small>{roleName === 'Admin' ? 'Full workspace control' : roleName === 'Editor' ? 'Can update people and workspace content' : 'Can view workspace information'}</small></span></label>)}</div></div>
      <div className="settings-section"><div><h2>Permission matrix</h2><p>See the default capabilities attached to each role.</p></div><div className="table-wrap"><table><thead><tr><th>Permission</th><th>Admin</th><th>Editor</th><th>Viewer</th></tr></thead><tbody>{permissions.map((permission, index) => <tr key={permission}><td>{permission}</td><td>{'Yes'}</td><td>{index < 3 ? 'Yes' : 'Yes'}</td><td>{index === 3 ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></div>
      {isAdmin && <div className="transfer-admin"><div><h2>Promote a member</h2><p>Give an existing active member full workspace access.</p></div><div className="transfer-controls"><select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}><option value="">Choose a member</option>{users.filter((user) => user.role !== 'Admin' && user.status !== 'Pending').map((user) => <option value={user.id} key={user.id}>{user.name} · {user.role}</option>)}</select><button className="primary-button" onClick={makeAdmin} disabled={!selectedUser || saving}>{saving ? 'Updating...' : 'Make admin'}</button></div></div>}
    </div>
  </>
}

function SettingsPage({ user, onSaved }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [notifications, setNotifications] = useState(true)
  function saveSettings(event) { event.preventDefault(); onSaved('Workspace settings saved') }
  return <>
    <div className="page-heading"><div><p className="eyebrow">Workspace settings</p><h1>Settings <span>✦</span></h1><p className="subheading">Keep your workspace details and notifications up to date.</p></div></div>
    <div className="settings-panel"><form onSubmit={saveSettings}><div className="settings-section"><div><h2>Profile details</h2><p>These details are visible to your workspace members.</p></div><div className="settings-fields"><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label></div></div><div className="settings-section"><div><h2>Notifications</h2><p>Choose which updates you want to receive.</p></div><div className="settings-options"><label className="setting-toggle"><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /><span><strong>Workspace activity</strong><small>Receive updates about invitations and member changes.</small></span></label></div></div><div className="settings-footer"><span>Changes apply to your account immediately.</span><button className="primary-button" type="submit"><Check size={15} /> Save changes</button></div></form></div>
  </>
}

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const strength = password.length >= 12 ? 'Strong' : password.length >= 8 ? 'Good' : password.length ? 'Weak' : ''

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const body = { email: form.get('email'), password: form.get('password') }
    if (mode === 'signup') Object.assign(body, { name: form.get('name') })
    if (mode === 'signup' && password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return }
    try {
      const result = await request(`/auth/${mode}`, { method: 'POST', body })
      onAuthenticated({ token: result.token, user: normalizeUser(result.user) })
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  return <div className="auth-shell"><div className="auth-visual"><div className="brand auth-brand"><span className="brand-mark"><Sparkles size={16} /></span><span>lumina</span></div><div className="auth-quote"><span className="quote-mark">“</span><h1>Make space for better work.</h1><p>A calmer, clearer way to manage the people who make your work matter.</p><span className="quote-credit">Lumina workspace · 2026</span><div className="auth-proof"><div><strong>4.9/5</strong><span>from happy teams</span></div><div><strong>24k+</strong><span>people organized</span></div></div></div><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></div><div className="auth-panel"><div className="auth-panel-inner"><div className="auth-mobile-brand"><div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>lumina</span></div></div><div className="auth-security"><span className="security-dot" /> Secure workspace access <span>·</span> 256-bit encryption</div><div className="auth-heading"><p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your workspace'}</p><h2>{mode === 'login' ? 'Sign in to Lumina' : 'Create your account'}</h2><p>{mode === 'login' ? 'Enter your details to continue to your workspace.' : 'Bring your team together in a few simple steps.'}</p></div><form className="auth-form" onSubmit={submit}>{mode === 'signup' && <label>Full name<input required minLength="2" name="name" placeholder="Olivia Rhye" /></label>}<label>Email address<input required type="email" name="email" placeholder="you@company.com" /></label><label>Password<div className="password-field"><input required minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} name="password" placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{mode === 'signup' && <div className="password-meter"><span className={strength.toLowerCase()} /><span className={strength.toLowerCase()} /><span className={strength.toLowerCase()} /><small>{strength ? `${strength} password` : 'Use 8 or more characters'}</small></div>}</label>{mode === 'signup' && <label>Confirm password<div className="password-field"><input required minLength="8" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" name="confirmPassword" placeholder="Repeat your password" /></div></label>}{mode === 'login' && <div className="auth-options"><label className="check-label"><input type="checkbox" /> Remember me</label><a href="#forgot">Forgot password?</a></div>}{error && <div className="auth-error">{error}</div>}<button className="primary-button auth-submit" disabled={loading}>{loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowUpRight size={16} /></button></form><p className="auth-switch">{mode === 'login' ? 'New to Lumina?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setPassword(''); setConfirmPassword('') }}>{mode === 'login' ? 'Create an account' : 'Sign in instead'}</button></p><p className="auth-legal">By continuing, you agree to Lumina’s Terms of Service and Privacy Policy.</p></div></div></div>
}

function Metric({ label, value, change, accent }) { return <div className={`metric-card ${accent}`}><span>{label}</span><div><strong>{value}</strong><em>{change}</em></div></div> }
function UserTable({ users, isAdmin, onDeleteUser }) { return <div className="table-wrap"><table><thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="person"><span className={`avatar ${user.color}`}>{user.initials}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td><td><span className="role-pill"><span />{user.role}</span></td><td><span className={`status ${user.status.toLowerCase()}`}><span />{user.status}</span></td><td className="joined">{user.joined}</td><td>{isAdmin ? <div className="row-actions"><button className="more-button"><MoreDots /></button><button className="danger-button" type="button" onClick={() => onDeleteUser(user.id, user.name)}>Remove</button></div> : <button className="more-button"><MoreDots /></button>}</td></tr>)}</tbody></table>{users.length === 0 && <div className="empty-state">No people match that search.</div>}</div> }
function UserCard({ user, isAdmin, onDeleteUser }) { return <article className="user-card"><div className="card-top"><span className={`avatar ${user.color}`}>{user.initials}</span>{isAdmin && <button className="danger-button" type="button" onClick={() => onDeleteUser(user.id, user.name)}>Remove</button>}</div><strong>{user.name}</strong><small>{user.email}</small><div className="card-meta"><span className="role-pill"><span />{user.role}</span><span className={`status ${user.status.toLowerCase()}`}><span />{user.status}</span></div></article> }
function MoreDots() { return <span className="more-dots"><i /><i /><i /></span> }

export default App