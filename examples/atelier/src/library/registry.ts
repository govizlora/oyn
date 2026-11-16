import type { ComponentType } from 'react';
import * as Inputs from './inputs';
import * as Navigation from './navigation';
import * as Studio from './studio';
import * as Organize from './organize';
import * as Feedback from './feedback';
import * as Time from './time';
import * as Curiosities from './curiosities';
import * as Systems from './systems';
import * as Hardware from './hardware';
import * as Archive from './archive';

export const rooms = [
  {
    id: 'hardware',
    name: 'Hardware',
    subtitle: 'Things you want to touch',
    icon: 'power',
  },
  {
    id: 'systems',
    name: 'Everyday',
    subtitle: 'Familiar things, a different feeling',
    icon: 'list',
  },
  {
    id: 'controls',
    name: 'Touch',
    subtitle: 'Small gestures, physical answers',
    icon: 'sliders',
  },
  {
    id: 'navigation',
    name: 'Navigate',
    subtitle: 'Find a place for everything',
    icon: 'columns',
  },
  {
    id: 'studio',
    name: 'Make',
    subtitle: 'Tools for shaping an idea',
    icon: 'diamond',
  },
  {
    id: 'organize',
    name: 'Arrange',
    subtitle: 'A little order, a lot of possibility',
    icon: 'folder',
  },
  {
    id: 'feedback',
    name: 'Respond',
    subtitle: 'Every action deserves an answer',
    icon: 'bell',
  },
  {
    id: 'time',
    name: 'Time',
    subtitle: 'Days, moments, and small rituals',
    icon: 'calendar',
  },
  {
    id: 'curiosities',
    name: 'Play',
    subtitle: 'Useful things with a curious side',
    icon: 'grid',
  },
  {
    id: 'archive',
    name: 'Archive',
    subtitle: 'A place for the everyday',
    icon: 'folder',
  },
] as const;
export type RoomId = (typeof rooms)[number]['id'];
export type ObjectSpec = {
  id: string;
  name: string;
  room: RoomId;
  component: ComponentType;
  exportName: string;
  tags: string;
  number: number;
  source: string;
  layout?: 'composition';
};
type Entry = [
  id: string,
  name: string,
  exportName: string,
  component: ComponentType,
  tags: string,
];
const group = (room: RoomId, source: string, entries: Entry[]) =>
  entries.map(([id, name, exportName, component, tags]) => ({
    id,
    name,
    room,
    exportName,
    component,
    tags,
    source,
  }));
