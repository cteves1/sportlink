/**
 * Setup global de los tests.
 *
 * Node 22+ define un `localStorage` experimental que no está disponible sin la bandera
 * `--localstorage-file`, y ese global tapa el que aporta jsdom. Los servicios de la app
 * persisten en `localStorage`, así que se reexpone el de `window` (o, si tampoco existe,
 * una implementación en memoria) antes de que corra cualquier spec.
 */
function inMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => void entries.delete(key),
    setItem: (key: string, value: string) => void entries.set(key, String(value)),
  } as Storage;
}

const domStorage = globalThis.window?.localStorage;
const storage = domStorage ?? inMemoryStorage();

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
  writable: true,
});
