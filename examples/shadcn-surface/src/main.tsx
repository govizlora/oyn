import { ThemeProvider, ThemeToggle } from '@/components/theme';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, LayoutDashboard, Folder, Users, Settings, Plus, MoreHorizontal, ArrowRight, ChevronsUpDown, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SurfaceButton } from '@/components/surface-button';
import { Button } from '@/components/ui/button';
import { SurfaceDialogContent as DialogContent } from '@/components/surface-dialog';
import { SurfaceCard } from '@/components/surface-card';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import './style.css';

const navigation = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Projects', icon: Folder },
  { label: 'Team', icon: Users }, { label: 'Settings', icon: Settings },
];
const statuses = ['Planning', 'In progress', 'Review', 'Completed'];
const people = ['Alex Morgan', 'Sam Chen', 'Jordan Lee', 'Taylor Brooks'];
const initialProjects = ['Website redesign', 'Customer onboarding', 'Mobile app launch', 'Design system', 'API documentation', 'Billing experience', 'Analytics dashboard', 'Accessibility audit', 'Partner portal', 'Notification center', 'Search improvements', 'Customer feedback'].map((name, i) => ({
  id: i + 1001, name, owner: people[i % 4], status: statuses[i % 4], priority: ['High', 'Medium', 'Low'][i % 3], progress: [15, 55, 85, 100][i % 4],
}));
type Project = typeof initialProjects[number];

