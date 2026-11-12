import type {
  AccentColor,
  Bookmark,
  BookmarkFolder,
  Dashboard,
  Group,
  Space,
  Tab,
  WorkspaceData,
} from '../../types/models';
import { createId } from '../../utils/misc';

interface SeedGroup {
  name: string;
  icon: string;
  accent: AccentColor;
  tabs: Array<{ title: string; url: string }>;
}

interface SeedFolder {
  name: string;
  icon: string;
  accent: AccentColor;
  bookmarks: Array<{ title: string; url: string }>;
  folders?: SeedFolder[];
}

interface SeedSpace {
  name: string;
  icon: string;
  accent: AccentColor;
  groups: SeedGroup[];
  bookmarks: Array<{ title: string; url: string }>;
  folders: SeedFolder[];
}

/** Corporate tools point at public product pages; users replace them with their own instances. */
const SEED: SeedSpace[] = [
  {
    name: 'Work',
    icon: 'briefcase',
    accent: 'green',
    groups: [
      {
        name: 'Documentation',
        icon: 'book',
        accent: 'blue',
        tabs: [
          { title: 'Confluence', url: 'https://www.atlassian.com/software/confluence' },
          { title: 'Microsoft Learn', url: 'https://learn.microsoft.com/' },
        ],
      },
      {
        name: 'Local Development',
        icon: 'terminal',
        accent: 'green',
        tabs: [
          { title: 'localhost:3000', url: 'http://localhost:3000/' },
          { title: 'localhost:5000', url: 'http://localhost:5000/' },
        ],
      },
      {
        name: 'Project Management',
        icon: 'kanban',
        accent: 'amber',
        tabs: [
          { title: 'Jira', url: 'https://www.atlassian.com/software/jira' },
          { title: 'Azure DevOps', url: 'https://dev.azure.com/' },
        ],
      },
    ],
    bookmarks: [
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
      { title: 'Microsoft Learn', url: 'https://learn.microsoft.com/' },
      { title: 'localhost:3000', url: 'http://localhost:3000/' },
      { title: 'Azure DevOps', url: 'https://dev.azure.com/' },
    ],
    folders: [
      {
        name: 'Reference',
        icon: 'library',
        accent: 'blue',
        bookmarks: [{ title: 'Can I use', url: 'https://caniuse.com/' }],
        folders: [
          {
            name: 'Frontend',
            icon: 'palette',
            accent: 'violet',
            bookmarks: [
              { title: 'React', url: 'https://react.dev/' },
              { title: 'TypeScript', url: 'https://www.typescriptlang.org/docs/' },
              { title: 'Tailwind CSS', url: 'https://tailwindcss.com/docs' },
              { title: 'Vite', url: 'https://vite.dev/guide/' },
              { title: 'web.dev', url: 'https://web.dev/' },
            ],
          },
          {
            name: '.NET & Azure',
            icon: 'server',
            accent: 'teal',
            bookmarks: [
              { title: '.NET documentation', url: 'https://learn.microsoft.com/dotnet/' },
              { title: 'Azure documentation', url: 'https://learn.microsoft.com/azure/' },
              { title: 'WebView2', url: 'https://learn.microsoft.com/microsoft-edge/webview2/' },
              { title: 'NuGet', url: 'https://www.nuget.org/' },
            ],
          },
        ],
      },
      {
        name: 'Tools',
        icon: 'bolt',
        accent: 'amber',
        bookmarks: [
          { title: 'regex101', url: 'https://regex101.com/' },
          { title: 'JSON Crack', url: 'https://jsoncrack.com/' },
          { title: 'Excalidraw', url: 'https://excalidraw.com/' },
          { title: 'Squoosh', url: 'https://squoosh.app/' },
        ],
      },
    ],
  },
  {
    name: 'Personal',
    icon: 'home',
    accent: 'orange',
    groups: [
      {
        name: 'Entertainment',
        icon: 'film',
        accent: 'rose',
        tabs: [
          { title: 'YouTube', url: 'https://www.youtube.com/' },
          { title: 'Spotify', url: 'https://open.spotify.com/' },
        ],
      },
      {
        name: 'Reading',
        icon: 'library',
        accent: 'amber',
        tabs: [{ title: 'Wikipedia', url: 'https://en.wikipedia.org/' }],
      },
    ],
    bookmarks: [
      { title: 'Wikipedia', url: 'https://en.wikipedia.org/' },
      { title: 'YouTube', url: 'https://www.youtube.com/' },
    ],
    folders: [
      {
        name: 'Reading list',
        icon: 'news',
        accent: 'amber',
        bookmarks: [
          { title: 'Hacker News', url: 'https://news.ycombinator.com/' },
          { title: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/' },
        ],
      },
      {
        name: 'Travel',
        icon: 'travel',
        accent: 'teal',
        bookmarks: [{ title: 'OpenStreetMap', url: 'https://www.openstreetmap.org/' }],
      },
    ],
  },
];

export function makeTab(
  partial: Pick<Tab, 'spaceId'> & Partial<Omit<Tab, 'id' | 'spaceId'>>,
  now = Date.now(),
): Tab {
  const url = partial.url ?? '';
  return {
    id: createId(),
    groupId: null,
    title: 'New Tab',
    customTitle: null,
    url,
    favicon: null,
    pinned: false,
    order: 0,
    createdAt: now,
    lastSelectedAt: 0,
    history: url ? [url] : [],
    historyIndex: url ? 0 : -1,
    ...partial,
  };
}

export function createDefaultWorkspace(): WorkspaceData {
  const now = Date.now();
  const data: WorkspaceData = {
    spaces: {},
    groups: {},
    tabs: {},
    bookmarks: {},
    bookmarkFolders: {},
    dashboards: {},
    activeSpaceId: '',
    spaceViews: {},
  };

  SEED.forEach((seedSpace, spaceIndex) => {
    const space: Space = {
      id: createId(),
      name: seedSpace.name,
      icon: seedSpace.icon,
      accent: seedSpace.accent,
      order: spaceIndex,
      createdAt: now,
    };
    data.spaces[space.id] = space;
    data.spaceViews[space.id] = { kind: 'start' };
    if (spaceIndex === 0) data.activeSpaceId = space.id;

    const groupIds: string[] = [];
    seedSpace.groups.forEach((seedGroup, groupIndex) => {
      const group: Group = {
        id: createId(),
        spaceId: space.id,
        name: seedGroup.name,
        icon: seedGroup.icon,
        accent: seedGroup.accent,
        order: groupIndex,
        collapsed: false,
      };
      groupIds.push(group.id);
      data.groups[group.id] = group;
      seedGroup.tabs.forEach((seedTab, tabIndex) => {
        const tab = makeTab(
          {
            spaceId: space.id,
            groupId: group.id,
            title: seedTab.title,
            url: seedTab.url,
            order: tabIndex,
          },
          now,
        );
        data.tabs[tab.id] = tab;
      });
    });

    seedSpace.bookmarks.forEach((seedBookmark, index) => {
      const bookmark: Bookmark = {
        id: createId(),
        spaceId: space.id,
        folderId: null,
        title: seedBookmark.title,
        url: seedBookmark.url,
        order: index,
        createdAt: now,
      };
      data.bookmarks[bookmark.id] = bookmark;
    });

    const addFolders = (folders: SeedFolder[], parentId: string | null) => {
      folders.forEach((seedFolder, folderIndex) => {
        const folder: BookmarkFolder = {
          id: createId(),
          spaceId: space.id,
          parentId,
          name: seedFolder.name,
          icon: seedFolder.icon,
          accent: seedFolder.accent,
          order: folderIndex,
          collapsed: parentId !== null,
          createdAt: now,
        };
        data.bookmarkFolders[folder.id] = folder;
        seedFolder.bookmarks.forEach((seedBookmark, index) => {
          const id = createId();
          data.bookmarks[id] = {
            id,
            spaceId: space.id,
            folderId: folder.id,
            title: seedBookmark.title,
            url: seedBookmark.url,
            order: index,
            createdAt: now,
          };
        });
        addFolders(seedFolder.folders ?? [], folder.id);
      });
    };
    addFolders(seedSpace.folders, null);

    if (spaceIndex === 0) {
      const dashboard: Dashboard = {
        id: createId(),
        spaceId: space.id,
        name: 'Overview',
        icon: 'dashboard',
        order: 0,
        createdAt: now,
        widgets: [
          {
            id: createId(),
            kind: 'groupLauncher',
            title: 'Groups',
            groupIds: null,
            layout: { colSpan: 1 },
          },
          {
            id: createId(),
            kind: 'recentTabs',
            title: 'Recently opened',
            limit: 6,
            layout: { colSpan: 1 },
          },
          {
            id: createId(),
            kind: 'bookmarks',
            title: 'Bookmarks',
            folderId: null,
            layout: { colSpan: 1 },
          },
          {
            id: createId(),
            kind: 'quickLinks',
            title: 'Quick links',
            layout: { colSpan: 2 },
            links: [
              { id: createId(), title: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
              { id: createId(), title: 'localhost:5173', url: 'http://localhost:5173/' },
            ],
          },
        ],
      };
      data.dashboards[dashboard.id] = dashboard;
    }
  });

  return data;
}
