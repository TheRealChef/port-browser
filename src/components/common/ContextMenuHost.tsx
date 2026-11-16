import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight } from '../icons';
import { useUI, type MenuEntry } from '../../stores/uiStore';
import { cn } from '../../utils/misc';

type Actionable = Extract<MenuEntry, { type: 'item' | 'submenu' }>;

const isActionable = (entry: MenuEntry): entry is Actionable =>
  (entry.type === 'item' || entry.type === 'submenu') && !entry.disabled;

interface MenuListProps {
  items: MenuEntry[];
  onClose: () => void;
  onBack?: () => void;
  autoFocus: boolean;
  className?: string;
  style?: CSSProperties;
}

function MenuList({ items, onClose, onBack, autoFocus, className, style }: MenuListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const actionable = items.filter(isActionable);
  const [activeId, setActiveId] = useState<string | null>(
    autoFocus ? (actionable[0]?.id ?? null) : null,
  );
  const [openSub, setOpenSub] = useState<{ id: string; viaKeyboard: boolean } | null>(null);

  useEffect(() => {
    if (!activeId || openSub?.viaKeyboard) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-menu-id="${activeId}"]`);
    if (autoFocus || listRef.current?.contains(document.activeElement)) el?.focus();
  }, [activeId, autoFocus, openSub]);

  const move = (delta: number) => {
    if (!actionable.length) return;
    const index = actionable.findIndex((e) => e.id === activeId);
    const next = actionable[(index + delta + actionable.length) % actionable.length];
    if (next) setActiveId(next.id);
  };

  const activate = (entry: Actionable, viaKeyboard: boolean) => {
    if (entry.type === 'submenu') {
      setActiveId(entry.id);
      setOpenSub({ id: entry.id, viaKeyboard });
      return;
    }
    onClose();
    entry.onSelect();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (openSub?.viaKeyboard) return;
    const current = actionable.find((e) => e.id === activeId);
    switch (event.key) {
      case 'ArrowDown':
        move(1);
        break;
      case 'ArrowUp':
        move(-1);
        break;
      case 'Home':
        setActiveId(actionable[0]?.id ?? null);
        break;
      case 'End':
        setActiveId(actionable[actionable.length - 1]?.id ?? null);
        break;
      case 'ArrowRight':
        if (current?.type === 'submenu') activate(current, true);
        break;
      case 'ArrowLeft':
        if (!onBack) return;
        onBack();
        break;
      case 'Enter':
      case ' ':
        if (current) activate(current, true);
        break;
      case 'Escape':
        if (onBack) onBack();
        else onClose();
        break;
      case 'Tab':
        onClose();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={listRef}
      role="menu"
      onKeyDown={onKeyDown}
      className={cn('menu min-w-[220px] max-w-[300px]', className)}
      style={style}
    >
      {items.map((entry) => {
        if (entry.type === 'separator') {
          return <div key={entry.id} role="separator" className="msep" />;
        }
        if (entry.type === 'label') {
          return (
            <div key={entry.id} className="mlab">
              {entry.label}
            </div>
          );
        }
        const Icon = entry.icon;
        const isActive = entry.id === activeId;
        const subOpen = entry.type === 'submenu' && openSub?.id === entry.id;
        return (
          <div key={entry.id} className="relative">
            <button
              type="button"
              role="menuitem"
              data-menu-id={entry.id}
              tabIndex={-1}
              disabled={entry.disabled}
              aria-disabled={entry.disabled || undefined}
              aria-haspopup={entry.type === 'submenu' ? 'menu' : undefined}
              aria-expanded={entry.type === 'submenu' ? subOpen : undefined}
              onMouseEnter={() => {
                setActiveId(entry.id);
                setOpenSub(entry.type === 'submenu' ? { id: entry.id, viaKeyboard: false } : null);
              }}
              onClick={() => activate(entry, false)}
              className={cn(
                'mi w-full text-left',
                entry.type === 'item' && entry.danger && 'danger',
                (isActive || subOpen) && 'is-hi',
              )}
            >
              <span className="flex w-4 shrink-0 justify-center text-fg-2 [.danger_&]:text-danger-ink">
                {entry.type === 'item' && entry.checked ? (
                  <Check size={14} className="text-accent" />
                ) : (
                  Icon && <Icon size={14} />
                )}
              </span>
              <span className="grow truncate">{entry.label}</span>
              {entry.type === 'item' && entry.shortcut && (
                <span className="sc">{entry.shortcut}</span>
              )}
              {entry.type === 'submenu' && <ChevronRight size={14} className="text-fg-3" />}
            </button>
            {entry.type === 'submenu' && subOpen && (
              <Submenu
                items={entry.items}
                onClose={onClose}
                autoFocus={openSub?.viaKeyboard ?? false}
                onBack={() => {
                  setOpenSub(null);
                  listRef.current
                    ?.querySelector<HTMLElement>(`[data-menu-id="${entry.id}"]`)
                    ?.focus();
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Submenu(props: {
  items: MenuEntry[];
  onClose: () => void;
  onBack: () => void;
  autoFocus: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState({ x: false, y: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const overflowY = rect.bottom - (window.innerHeight - 8);
    setFlip({ x: rect.right > window.innerWidth - 8, y: overflowY > 0 ? -overflowY : 0 });
  }, []);

  const items = props.items.length
    ? props.items
    : [{ type: 'label' as const, id: 'empty', label: 'Nothing here' }];

  return (
    <div
      ref={ref}
      className="absolute top-[-4px] z-10"
      style={{
        [flip.x ? 'right' : 'left']: 'calc(100% + 4px)',
        transform: `translateY(${flip.y}px)`,
      }}
    >
      <MenuList {...props} items={items} />
    </div>
  );
}

export function ContextMenuHost() {
  const menu = useUI((s) => s.contextMenu);
  const close = useUI((s) => s.closeContextMenu);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!menu || !ref.current) {
      setPosition(null);
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    setPosition({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8)),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onResize = () => close();
    window.addEventListener('resize', onResize);
    window.addEventListener('blur', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur', onResize);
    };
  }, [menu, close]);

  if (!menu) return null;

  const closeAndRestore = () => {
    const target = menu.returnFocus;
    close();
    if (target?.isConnected) target.focus({ preventScroll: true });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div
        ref={ref}
        className="fixed"
        style={{
          left: position?.x ?? menu.x,
          top: position?.y ?? menu.y,
          visibility: position ? 'visible' : 'hidden',
        }}
      >
        <MenuList
          key={`${menu.x}:${menu.y}`}
          items={menu.items}
          onClose={closeAndRestore}
          autoFocus
        />
      </div>
    </div>,
    document.body,
  );
}
