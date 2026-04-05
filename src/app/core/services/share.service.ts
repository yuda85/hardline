import { Injectable } from '@angular/core';

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SHARE_ID_LENGTH = 10;

@Injectable({ providedIn: 'root' })
export class ShareService {
  generateShareId(): string {
    const bytes = new Uint8Array(SHARE_ID_LENGTH);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => BASE62[b % BASE62.length]).join('');
  }

  buildShareUrl(shareId: string): string {
    return `${window.location.origin}/shared/${shareId}`;
  }

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  }
}
