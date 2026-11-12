import { describe, expect, it } from 'vitest';
import { normalizeInput, urlKey } from './url';

const norm = (input: string) => normalizeInput(input, 'duckduckgo');

describe('normalizeInput', () => {
  it('keeps full http(s) URLs', () => {
    expect(norm('https://example.com/a?b=1')).toEqual({
      url: 'https://example.com/a?b=1',
      kind: 'url',
    });
  });

  it('adds https to bare domains', () => {
    expect(norm('example.com')?.url).toBe('https://example.com/');
    expect(norm('docs.example.co.uk/path')?.url).toBe('https://docs.example.co.uk/path');
  });

  it('uses http for localhost and IP addresses', () => {
    expect(norm('localhost:3000')?.url).toBe('http://localhost:3000/');
    expect(norm('127.0.0.1:8080/api')?.url).toBe('http://127.0.0.1:8080/api');
  });

  it('treats free text as a search', () => {
    const result = norm('how to center a div');
    expect(result?.kind).toBe('search');
    expect(result?.url).toBe('https://duckduckgo.com/?q=how%20to%20center%20a%20div');
    expect(norm('typescript')?.kind).toBe('search');
  });

  it('never navigates to non-web schemes', () => {
    expect(norm('javascript:alert(1)')?.kind).toBe('search');
    expect(norm('file:///etc/passwd')?.kind).toBe('search');
  });

  it('returns null for empty input', () => {
    expect(norm('   ')).toBeNull();
  });
});

describe('urlKey', () => {
  it('ignores scheme, www and trailing slash', () => {
    expect(urlKey('https://www.example.com/')).toBe(urlKey('http://example.com'));
  });
});
