import { toSafeHttpUrl } from '../../utils/url';

export type ImportNode =
  | { type: 'folder'; name: string; children: ImportNode[] }
  | { type: 'bookmark'; title: string; url: string };

export interface ParsedBookmarks {
  nodes: ImportNode[];
  bookmarkCount: number;
  folderCount: number;
  skipped: number;
}

export const IMPORT_LIMIT = 20000;

/**
 * Parses the "Netscape bookmark file" HTML that Chrome, Edge, Firefox and
 * Safari export. Only http(s) links are kept; scripts and other markup are
 * never executed because the document is parsed inertly with DOMParser.
 */
export function parseBookmarksHtml(html: string): ParsedBookmarks {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const result: ParsedBookmarks = { nodes: [], bookmarkCount: 0, folderCount: 0, skipped: 0 };
  const root = doc.querySelector('dl');
  if (!root) return result;

  const walk = (dl: Element, depth: number): ImportNode[] => {
    const nodes: ImportNode[] = [];
    for (const dt of Array.from(dl.children)) {
      if (dt.tagName !== 'DT') continue;
      if (result.bookmarkCount >= IMPORT_LIMIT) {
        result.skipped += 1;
        continue;
      }
      const heading = dt.querySelector(':scope > h3');
      const link = dt.querySelector(':scope > a');
      if (heading) {
        let list = dt.querySelector(':scope > dl');
        if (!list && dt.nextElementSibling?.tagName === 'DL') list = dt.nextElementSibling;
        const children = list && depth < 32 ? walk(list, depth + 1) : [];
        result.folderCount += 1;
        nodes.push({
          type: 'folder',
          name: heading.textContent?.trim().slice(0, 120) || 'Untitled folder',
          children,
        });
      } else if (link) {
        const url = toSafeHttpUrl(link.getAttribute('href') ?? '');
        if (!url) {
          result.skipped += 1;
          continue;
        }
        result.bookmarkCount += 1;
        nodes.push({ type: 'bookmark', title: link.textContent?.trim().slice(0, 300) || url, url });
      }
    }
    return nodes;
  };

  result.nodes = walk(root, 0);
  // Exports wrap everything in a single "Bookmarks bar"-style folder; keep it, it's familiar.
  return result;
}
