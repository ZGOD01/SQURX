import { create } from 'zustand';
import { useAuthStore } from '@/features/auth/store';

export interface EmailNotification {
  id: string;
  subject: string;
  body: string;
  timestamp: Date;
  actionUrl?: string;
}

interface NotificationStore {
  emails: EmailNotification[];
  sendEmail: (subject: string, body: string) => void;
  dismissEmail: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  emails: [],
  sendEmail: (subject, body) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      emails: [...state.emails, { id, subject, body, timestamp: new Date() }]
    }));

    // Triggering a custom backend API server
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.email) {
      
      try {
        // This attempts to connect to a local Node.js backend (which we will build next)
        fetch('http://localhost:5000/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: currentUser.email,
            name: currentUser.name,
            subject: subject,
            message: body
          })
        }).then(res => res.json()).then(data => {
            if (data.previewUrl) {
                // Update the visual toast with the link!
                set((state) => ({
                    emails: state.emails.map(e => e.id === id ? { ...e, actionUrl: data.previewUrl } : e)
                }));
            }
        }).catch(err => {
          console.warn('Custom backend is not running. Could not send real email.', err.message);
        });

      } catch (err) {
        console.error("Failed to call email API", err);
      }
    }

    // Auto dismiss after 12 seconds to simulate an email arriving briefly visually
    // Keeping it slightly longer so users can click the Ethereal link
    setTimeout(() => {
        get().dismissEmail(id);
    }, 12000);
  },
  dismissEmail: (id) => {
    set((state) => ({
      emails: state.emails.filter(e => e.id !== id)
    }));
  }
}));
