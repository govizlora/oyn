import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AppBar, Alert, Avatar, Box, Breadcrumbs, Button, Card, CardContent, Checkbox, Chip,
  CssBaseline, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Divider, Drawer, FormControlLabel, IconButton, LinearProgress, List,
  ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Snackbar, Stack,
  Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, TextField, ThemeProvider, Toolbar, Tooltip, Typography, createTheme, useMediaQuery,
} from '@mui/material';
import { DashboardOutlined, FolderOutlined, PeopleOutlined, SettingsOutlined, Menu as MenuIcon, Add, MoreVert, NotificationsNone, Close, ArrowForward } from '@mui/icons-material';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const theme = createTheme();
const navigation = [
  { label: 'Overview', icon: DashboardOutlined }, { label: 'Projects', icon: FolderOutlined },
  { label: 'Team', icon: PeopleOutlined }, { label: 'Settings', icon: SettingsOutlined },
];
const statuses = ['Planning', 'In progress', 'Review', 'Completed'];
const people = ['Alex Morgan', 'Sam Chen', 'Jordan Lee', 'Taylor Brooks'];
const initialProjects = ['Website redesign', 'Customer onboarding', 'Mobile app launch', 'Design system', 'API documentation', 'Billing experience', 'Analytics dashboard', 'Accessibility audit', 'Partner portal', 'Notification center', 'Search improvements', 'Customer feedback'].map((name, i) => ({
  id: i + 1001, name, owner: people[i % 4], status: statuses[i % 4], priority: ['High', 'Medium', 'Low'][i % 3], progress: [15, 55, 85, 100][i % 4],
}));
type Project = typeof initialProjects[number];

