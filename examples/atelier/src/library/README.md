# Object library / first collection

48 separately exported, locally interactive specimens in eight rooms. This is an
**app-local exploration library**, not a published component package or a stable
public API. The three original full-screen studies remain available unchanged in
purpose; the library is a scrolling workbench for choosing tomorrow's composition.

## Browse and keep

- `/?view=library&room=controls` opens Touch.
- Rooms: `systems`, `controls`, `navigation`, `studio`, `organize`, `feedback`,
  `time`, `curiosities`. Each contains six specimens.
- `room=all` browses the full collection, six mounted specimens per page.
- `room=picked` shows the chosen objects, also paginated.
- `/?view=library&room=curiosities&object=terminal` isolates one specimen. The
  expand icon on every card creates this link; back/forward uses the same router.
- `/` focuses catalog search, except when typing or when a widget has handled the
  key (for example calculator division). Search spans the whole collection;
  searching inside Picked stays within the shortlist.
- The star stores **object IDs only** under `oyn.object-library.picks.v1` in this
  browser's local storage. IDs are validated against the registry. Storage failure
  leaves a working session-only shortlist and an explicit notice, not a false save.
- Export selection downloads a versioned JSON manifest of IDs, names, rooms,
  source modules and named exports. No preview values, file contents, or account
  data are included. Preview state resets when changing rooms or isolating an
  object. The shortlist persists; it is not cloud-synchronized.

## Collection

| Room             | Objects                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Touch · 01–06    | Aperture dial; Switchboard; Many choices; Interval window; Little counter; Five little stars          |
| Navigate · 07–12 | Paper tabs; Page pebbles; A trail of crumbs; Branch office; Command drawer; Pocket dock               |
| Make · 13–18     | Color bath; Type foundry; Quiet alignment; Grid garden; Soft geometry; A different frame              |
| Arrange · 19–24  | Movable thoughts; Three small steps; Local pocket; Peel-and-stick; A note to yourself; Folder sleeves |
| Respond · 25–30  | Gentle arrivals; Almost there; Step by step; Room for more; Permission slips; A proper introduction   |
| Time · 31–36     | Days in clay; A span of days; A little availability; Time blocks; Somewhere else; Quiet activity      |
| Play · 37–42     | Phosphor paper; Dot by dot; A point in space; Pocket arithmetic; A small obsession; Six secrets       |
| Everyday · 43–48 | Option capsule; A little filter; Rows with presence; Window things; Folded paper; Property drawer     |

The interactions are real local UI operations: native multi-select/radio controls,
keyboard tabs, dropdown dismissal, search/sort, table selection, proportional
sizing, two-ended range dragging, file picking, tag editing, reordering, undo,
validation, date math, time-zone conversion, arithmetic, pixel drawing and editable
GPU-rendered text. Color bath passes an actual hex color to Ceramic; geometry
controls change the bound DOM's radius and material elevation.

Scope: the collection doesn't change OS settings, upload files, send invitations,
authenticate a PIN, run a live clock, synchronize files, or perform real transfers.
File picking reads names/sizes only. World-clock hands show the selected reference
instant (18 November 2026, UTC input), converted with the browser's timezone data.
Progress, storage and activity are explicitly local/sample studies. No background
timer or animation loop is introduced.

## Composition and extension

`registry.ts` is the single collection index: stable ID, room, title, component,
search tags, source module and named export. Counts, cards, isolation, validated
picks and exported manifests all derive from it. Numbers are assigned by registry
order; append new entries to preserve existing numbers.

Category modules export each specimen separately. Import its named component into
a composition under the existing SurfaceProvider; don't add another provider per
object. Current specimens use local state intentionally. Generalize a chosen
specimen's value/onChange contract when it becomes a product component rather than
prematurely making all 48 into a public API.

- `../controls.tsx`: sole Ceramic configuration, palette, Key, Dial, Switch, Fader,
  Surface. Palette swatches derive hex values from this same palette. Named ink and
  its equivalent custom hex use the same optical settings.
- `../everyday.tsx`: reused Calendar, Check, native Menu/SelectMenu and the entire
  Files component. The small file table is a sizing adapter, **not another search,
  sorting or selection implementation**.
- `shared.tsx`: native radio Rail, input Field, Range, Plate and Readout.
- `library.css`: scoped catalog/specimen geometry, typography and flat ink. GPU
  layers are never styled through broad `> span` selectors; round GPU surfaces use
  numeric-compatible `999px` radii, not percentage radii.
- `../phosphor.tsx`: one material and pipeline for the editable CRT. A bounded,
  uppercase 32×12 glyph string drives both the uniform cells and the semantic HTML
  pre element. Editing changes uniforms, not shader source or pipeline identity.
- `../main.tsx`: one URL route owner and one SurfaceProvider for studies/library.
  The original common stylesheet is loaded first; library geometry is last.

Native details owns dropdown and accordion open state. Native inputs own form
semantics; each visible value has one React owner. There are no per-widget renderer
copies, CSS bevel/shadow substitutes, image copies, separate GPU devices, or
redundant reduced-motion rules. The common reduced-motion rule remains authoritative.

Only the visible page's six specimens (or one isolated object) are mounted. This
bounds demo size; it is **not** viewport culling or a mobile performance claim. No
WebGL/Canvas2D/CSS fallback is introduced. WebGPU support policy is unchanged.

## Verification

`npm run test:library` builds production, starts its own local preview, and runs
headless Chrome. It exercises all 48 specimens, persistent picks, JSON download,
search, paging, isolation/history, storage-denied behavior and unsupported WebGPU.
It verifies actual changed pixels for custom Ceramic color and live CRT glyphs,
one live GPU device/four cached pipelines/zero Canvas2D copies, idle rendering,
reduced motion, and 24 room/viewport screenshots (1440, 1024, 390 pixels wide).
Outputs are gitignored under `test-results/library/`.

`npm run test:atelier` separately retains the three homepage regression suite.
No remote deployment, push, or publishing happens in either command.
