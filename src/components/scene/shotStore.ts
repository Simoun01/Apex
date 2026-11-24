/* Rendered product images, shared between the photo studio and the carousels.
   Kept free of three.js imports so the carousels can read it without loading 3D code. */

const cache = new Map<string, string>();
const listeners = new Set<() => void>();

export function subscribeShots(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getShot(key: string): string | null {
  return cache.get(key) ?? null;
}

export function hasShot(key: string) {
  return cache.has(key);
}

export function putShot(key: string, url: string) {
  cache.set(key, url);
  listeners.forEach((fn) => fn());
}
