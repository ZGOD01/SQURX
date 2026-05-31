import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getGdprConsent(userId: string | undefined): boolean {
  if (!userId) return false;
  const key = `squrx_gdpr_consent_${userId}`;
  return localStorage.getItem(key) === 'true';
}

export function setGdprConsent(userId: string | undefined, accepted: boolean): void {
  if (!userId) return;
  const key = `squrx_gdpr_consent_${userId}`;
  if (accepted) {
    localStorage.setItem(key, 'true');
  } else {
    localStorage.removeItem(key);
  }
}

