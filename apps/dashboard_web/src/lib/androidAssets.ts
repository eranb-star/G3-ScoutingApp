// Keep everyday 2026 practice usable without a network connection. The Android
// packaging script uses this same list; normal website builds stay unchanged.
import bundled from './androidBundledModels.json';

export function modelAssetUrl(path: string, android = import.meta.env?.MODE === 'android') {
  if (!android || !path.startsWith('/') || !path.endsWith('.glb') || bundled.includes(path) || path.startsWith('/studio/components/')) return path;
  return `https://g3-6740.com${path}`;
}
