import { useEffect, useRef, type MouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { useNavigation } from '../../app/providers/hostContext';
import { buildTabMenu } from '../../features/workspace/menus';
import { tabDisplayTitle } from '../../features/workspace/selectors';
import { useUI } from '../../stores/uiStore';
import { useWorkspace } from '../../stores/workspaceStore';
import type { Tab } from '../../types/models';
import { cn } from '../../utils/misc';
import { Favicon } from '../common/Favicon';
import { showContextMenu } from '../common/menu';
import { Tooltip } from '../common/Tooltip';
import type { ContainerId } from './dragState';

function useTabHandlers(tab: Tab) {
  const nav = useNavigation();
  const selectTab = useWorkspace((s) => s.selectTab);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const select = () => {
    setSettingsOpen(false);
    selectTab(tab.id);
  };
  return {
    nav,
    select,
    onContextMenu: (e: MouseEvent) => showContextMenu(e, buildTabMenu(tab.id, nav)),
    onAuxClick: (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        nav.closeTab(tab.id);
      }
    },
  };
}

export function TabRow({
  tab,
  active,
  container,
}: {
  tab: Tab;
  active: boolean;
  container: ContainerId;
}) {
  const { nav, select, onContextMenu, onAuxClick } = useTabHandlers(tab);
  const renaming = useUI((s) => s.renamingTabId === tab.id);
  const setRenamingTab = useUI((s) => s.setRenamingTab);
  const sleep = useUI((s) => s.engineTabs[tab.id]?.sleep);
  const asleep = !active && (sleep === 'suspended' || sleep === 'discarded');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `tab:${tab.id}`,
    data: { type: 'tab', tabId: tab.id, container },
  });
  const title = tabDisplayTitle(tab);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-current={active ? 'page' : undefined}
      aria-label={title}
      onClick={select}
      onAuxClick={onAuxClick}
      onMouseDown={(e) => e.button === 1 && e.preventDefault()}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === 'Enter') select();
        else if (e.key === 'F2') setRenamingTab(tab.id);
        else if (e.key === 'Delete') nav.closeTab(tab.id);
        else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          useUI.getState().openContextMenu({
            x: r.left + 24,
            y: r.bottom,
            items: buildTabMenu(tab.id, nav),
            returnFocus: e.currentTarget,
          });
        }
      }}
      className={cn(
        'group/tab relative flex h-row items-center gap-2 rounded-lg pl-2 pr-1 text-[13px] outline-none transition-ui',
        'focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
        active ? 'bg-elevated text-fg shadow-lift' : 'text-fg-2 hover:bg-hover hover:text-fg',
        isDragging && 'opacity-40',
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-accent" />}
      <Favicon
        url={tab.url}
        icon={tab.favicon}
        className={cn(
          asleep &&
            'opacity-45 grayscale transition-ui group-hover/tab:opacity-100 group-hover/tab:grayscale-0',
        )}
      />
      {renaming ? (
        <RenameInput tab={tab} onDone={() => setRenamingTab(null)} />
      ) : (
        <span
          className={cn('min-w-0 flex-1 truncate', asleep && !active && 'text-fg-3')}
          title={
            sleep === 'discarded'
              ? 'Unloaded to save memory. Opens again when you select it.'
              : sleep === 'suspended'
                ? 'Sleeping to save memory. Wakes instantly when you select it.'
                : undefined
          }
        >
          {title}
        </span>
      )}
      {!renaming && (
        <button
          type="button"
          aria-label={`Close ${title}`}
          tabIndex={-1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            nav.closeTab(tab.id);
          }}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded text-fg-3 transition-ui hover:bg-surface hover:text-fg',
            active ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100',
          )}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

function RenameInput({ tab, onDone }: { tab: Tab; onDone: () => void }) {
  const renameTab = useWorkspace((s) => s.renameTab);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = (value: string | null) => {
    if (done.current) return;
    done.current = true;
    if (value !== null) renameTab(tab.id, value.trim() || null);
    onDone();
  };

  return (
    <input
      ref={ref}
      aria-label="Tab name"
      defaultValue={tabDisplayTitle(tab)}
      placeholder={tab.title}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit(e.currentTarget.value);
        if (e.key === 'Escape') commit(null);
      }}
      onBlur={(e) => commit(e.currentTarget.value)}
      className="h-6 min-w-0 flex-1 rounded-md border border-focus/70 bg-surface px-1.5 text-[13px] text-fg outline-none"
    />
  );
}

export function PinnedTile({ tab, active }: { tab: Tab; active: boolean }) {
  const { select, onContextMenu, onAuxClick } = useTabHandlers(tab);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `tab:${tab.id}`,
    data: { type: 'tab', tabId: tab.id, container: 'pinned' },
  });
  const title = tabDisplayTitle(tab);
  return (
    <Tooltip label={title} side="bottom">
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        {...attributes}
        {...listeners}
        aria-label={title}
        aria-current={active ? 'page' : undefined}
        onClick={select}
        onAuxClick={onAuxClick}
        onContextMenu={onContextMenu}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          if (!e.defaultPrevented && e.key === 'Enter') select();
        }}
        className={cn(
          'flex h-10 items-center justify-center rounded-lg border outline-none transition-ui',
          'focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
          active
            ? 'border-line-strong bg-elevated shadow-lift'
            : 'border-line bg-surface/60 hover:border-line-strong hover:bg-hover',
          isDragging && 'opacity-40',
        )}
      >
        <Favicon url={tab.url} icon={tab.favicon} size={18} />
      </div>
    </Tooltip>
  );
}