function App() {
  const [page, setPage] = useState('Overview');
  const [mobileNav, setMobileNav] = useState(false);
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [menu, setMenu] = useState<{ anchor: HTMLElement; kind: 'account' | 'notifications' | 'project'; project?: Project } | null>(null);
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('name');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<Project | null>(null);
  const [dialog, setDialog] = useState<'project' | 'invite' | 'archive' | null>(null);
  const [notice, setNotice] = useState('');
  const [settingsTab, setSettingsTab] = useState(0);
  const [members, setMembers] = useState(people.map((name, i) => ({ name, email: name.split(' ')[0].toLowerCase() + '@example.com', role: i === 0 ? 'Admin' : 'Member' })));
  const visible = projects.filter(p => (p.name + p.owner).toLowerCase().includes(query.toLowerCase()) && (status === 'All' || status === p.status)).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : a.status.localeCompare(b.status));
  const currentOffset = Math.min(offset, Math.max(0, Math.ceil(visible.length / 6) - 1));
  const rows = visible.slice(currentOffset * 6, currentOffset * 6 + 6);
  const navigate = (next: string) => { setPage(next); setMobileNav(false); };
  const closeDialog = () => setDialog(null);
  const side = <Box sx={{ width: 240 }}>
    <Toolbar><Typography variant="h6">Acme Workspace</Typography></Toolbar><Divider />
    <List component="nav" aria-label="Main navigation">{navigation.map(({ label, icon: Icon }) =>
      <ListItemButton key={label} selected={page === label} onClick={() => navigate(label)}><ListItemIcon><Icon /></ListItemIcon><ListItemText primary={label} /></ListItemButton>
    )}</List><Divider />
    <Box sx={{ p: 2 }}><Typography variant="overline">Original / Material UI</Typography><Typography variant="body2" color="text.secondary">UI demo · Changes reset on refresh.</Typography></Box>
  </Box>;
  return <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    <Drawer variant={desktop ? 'permanent' : 'temporary'} open={desktop || mobileNav} onClose={() => setMobileNav(false)} sx={{ width: desktop ? 240 : 0, flexShrink: 0 }}>{side}</Drawer>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <AppBar position="sticky" color="default">
        <Toolbar sx={{ gap: 2 }}>
          {!desktop && <IconButton aria-label="Open navigation" onClick={() => setMobileNav(true)}><MenuIcon /></IconButton>}
          <Breadcrumbs sx={{ flex: 1 }}><Typography color="text.secondary">Workspace</Typography><Typography>{page}</Typography></Breadcrumbs>
          <Tooltip title="Notifications"><IconButton aria-label="Notifications" onClick={e => setMenu({ anchor: e.currentTarget, kind: 'notifications' })}><NotificationsNone /></IconButton></Tooltip>
          <Tooltip title="Account"><IconButton aria-label="Account menu" onClick={e => setMenu({ anchor: e.currentTarget, kind: 'account' })}><Avatar>AM</Avatar></IconButton></Tooltip>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ p: { xs: 2, md: 4 }, maxWidth: 1440, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 4 }}>
          <Box><Typography variant="h4" component="h1">{page}</Typography><Typography color="text.secondary">{page === 'Overview' ? 'Welcome back, Alex. Here’s what’s happening with your team.' : page === 'Projects' ? 'Plan, track, and deliver your next great idea.' : page === 'Team' ? 'The people who make it happen.' : 'Manage your workspace and preferences.'}</Typography></Box>
          {page !== 'Settings' && <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(page === 'Team' ? 'invite' : 'project')}>{page === 'Team' ? 'Invite member' : 'New project'}</Button>}
        </Stack>

        {page === 'Overview' && <Stack spacing={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
            {[['Total projects', projects.length, 'Across your workspace'], ['In progress', projects.filter(p => p.status === 'In progress').length, 'Moving toward the next milestone'], ['Completed', projects.filter(p => p.status === 'Completed').length, 'Ready to celebrate'], ['Team members', members.length, 'Working better together']].map(([label, value, caption]) =>
              <Card key={label}><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h3" sx={{ my: 1 }}>{value}</Typography><Typography variant="body2" color="text.secondary">{caption}</Typography></CardContent></Card>)}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
            <Card><CardContent><Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="h6">Project overview</Typography><Button endIcon={<ArrowForward />} onClick={() => navigate('Projects')}>View all</Button></Stack>
              <Stack spacing={3} sx={{ mt: 3 }}>{projects.slice(0, 5).map(p => <Box key={p.id}><Stack direction="row" sx={{ justifyContent: 'space-between' }}><Button onClick={() => setDetail(p)}>{p.name}</Button><Typography variant="body2">{p.progress}%</Typography></Stack><LinearProgress aria-label={p.name + ' progress'} variant="determinate" value={p.progress} /></Box>)}</Stack>
            </CardContent></Card>
            <Card><CardContent><Typography variant="h6">Recent activity</Typography><List>{['Alex created Website redesign', 'Sam updated Customer onboarding', 'Jordan completed Design system', 'Taylor joined the workspace'].map((text, i) => <Box key={text}><ListItemText sx={{ py: 1 }} primary={text} secondary={['Just now', '25 minutes ago', '2 hours ago', 'Yesterday'][i]} />{i < 3 && <Divider />}</Box>)}</List></CardContent></Card>
          </Box>
          <Alert severity="info">This is a local UI demo. Explore the projects, invite a teammate, or try workspace settings. Nothing is sent or saved to a server.</Alert>
        </Stack>}

        {page === 'Projects' && <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
            <TextField label="Search projects" value={query} onChange={e => { setQuery(e.target.value); setOffset(0); }} size="small" sx={{ flex: 1 }} />
            <TextField select label="Status" value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }} size="small" sx={{ minWidth: 160 }}>{['All', ...statuses].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
            <TextField select label="Sort by" value={sort} onChange={e => setSort(e.target.value)} size="small" sx={{ minWidth: 160 }}><MenuItem value="name">Project name</MenuItem><MenuItem value="status">Status</MenuItem></TextField>
          </Stack>
          {selected.length > 0 && <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}><Typography>{selected.length} selected</Typography><Button color="error" onClick={() => setDialog('archive')}>Archive selected</Button><Button onClick={() => setSelected([])}>Clear selection</Button></Stack>}
          <Card><TableContainer><Table aria-label="Projects"><TableHead><TableRow><TableCell padding="checkbox"><Checkbox slotProps={{ input: { 'aria-label': 'Select page' } }} checked={rows.length > 0 && rows.every(p => selected.includes(p.id))} indeterminate={rows.some(p => selected.includes(p.id)) && !rows.every(p => selected.includes(p.id))} onChange={(_, checked) => setSelected(checked ? [...new Set([...selected, ...rows.map(p => p.id)])] : selected.filter(id => !rows.some(p => p.id === id)))} /></TableCell>{['Project', 'Status', 'Priority', 'Owner', 'Actions'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>{rows.map(p => <TableRow key={p.id} hover selected={selected.includes(p.id)}>
              <TableCell padding="checkbox"><Checkbox slotProps={{ input: { 'aria-label': 'Select ' + p.name } }} checked={selected.includes(p.id)} onChange={(_, checked) => setSelected(checked ? [...selected, p.id] : selected.filter(id => id !== p.id))} /></TableCell>
              <TableCell><Button onClick={() => setDetail(p)}>{p.name}</Button><Typography variant="caption" sx={{ display: 'block' }}>PRJ-{p.id}</Typography></TableCell>
              <TableCell><Chip label={p.status} size="small" variant="outlined" /></TableCell><TableCell>{p.priority}</TableCell><TableCell>{p.owner}</TableCell>
              <TableCell><IconButton aria-label={'Actions for ' + p.name} onClick={e => setMenu({ anchor: e.currentTarget, kind: 'project', project: p })}><MoreVert /></IconButton></TableCell>
            </TableRow>)}{!rows.length && <TableRow><TableCell colSpan={6} align="center"><Typography sx={{ py: 5 }}>No projects found. Try a different search or status.</Typography></TableCell></TableRow>}</TableBody>
          </Table></TableContainer></Card>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="body2">{visible.length} projects · Page {currentOffset + 1} of {Math.max(1, Math.ceil(visible.length / 6))}</Typography><Stack direction="row" sx={{ gap: 1 }}><Button variant="outlined" disabled={!currentOffset} onClick={() => setOffset(currentOffset - 1)}>Previous</Button><Button variant="outlined" disabled={(currentOffset + 1) * 6 >= visible.length} onClick={() => setOffset(currentOffset + 1)}>Next</Button></Stack></Stack>
        </Stack>}

        {page === 'Team' && <Card><TableContainer><Table aria-label="Team members"><TableHead><TableRow><TableCell>Member</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell></TableRow></TableHead><TableBody>{members.map((m, i) => <TableRow key={m.email}><TableCell><Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}><Avatar>{m.name.slice(0, 2).toUpperCase()}</Avatar>{m.name}</Stack></TableCell><TableCell>{m.email}</TableCell><TableCell><TextField select size="small" label={'Role for ' + m.name} value={m.role} onChange={e => setMembers(members.map((member, j) => j === i ? { ...member, role: e.target.value } : member))} sx={{ minWidth: 160 }}>{['Admin', 'Member', 'Viewer'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}</TextField></TableCell></TableRow>)}</TableBody></Table></TableContainer></Card>}

        {page === 'Settings' && <Box sx={{ maxWidth: 720 }}><Tabs value={settingsTab} onChange={(_, value) => setSettingsTab(value)} aria-label="Settings sections"><Tab label="General" /><Tab label="Notifications" /></Tabs>
          <Card sx={{ mt: 3 }}><CardContent><Box component="form" onSubmit={e => { e.preventDefault(); setNotice('Settings saved for this preview'); }}><Stack spacing={3}>
            {settingsTab === 0 ? <><Typography variant="h6">Workspace details</Typography><TextField label="Workspace name" defaultValue="Acme Workspace" required /><TextField label="Contact email" type="email" defaultValue="alex@example.com" required /><TextField select label="Timezone" defaultValue="America/Vancouver">{['America/Vancouver', 'America/New_York', 'Europe/London'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField><TextField label="Description" multiline rows={3} defaultValue="A place for our team to do great work." /></> : <><Typography variant="h6">Notification preferences</Typography><FormControlLabel control={<Switch defaultChecked />} label="Weekly project digest" /><FormControlLabel control={<Switch defaultChecked />} label="Mentions and comments" /><FormControlLabel control={<Switch />} label="Product updates" /></>}
            <Box><Button type="submit" variant="contained">Save changes</Button></Box>
          </Stack></Box></CardContent></Card>
        </Box>}
      </Box>
    </Box>

    <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
      {menu?.kind === 'account' ? [<MenuItem key="profile" onClick={() => { navigate('Settings'); setMenu(null); }}>Account settings</MenuItem>, <MenuItem key="team" onClick={() => { navigate('Team'); setMenu(null); }}>Manage team</MenuItem>, <MenuItem key="studies" component="a" href="http://127.0.0.1:5173">Back to studies</MenuItem>] : menu?.kind === 'notifications' ? [<MenuItem key="notification" onClick={() => { setMenu(null); setNotice('You’re all caught up'); }}>You’re all caught up</MenuItem>] : [<MenuItem key="details" onClick={() => { setDetail(menu!.project!); setMenu(null); }}>View details</MenuItem>, <MenuItem key="archive" onClick={() => { setSelected([menu!.project!.id]); setDialog('archive'); setMenu(null); }}>Archive project</MenuItem>]}
    </Menu>

    <Drawer anchor="right" open={!!detail} onClose={() => setDetail(null)} slotProps={{ paper: { 'aria-labelledby': 'project-details' } }}>
      {detail && <Box sx={{ width: { xs: '100vw', sm: 420 }, p: 3 }}><Stack spacing={3}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="overline">PRJ-{detail.id}</Typography><IconButton aria-label="Close details" onClick={() => setDetail(null)}><Close /></IconButton></Stack>
        <Typography variant="h5" id="project-details">{detail.name}</Typography><Typography color="text.secondary">Bring the team together to plan, build, and deliver this project. Keep decisions and updates in one place.</Typography><Divider />
        <TextField select label="Project status" value={detail.status} onChange={e => { const next = { ...detail, status: e.target.value, progress: [15, 55, 85, 100][statuses.indexOf(e.target.value)] }; setDetail(next); setProjects(projects.map(p => p.id === next.id ? next : p)); }}>{statuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
        <Typography>Owner · {detail.owner}</Typography><Typography>Priority · {detail.priority}</Typography>
        <Box><Typography gutterBottom>Progress · {detail.progress}%</Typography><LinearProgress variant="determinate" value={detail.progress} /></Box>
        <Divider /><Typography variant="h6">Project notes</Typography><TextField label="Add a note" multiline rows={4} /><Button variant="outlined" onClick={() => setNotice('Note added to this preview')}>Add note</Button>
      </Stack></Box>}
    </Drawer>

    <Dialog open={!!dialog} onClose={closeDialog} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={e => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (dialog === 'project') { setProjects([...projects, { id: Date.now(), name: String(data.get('name')), owner: String(data.get('owner')), priority: 'Medium', status: 'Planning', progress: 0 }]); setNotice('Project created'); navigate('Projects'); }
        if (dialog === 'invite') { const email = String(data.get('email')); setMembers([...members, { name: email.split('@')[0], email, role: String(data.get('role')) }]); setNotice('Member added to preview — no email sent'); }
        if (dialog === 'archive') { setProjects(projects.filter(p => !selected.includes(p.id))); setSelected([]); setNotice('Projects archived'); }
        closeDialog();
      }}>
        <DialogTitle>{dialog === 'project' ? 'Create project' : dialog === 'invite' ? 'Invite a teammate' : 'Archive projects?'}</DialogTitle>
        <DialogContent><DialogContentText sx={{ mb: 3 }}>{dialog === 'project' ? 'Give your next idea a home.' : dialog === 'invite' ? 'Try the invitation flow. No email will be sent.' : 'The selected projects will be removed from this preview. Refresh to reset the demo.'}</DialogContentText>
          {dialog === 'project' && <Stack spacing={3}><TextField autoFocus required name="name" label="Project name" /><TextField label="Description" name="description" multiline rows={3} /><TextField select label="Owner" name="owner" defaultValue={people[0]}>{people.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Stack>}
          {dialog === 'invite' && <Stack spacing={3}><TextField autoFocus required name="email" label="Email address" type="email" /><TextField select name="role" label="Role" defaultValue="Member">{['Admin', 'Member', 'Viewer'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}</TextField></Stack>}
        </DialogContent><DialogActions><Button onClick={closeDialog}>Cancel</Button><Button type="submit" variant="contained" color={dialog === 'archive' ? 'error' : 'primary'}>{dialog === 'project' ? 'Create project' : dialog === 'invite' ? 'Add invitation' : 'Archive'}</Button></DialogActions>
      </Box>
    </Dialog>
    <Snackbar open={!!notice} autoHideDuration={4000} onClose={() => setNotice('')} message={notice} action={<IconButton color="inherit" aria-label="Dismiss notification" onClick={() => setNotice('')}><Close /></IconButton>} />
  </Box>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider></StrictMode>);
