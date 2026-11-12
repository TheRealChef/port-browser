import { describe, expect, it } from 'vitest';
import { createDefaultWorkspace } from '../workspace/defaults';
import { buildSuggestions } from './suggestions';

describe('buildSuggestions', () => {
  const data = createDefaultWorkspace();

  it('puts the literal destination first', () => {
    expect(buildSuggestions('example.com', data, 'duckduckgo', null)[0]).toMatchObject({
      kind: 'go',
      url: 'https://example.com/',
    });
    expect(buildSuggestions('rust ownership', data, 'duckduckgo', null)[0]?.kind).toBe('search');
  });

  it('matches open tabs across spaces and prefers them over duplicate bookmarks', () => {
    const results = buildSuggestions('wiki', data, 'duckduckgo', null);
    const wiki = results.filter((s) => s.url.includes('wikipedia'));
    expect(wiki).toHaveLength(1);
    expect(wiki[0]).toMatchObject({ kind: 'tab', spaceName: 'Personal' });
  });

  it('returns nothing for empty input', () => {
    expect(buildSuggestions('  ', data, 'duckduckgo', null)).toEqual([]);
  });
});
