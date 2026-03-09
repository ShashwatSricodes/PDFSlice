export const isBrowser = true;
export const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

export function openExternal(url: string) {
  if (!url || url === '#') return;
  if (isElectron) {
    const api = (window as any).electronAPI;
    if (api && typeof api.openExternal === 'function') {
      api.openExternal(url);
      return;
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function saveFile(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
