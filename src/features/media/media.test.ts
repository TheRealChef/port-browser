import { beforeEach, describe, expect, it } from 'vitest';
import type { MediaState } from '../../host/bridge';
import { useUI } from '../../stores/uiStore';
import { bestArtwork, formatTime, mediaPosition } from './mediaFormat';

const base: MediaState = {
  title: 'Track',
  artist: 'Artist',
  album: '',
  artwork: [],
  playing: true,
  position: 10,
  duration: 120,
  actions: ['play', 'pause'],
  element: true,
  audible: true,
  muted: false,
};

describe('media formatting', () => {
  it('picks the largest web artwork', () => {
    expect(
      bestArtwork([
        { src: 'https://i.test/96.jpg', sizes: '96x96' },
        { src: 'https://i.test/512.jpg', sizes: '512x512' },
        { src: 'data:image/png;base64,AAAA', sizes: '1024x1024' },
        { src: 'https://i.test/256.jpg', sizes: '256x256' },
      ]),
    ).toBe('https://i.test/512.jpg');
    expect(bestArtwork([{ src: 'javascript:alert(1)', sizes: '' }])).toBeNull();
  });

  it('advances the position while playing, capped at the duration', () => {
    const entry = { ...base, receivedAt: 1000 };
    expect(mediaPosition(entry, 3000)).toBe(12);
    expect(mediaPosition({ ...entry, playing: false }, 3000)).toBe(10);
    expect(mediaPosition(entry, 1_000_000)).toBe(120);
    expect(mediaPosition({ ...entry, position: null }, 3000)).toBeNull();
  });

  it('formats times', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(125.9)).toBe('2:05');
    expect(formatTime(3725)).toBe('1:02:05');
  });
});

describe('player state', () => {
  beforeEach(() => useUI.setState({ media: {} }));

  it('keeps dismissed sources hidden until they start playing again', () => {
    const { setMedia, dismissMedia } = useUI.getState();
    setMedia('a', base);
    dismissMedia('a');
    setMedia('a', { ...base, position: 11 });
    expect(useUI.getState().media.a?.dismissed).toBe(true);
    setMedia('a', { ...base, playing: false });
    setMedia('a', { ...base, playing: true });
    expect(useUI.getState().media.a?.dismissed).toBe(false);
  });

  it('remembers when a source last played and removes ended ones', () => {
    const { setMedia } = useUI.getState();
    setMedia('a', base);
    const played = useUI.getState().media.a!.lastPlayedAt;
    expect(played).toBeGreaterThan(0);
    setMedia('a', { ...base, playing: false });
    expect(useUI.getState().media.a!.lastPlayedAt).toBe(played);
    setMedia('a', null);
    expect(useUI.getState().media.a).toBeUndefined();
  });
});