// Composition helpers only: all behavior and styling remain with the registry components.
function Choice({ label, options, value, onChange, name, defaultValue }: { label: string; options: string[]; value?: string; onChange?: (value: string) => void; name?: string; defaultValue?: string }) {
  return <Select value={value} onValueChange={onChange} name={name} defaultValue={defaultValue}>
    <SelectTrigger aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
    <SelectContent>{options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
  </Select>;
}
function App() {
  const sidebar = useSidebar();
  const [page, setPage] = useState('Overview');
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('Project name');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<Project | null>(null);
  const [dialog, setDialog] = useState<'project' | 'invite' | 'archive' | null>(null);
  const [notice, setNotice] = useState('');
  const [members, setMembers] = useState(people.map((name, i) => ({ name, email: name.split(' ')[0].toLowerCase() + '@example.com', role: i === 0 ? 'Admin' : 'Member' })));
  const visible = projects.filter(p => (p.name + p.owner).toLowerCase().includes(query.toLowerCase()) && (status === 'All' || status === p.status)).sort((a, b) => sort === 'Project name' ? a.name.localeCompare(b.name) : a.status.localeCompare(b.status));
  const currentOffset = Math.min(offset, Math.max(0, Math.ceil(visible.length / 6) - 1));
  const rows = visible.slice(currentOffset * 6, currentOffset * 6 + 6);
  const navigate = (next: string) => { setPage(next); sidebar.setOpenMobile(false); };
  return <>
    <Sidebar collapsible="icon">
      <SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" onClick={() => navigate('Overview')} tooltip="Acme Workspace"><Folder /><span className="font-semibold">Acme Workspace</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader>
      <SidebarContent><SidebarGroup><SidebarGroupLabel>Workspace</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{navigation.map(({ label, icon: Icon }) => <SidebarMenuItem key={label}><SidebarMenuButton tooltip={label} isActive={page === label} onClick={() => navigate(label)}><Icon /><span>{label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Surface / shadcn/ui · Buttons + Cards + Dialogs<br />UI demo · Resets on refresh</div>
        <ThemeToggle />
        <SidebarMenu><SidebarMenuItem><DropdownMenu><DropdownMenuTrigger asChild><SidebarMenuButton size="lg"><Avatar><AvatarFallback>AM</AvatarFallback></Avatar><div className="flex flex-col text-left"><span>Alex Morgan</span><span className="text-xs text-muted-foreground">alex@example.com</span></div><ChevronsUpDown className="ml-auto" /></SidebarMenuButton></DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end"><DropdownMenuLabel>My account</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => navigate('Settings')}>Account settings</DropdownMenuItem><DropdownMenuItem onSelect={() => navigate('Team')}>Manage team</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem asChild><a href="http://127.0.0.1:5173">Back to studies</a></DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-w-0">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-6">
        <SidebarTrigger /><Separator orientation="vertical" className="h-4" /><span className="hidden text-sm text-muted-foreground sm:inline">Workspace /</span><span className="text-sm">{page}</span>
        <div className="ml-auto"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setNotice('You’re all caught up')}>You’re all caught up</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </header>
      <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold tracking-tight">{page}</h1><p className="mt-1 text-muted-foreground">{page === 'Overview' ? 'Welcome back, Alex. Here’s what’s happening with your team.' : page === 'Projects' ? 'Plan, track, and deliver your next great idea.' : page === 'Team' ? 'The people who make it happen.' : 'Manage your workspace and preferences.'}</p></div>
          {page !== 'Settings' && <SurfaceButton onClick={() => setDialog(page === 'Team' ? 'invite' : 'project')}><Plus />{page === 'Team' ? 'Invite member' : 'New project'}</SurfaceButton>}
        </div>
        {notice && <Alert role="status"><AlertDescription><div className="flex items-center justify-between gap-4"><span>{notice}</span><Button variant="ghost" size="icon" aria-label="Dismiss notification" onClick={() => setNotice('')}><X /></Button></div></AlertDescription></Alert>}

        {page === 'Overview' && <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[['Total projects', projects.length, 'Across your workspace'], ['In progress', projects.filter(p => p.status === 'In progress').length, 'Moving toward the next milestone'], ['Completed', projects.filter(p => p.status === 'Completed').length, 'Ready to celebrate'], ['Team members', members.length, 'Working better together']].map(([label, value, caption]) => <SurfaceCard key={label}><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{caption}</p></CardContent></SurfaceCard>)}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <SurfaceCard className="lg:col-span-2"><CardHeader><div className="flex items-center justify-between"><CardTitle>Project overview</CardTitle><Button variant="ghost" onClick={() => navigate('Projects')}>View all<ArrowRight /></Button></div><CardDescription>Progress across your current initiatives.</CardDescription></CardHeader><CardContent className="space-y-6">{projects.slice(0, 5).map(p => <div key={p.id} className="space-y-2"><div className="flex items-center justify-between gap-4"><Button variant="link" onClick={() => setDetail(p)}>{p.name}</Button><span className="text-sm text-muted-foreground">{p.progress}%</span></div><Progress aria-label={p.name + ' progress'} value={p.progress} /></div>)}</CardContent></SurfaceCard>
            <SurfaceCard><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>The latest from your team.</CardDescription></CardHeader><CardContent className="space-y-5">{['Alex created Website redesign', 'Sam updated Customer onboarding', 'Jordan completed Design system', 'Taylor joined the workspace'].map((text, i) => <div key={text} className="flex gap-3"><Avatar><AvatarFallback>{people[i].split(' ').map(s => s[0]).join('')}</AvatarFallback></Avatar><div><p className="text-sm">{text}</p><p className="mt-1 text-xs text-muted-foreground">{['Just now', '25 minutes ago', '2 hours ago', 'Yesterday'][i]}</p></div></div>)}</CardContent></SurfaceCard>
          </div>
          <p className="text-sm text-muted-foreground">This is a local UI demo. Nothing is sent or saved to a server. Explore projects, invite a teammate, or try workspace settings.</p>
        </>}

        {page === 'Projects' && <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={e => { setQuery(e.target.value); setOffset(0); }} className="sm:max-w-sm" />
            <div className="sm:w-44"><Choice label="Status" options={['All', ...statuses]} value={status} onChange={s => { setStatus(s); setOffset(0); }} /></div>
            <div className="sm:w-44"><Choice label="Sort by" options={['Project name', 'Status']} value={sort} onChange={setSort} /></div>
          </div>
          {!!selected.length && <div className="flex flex-wrap items-center gap-3 text-sm"><span>{selected.length} selected</span><SurfaceButton variant="destructive" onClick={() => setDialog('archive')}>Archive selected</SurfaceButton><Button variant="ghost" onClick={() => setSelected([])}>Clear selection</Button></div>}
          <div className="rounded-md border"><Table aria-label="Projects"><TableHeader><TableRow><TableHead><Checkbox aria-label="Select page" checked={rows.length > 0 && rows.every(p => selected.includes(p.id)) ? true : rows.some(p => selected.includes(p.id)) ? 'indeterminate' : false} onCheckedChange={checked => setSelected(checked ? [...new Set([...selected, ...rows.map(p => p.id)])] : selected.filter(id => !rows.some(p => p.id === id)))} /></TableHead>{['Project', 'Status', 'Priority', 'Owner', 'Actions'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{rows.map(p => <TableRow key={p.id} data-state={selected.includes(p.id) ? 'selected' : undefined}>
              <TableCell><Checkbox aria-label={'Select ' + p.name} checked={selected.includes(p.id)} onCheckedChange={checked => setSelected(checked ? [...selected, p.id] : selected.filter(id => id !== p.id))} /></TableCell>
              <TableCell><Button variant="link" onClick={() => setDetail(p)}>{p.name}</Button><div className="px-4 text-xs text-muted-foreground">PRJ-{p.id}</div></TableCell><TableCell><Badge variant="outline">{p.status}</Badge></TableCell><TableCell>{p.priority}</TableCell><TableCell className="whitespace-nowrap">{p.owner}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={'Actions for ' + p.name}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setDetail(p)}>View details</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => { setSelected([p.id]); setDialog('archive'); }}>Archive project</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
            </TableRow>)}{!rows.length && <TableRow><TableCell colSpan={6} className="h-32 text-center">No projects found. Try a different search or status.</TableCell></TableRow>}</TableBody>
          </Table></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{visible.length} projects · Page {currentOffset + 1} of {Math.max(1, Math.ceil(visible.length / 6))}</p><div className="flex gap-2"><SurfaceButton variant="outline" disabled={!currentOffset} onClick={() => setOffset(currentOffset - 1)}>Previous</SurfaceButton><SurfaceButton variant="outline" disabled={(currentOffset + 1) * 6 >= visible.length} onClick={() => setOffset(currentOffset + 1)}>Next</SurfaceButton></div></div>
        </>}

        {page === 'Team' && <div className="rounded-md border"><Table aria-label="Team members"><TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead></TableRow></TableHeader><TableBody>{members.map((m, i) => <TableRow key={m.email}><TableCell><div className="flex items-center gap-3 whitespace-nowrap"><Avatar><AvatarFallback>{m.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>{m.name}</div></TableCell><TableCell>{m.email}</TableCell><TableCell><div className="min-w-32"><Choice label={'Role for ' + m.name} options={['Admin', 'Member', 'Viewer']} value={m.role} onChange={role => setMembers(members.map((member, j) => j === i ? { ...member, role } : member))} /></div></TableCell></TableRow>)}</TableBody></Table></div>}

        {page === 'Settings' && <Tabs defaultValue="general" className="max-w-2xl"><TabsList><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger></TabsList>
          <TabsContent value="general"><SurfaceCard><CardHeader><CardTitle>Workspace details</CardTitle><CardDescription>Update the basics for your team.</CardDescription></CardHeader><CardContent><form className="space-y-5" onSubmit={e => { e.preventDefault(); setNotice('Settings saved for this preview'); }}><div className="space-y-2"><Label htmlFor="workspace">Workspace name</Label><Input id="workspace" defaultValue="Acme Workspace" required /></div><div className="space-y-2"><Label htmlFor="contact">Contact email</Label><Input id="contact" type="email" defaultValue="alex@example.com" required /></div><div className="space-y-2"><Label>Timezone</Label><Choice label="Timezone" options={['America/Vancouver', 'America/New_York', 'Europe/London']} defaultValue="America/Vancouver" /></div><div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" defaultValue="A place for our team to do great work." /></div><SurfaceButton type="submit">Save changes</SurfaceButton></form></CardContent></SurfaceCard></TabsContent>
          <TabsContent value="notifications"><SurfaceCard><CardHeader><CardTitle>Notification preferences</CardTitle><CardDescription>Choose what you’d like to hear about.</CardDescription></CardHeader><CardContent><form className="space-y-6" onSubmit={e => { e.preventDefault(); setNotice('Settings saved for this preview'); }}>{['Weekly project digest', 'Mentions and comments', 'Product updates'].map((label, i) => <div key={label} className="flex items-center justify-between gap-4"><Label htmlFor={'notification-' + i}>{label}</Label><Switch id={'notification-' + i} defaultChecked={i < 2} /></div>)}<SurfaceButton type="submit">Save changes</SurfaceButton></form></CardContent></SurfaceCard></TabsContent>
        </Tabs>}
      </main>
    </SidebarInset>

    <Sheet open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}>
      <SheetContent className="overflow-y-auto">{detail && <>
        <SheetHeader><SheetTitle>{detail.name}</SheetTitle><SheetDescription>PRJ-{detail.id} · Bring the team together to plan, build, and deliver this project.</SheetDescription></SheetHeader>
        <div className="mt-6 space-y-6"><Separator /><div className="space-y-2"><Label>Project status</Label><Choice label="Project status" options={statuses} value={detail.status} onChange={status => { const next = { ...detail, status, progress: [15, 55, 85, 100][statuses.indexOf(status)] }; setDetail(next); setProjects(projects.map(p => p.id === next.id ? next : p)); }} /></div>
          <p className="text-sm">Owner · {detail.owner}</p><p className="text-sm">Priority · {detail.priority}</p><div className="space-y-2"><p className="text-sm">Progress · {detail.progress}%</p><Progress value={detail.progress} /></div><Separator />
          <div className="space-y-3"><Label htmlFor="note">Project notes</Label><Textarea id="note" placeholder="Add a note…" rows={4} /><SurfaceButton variant="outline" onClick={() => setNotice('Note added to this preview')}>Add note</SurfaceButton></div>
        </div>
      </>}</SheetContent>
    </Sheet>

    <Dialog open={!!dialog} onOpenChange={open => { if (!open) setDialog(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{dialog === 'project' ? 'Create project' : dialog === 'invite' ? 'Invite a teammate' : 'Archive projects?'}</DialogTitle><DialogDescription>{dialog === 'project' ? 'Give your next idea a home.' : dialog === 'invite' ? 'Try the invitation flow. No email will be sent.' : 'The selected projects will be removed from this preview. Refresh to reset the demo.'}</DialogDescription></DialogHeader>
        <form className="space-y-5" onSubmit={e => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          if (dialog === 'project') { setProjects([...projects, { id: Date.now(), name: String(data.get('name')), owner: String(data.get('owner')), priority: 'Medium', status: 'Planning', progress: 0 }]); setNotice('Project created'); navigate('Projects'); }
          if (dialog === 'invite') { const email = String(data.get('email')); setMembers([...members, { name: email.split('@')[0], email, role: String(data.get('role')) }]); setNotice('Member added to preview — no email sent'); }
          if (dialog === 'archive') { setProjects(projects.filter(p => !selected.includes(p.id))); setSelected([]); setNotice('Projects archived'); }
          setDialog(null);
        }}>
          {dialog === 'project' && <><div className="space-y-2"><Label htmlFor="project-name">Project name</Label><Input id="project-name" name="name" required autoFocus /></div><div className="space-y-2"><Label htmlFor="project-description">Description</Label><Textarea id="project-description" name="description" /></div><div className="space-y-2"><Label>Owner</Label><Choice label="Owner" name="owner" options={people} defaultValue={people[0]} /></div></>}
          {dialog === 'invite' && <><div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" required autoFocus /></div><div className="space-y-2"><Label>Role</Label><Choice label="Role" name="role" options={['Admin', 'Member', 'Viewer']} defaultValue="Member" /></div></>}
          <DialogFooter><SurfaceButton type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</SurfaceButton><SurfaceButton type="submit" variant={dialog === 'archive' ? 'destructive' : 'default'}>{dialog === 'project' ? 'Create project' : dialog === 'invite' ? 'Add invitation' : 'Archive'}</SurfaceButton></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider><SidebarProvider><App /></SidebarProvider></ThemeProvider></StrictMode>);
