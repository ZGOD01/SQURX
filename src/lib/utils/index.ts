import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const consentedUserIds = new Set<string>();

export function getGdprConsent(userId: string | undefined): boolean {
  if (!userId) return false;
  return consentedUserIds.has(userId);
}

export function setGdprConsent(userId: string | undefined, accepted: boolean): void {
  if (!userId) return;
  if (accepted) {
    consentedUserIds.add(userId);
  } else {
    consentedUserIds.delete(userId);
  }
}