export const objects: ObjectSpec[] = [
  ...group('controls', 'inputs', [
    [
      'aperture',
      'Aperture dial',
      'Aperture',
      Inputs.Aperture,
      'knob rotary range brightness',
    ],
    [
      'switchboard',
      'Switchboard',
      'Switchboard',
      Inputs.Switchboard,
      'toggle settings checkbox',
    ],
    [
      'many-choices',
      'Many choices',
      'ManyChoices',
      Inputs.ManyChoices,
      'multi select chips labels',
    ],
    [
      'interval',
      'Interval window',
      'Interval',
      Inputs.Interval,
      'range dual slider bounds',
    ],
    [
      'counter',
      'Little counter',
      'Counter',
      Inputs.Counter,
      'number stepper quantity',
    ],
    [
      'rating',
      'Five little stars',
      'Rating',
      Inputs.Rating,
      'radio rating favorite',
    ],
  ]),
  ...group('navigation', 'navigation', [
    [
      'browser-tabs',
      'Paper tabs',
      'BrowserTabs',
      Navigation.BrowserTabs,
      'tabs browser add close',
    ],
    [
      'pagination',
      'Page pebbles',
      'Pagination',
      Navigation.Pagination,
      'pages navigation pagination',
    ],
    [
      'breadcrumbs',
      'A trail of crumbs',
      'Breadcrumbs',
      Navigation.Breadcrumbs,
      'path folders breadcrumbs',
    ],
    [
      'folder-tree',
      'Branch office',
      'FolderTree',
      Navigation.FolderTree,
      'tree hierarchy disclosure accordion',
    ],
    [
      'command-search',
      'Command drawer',
      'CommandSearch',
      Navigation.CommandSearch,
      'command search keyboard palette',
    ],
    [
      'app-dock',
      'Pocket dock',
      'AppDock',
      Navigation.AppDock,
      'dock app launcher windows',
    ],
  ]),
  ...group('studio', 'studio', [
    [
      'palette',
      'Color bath',
      'Palette',
      Studio.Palette,
      'color picker palette material',
    ],
    [
      'type',
      'Type foundry',
      'TypeSpecimen',
      Studio.TypeSpecimen,
      'font text size weight typography',
    ],
    [
      'alignment',
      'Quiet alignment',
      'Alignment',
      Studio.Alignment,
      'text alignment toolbar',
    ],
    [
      'grid',
      'Grid garden',
      'GridComposer',
      Studio.GridComposer,
      'layout columns spacing grid',
    ],
    [
      'corners',
      'Soft geometry',
      'Corners',
      Studio.Corners,
      'radius corners elevation material',
    ],
    [
      'crop',
      'A different frame',
      'CropFrame',
      Studio.CropFrame,
      'crop aspect ratio image',
    ],
  ]),
  ...group('organize', 'organize', [
    [
      'ordered-list',
      'Movable thoughts',
      'OrderedList',
      Organize.OrderedList,
      'reorder checklist list sorting',
    ],
    [
      'kanban',
      'Three small steps',
      'Kanban',
      Organize.Kanban,
      'kanban tasks board',
    ],
    [
      'local-files',
      'Local pocket',
      'LocalFiles',
      Organize.LocalFiles,
      'upload file picker local',
    ],
    [
      'tag-editor',
      'Peel-and-stick',
      'TagEditor',
      Organize.TagEditor,
      'tags token input removable',
    ],
    [
      'note',
      'A note to yourself',
      'PaperNote',
      Organize.PaperNote,
      'textarea paper note',
    ],
    [
      'folder-stack',
      'Folder sleeves',
      'FolderStack',
      Organize.FolderStack,
      'folders file tabs stack',
    ],
  ]),
  ...group('feedback', 'feedback', [
    [
      'notifications',
      'Gentle arrivals',
      'Notifications',
      Feedback.Notifications,
      'toast notification dismiss undo',
    ],
    [
      'progress',
      'Almost there',
      'ProgressTracks',
      Feedback.ProgressTracks,
      'progress ring bar meter',
    ],
    [
      'workflow',
      'Step by step',
      'Workflow',
      Feedback.Workflow,
      'wizard stepper timeline',
    ],
    [
      'storage',
      'Room for more',
      'Storage',
      Feedback.Storage,
      'storage chart capacity segmented',
    ],
    [
      'permissions',
      'Permission slips',
      'Permissions',
      Feedback.Permissions,
      'checkbox indeterminate permissions',
    ],
    [
      'validation',
      'A proper introduction',
      'Validation',
      Feedback.Validation,
      'email form validation invitation',
    ],
  ]),
  ...group('time', 'time', [
    [
      'date-tiles',
      'Days in clay',
      'DateTiles',
      Time.DateTiles,
      'calendar date picker',
    ],
    [
      'date-window',
      'A span of days',
      'DateWindow',
      Time.DateWindow,
      'date range interval',
    ],
    [
      'week-slots',
      'A little availability',
      'WeekSlots',
      Time.WeekSlots,
      'schedule week appointment slots',
    ],
    [
      'time-blocks',
      'Time blocks',
      'TimeBlocks',
      Time.TimeBlocks,
      'time picker hours minutes',
    ],
    [
      'world-clock',
      'Somewhere else',
      'WorldClock',
      Time.WorldClock,
      'world clock timezone analog',
    ],
    [
      'activity',
      'Quiet activity',
      'ActivityTiles',
      Time.ActivityTiles,
      'heatmap activity tiles',
    ],
  ]),
  ...group('curiosities', 'curiosities', [
    [
      'terminal',
      'Phosphor paper',
      'LiveTerminal',
      Curiosities.LiveTerminal,
      'crt terminal code shader text',
    ],
    [
      'pixels',
      'Dot by dot',
      'PixelMatrix',
      Curiosities.PixelMatrix,
      'pixel matrix drawing dots',
    ],
    [
      'position',
      'A point in space',
      'PositionPad',
      Curiosities.PositionPad,
      'xy pad position coordinates',
    ],
    [
      'calculator',
      'Pocket arithmetic',
      'Calculator',
      Curiosities.Calculator,
      'calculator keypad keyboard',
    ],
    [
      'tally',
      'A small obsession',
      'SplitTally',
      Curiosities.SplitTally,
      'counter tally digits split flap',
    ],
    [
      'pin',
      'Six secrets',
      'PinEntry',
      Curiosities.PinEntry,
      'pin otp code input password',
    ],
  ]),
  ...group('systems', 'systems', [
    [
      'option-capsule',
      'Option capsule',
      'OptionCapsule',
      Systems.OptionCapsule,
      'dropdown select menu radio',
    ],
    [
      'filter-pocket',
      'A little filter',
      'FilterPocket',
      Systems.FilterPocket,
      'multi select dropdown menu filter',
    ],
    [
      'raised-table',
      'Rows with presence',
      'RaisedTable',
      Systems.RaisedTable,
      'table files grid search sort selection',
    ],
    [
      'window-things',
      'Window things',
      'WindowThings',
      Systems.WindowThings,
      'window minimize expand chrome',
    ],
    [
      'folded-paper',
      'Folded paper',
      'FoldedPaper',
      Systems.FoldedPaper,
      'accordion disclosure details',
    ],
    [
      'properties',
      'Property drawer',
      'Properties',
      Systems.Properties,
      'inspector number dimensions ratio lock',
    ],
  ]),
  ...group('hardware', 'hardware', [
    [
      'moving-air',
      'Moving air',
      'MovingAir',
      Hardware.MovingAir,
      'fan rotor spin speed knob',
    ],
    [
      'light-bank',
      'Little lights',
      'LightBank',
      Hardware.LightBank,
      'led indicator light glow switch',
    ],
    [
      'three-positions',
      'Three positions',
      'ThreePositions',
      Hardware.ThreePositions,
      'detent radio toggle lever',
    ],
    [
      'little-keys',
      'Little keys',
      'LittleKeys',
      Hardware.LittleKeys,
      'keyboard keys keycap command',
    ],
    [
      'soft-messages',
      'Soft messages',
      'SoftMessages',
      Hardware.SoftMessages,
      'chat bubble reaction heart',
    ],
    [
      'candy-switches',
      'Candy switches',
      'CandySwitches',
      Hardware.CandySwitches,
      'pill tag checkbox toggle',
    ],
  ]),
  ...group('archive', 'archive', [
    [
      'archive-focus',
      'Daily objects',
      'FocusArchive',
      Archive.FocusArchive,
      'archive focus todo tasks calendar full composition',
    ],
    [
      'archive-desktop',
      'Everyday desktop',
      'DesktopArchive',
      Archive.DesktopArchive,
      'archive desktop table list files calendar full composition',
    ],
  ]),
].map((spec, i) => ({
  ...(spec.room === 'archive' ? { layout: 'composition' as const } : {}),
  ...spec,
  number: i + 1,
  source: `examples/atelier/src/library/${spec.source}.tsx`,
}));
