import { useId, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/app/ui/button';
import { Input } from '@/app/ui/input';
import { Label } from '@/app/ui/label';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/app/ui/dialog';

export function CreateSectionDialog({ onCreate }: { onCreate: (header: string) => void }) {
  const [open, setOpen] = useState(false);
  const [header, setHeader] = useState('');
  const id = useId();
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button variant="outline" size="sm" aria-label="Add Section"><IconPlus /><span className="hidden lg:inline">Add Section</span></Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add section</DialogTitle>
        <DialogDescription>Create a document section. Changes stay in this local preview.</DialogDescription>
      </DialogHeader>
      <form className="grid gap-6" onSubmit={event => {
        event.preventDefault();
        if (!header.trim()) return;
        onCreate(header.trim()); setHeader(''); setOpen(false);
      }}>
        <div className="grid gap-2">
          <Label htmlFor={id}>Section name</Label>
          <Input id={id} required value={header} onChange={event => setHeader(event.target.value)} placeholder="e.g. Project overview" />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit">Create section</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
