import { useState } from 'react';
import { Icon, Key, Surface } from '../controls';
import { Check } from '../everyday';
import { Field, Plate, Rail } from './shared';

export function OrderedList() {
  const [items, setItems] = useState([
    { id: 1, name: 'Collect', done: true },
    { id: 2, name: 'Explore', done: false },
    { id: 3, name: 'Compose', done: false },
  ]);
  const [active, setActive] = useState(2);
  const move = (delta: number) =>
    setItems((old) => {
      const index = old.findIndex((item) => item.id === active),
        next = index + delta;
      if (next < 0 || next >= old.length) return old;
      const copy = [...old];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  return (
    <div className="obj-stack">
      <ol className="obj-order-list">
        {items.map((item, i) => (
          <li key={item.id}>
            <Surface
              elevation={active === item.id ? 5 : 0}
              className="obj-order-row"
            >
              <button
                type="button"
                aria-label={`Select ${item.name}`}
                aria-pressed={active === item.id}
                onClick={() => setActive(item.id)}
              >
                <small>0{i + 1}</small>
                <span>{item.name}</span>
              </button>
              <Check
                label={`Complete ${item.name}`}
                checked={item.done}
                onChange={(done) =>
                  setItems((old) =>
                    old.map((row) =>
                      row.id === item.id ? { ...row, done } : row,
                    ),
                  )
                }
              />
            </Surface>
          </li>
        ))}
      </ol>
      <div className="obj-row centered">
        <Key label="Move selected up" onClick={() => move(-1)}>
          <span className="obj-rotate">
            <Icon name="left" />
          </span>
        </Key>
        <Key label="Move selected down" onClick={() => move(1)}>
          <span className="obj-rotate">
            <Icon name="right" />
          </span>
        </Key>
      </div>
    </div>
  );
}
export function Kanban() {
  const [tasks, setTasks] = useState([
    { name: 'Shape', stage: 0 },
    { name: 'Color', stage: 1 },
    { name: 'Light', stage: 2 },
  ]);
  return (
    <div className="obj-stack">
      <div className="obj-kanban">
        {['Next', 'Now', 'Done'].map((stage, i) => (
          <div key={stage}>
            <header>
              {stage}
              <small>{tasks.filter((t) => t.stage === i).length}</small>
            </header>
            {tasks
              .filter((task) => task.stage === i)
              .map((task) => (
                <Surface
                  key={task.name}
                  elevation={5}
                  tone={(['lilac', 'yellow', 'sage'] as const)[i]}
                  className="obj-kanban-card"
                >
                  <Icon name={(['diamond', 'circle', 'sun'] as const)[i]} />
                  <strong>{task.name}</strong>
                  <button
                    type="button"
                    aria-label={`Move ${task.name} to ${['Next', 'Now', 'Done'][(i + 1) % 3]}`}
                    onClick={() =>
                      setTasks((old) =>
                        old.map((t) =>
                          t.name === task.name
                            ? { ...t, stage: (t.stage + 1) % 3 }
                            : t,
                        ),
                      )
                    }
                  >
                    <Icon name="right" size={14} />
                  </button>
                </Surface>
              ))}
          </div>
        ))}
      </div>
      <span className="obj-caption">Small steps, visible movement.</span>
    </div>
  );
}
export function LocalFiles() {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  return (
    <div className="obj-stack">
      <label className="obj-dropzone">
        <Surface elevation={-3}>
          <Icon name="plus" size={30} />
          <strong>Choose local files</strong>
          <span>Names only · nothing uploaded</span>
        </Surface>
        <input
          aria-label="Choose local files"
          type="file"
          multiple
          onChange={(e) =>
            setFiles(
              Array.from(e.target.files ?? [], (file) => ({
                name: file.name,
                size: file.size,
              })),
            )
          }
        />
      </label>
      <ul className="obj-file-names">
        {files.slice(0, 3).map((file, i) => (
          <li key={`${file.name}-${i}`}>
            <Icon name="file" size={14} />
            <span>{file.name}</span>
            <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
          </li>
        ))}
      </ul>
      <span className="obj-caption" role="status">
        {files.length
          ? `${files.length} file${files.length === 1 ? '' : 's'} selected`
          : 'Local file picker'}
      </span>
    </div>
  );
}
export function TagEditor() {
  const [tags, setTags] = useState(['soft', 'useful', 'unexpected']),
    [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.trim().slice(0, 20);
    if (tag && !tags.includes(tag) && tags.length < 8) setTags([...tags, tag]);
    setDraft('');
  };
  return (
    <div className="obj-stack">
      <div className="obj-edit-tags">
        {tags.map((tag, i) => (
          <Surface
            key={tag}
            className="obj-edit-tag"
            elevation={4}
            tone={(['sage', 'lilac', 'yellow'] as const)[i % 3]}
          >
            <span>{tag}</span>
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => setTags(tags.filter((t) => t !== tag))}
            >
              ×
            </button>
          </Surface>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Field label={`${tags.length} / 8 TAGS`}>
          <input
            aria-label="New tag"
            value={draft}
            maxLength={20}
            placeholder="Add a thought…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !draft) setTags(tags.slice(0, -1));
            }}
          />
          <button type="submit" aria-label="Add tag">
            <Icon name="plus" size={16} />
          </button>
        </Field>
      </form>
      <span className="obj-caption">Enter to add · Backspace to peel back</span>
    </div>
  );
}
export function PaperNote() {
  const [text, setText] = useState('Make ordinary things\nfeel extraordinary.'),
    [tone, setTone] = useState('Cream');
  return (
    <div className="obj-stack">
      <Surface
        className="obj-note"
        elevation={7}
        tone={tone === 'Cream' ? 'yellow' : tone === 'Lilac' ? 'lilac' : 'sage'}
      >
        <div className="obj-note-pin" />
        <textarea
          aria-label="Note"
          maxLength={140}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <small>{text.length} / 140</small>
      </Surface>
      <Rail
        label="Paper"
        options={['Cream', 'Lilac', 'Sage']}
        value={tone}
        onChange={setTone}
      />
    </div>
  );
}
export function FolderStack() {
  const [active, setActive] = useState('Ideas');
  const entries: Record<string, string[]> = {
    Ideas: ['Shape study', 'New rituals'],
    Work: ['Draft 01', 'Prototype'],
    Archive: ['Summer', 'Early forms'],
  };
  return (
    <div className="obj-stack">
      <div className="obj-folder-tabs">
        {Object.keys(entries).map((name, i) => (
          <button
            type="button"
            key={name}
            aria-pressed={name === active}
            onClick={() => setActive(name)}
          >
            <Surface
              elevation={name === active ? 7 : 2}
              tone={(['yellow', 'sage', 'lilac'] as const)[i]}
            >
              <Icon name="folder" size={28} />
              <span>{name}</span>
            </Surface>
          </button>
        ))}
      </div>
      <Plate className="obj-folder-content">
        {entries[active].map((name) => (
          <div className="obj-row" key={name}>
            <Icon name="file" size={16} />
            <span>{name}</span>
            <small>↗</small>
          </div>
        ))}
      </Plate>
    </div>
  );
}
