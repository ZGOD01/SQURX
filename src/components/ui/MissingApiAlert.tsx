import { AlertTriangle } from 'lucide-react';

interface MissingApiAlertProps {
    featureName?: string;
}

/**
 * Shown on features that have no backend API endpoints defined in the
 * production server documentation. In compliance with strict API-driven
 * requirements, local fake databases / persistence are disabled for these views.
 */
export function MissingApiAlert({ featureName }: MissingApiAlertProps) {
    return (
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 dark:bg-amber-900/10 dark:border-amber-700/40 p-5 flex gap-4 items-start shadow-sm mb-6">
            <div className="shrink-0 mt-0.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    Backend API Unavailable{featureName ? ` — ${featureName}` : ''}
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                    The backend API endpoints for this feature are not defined in the production server
                    documentation. In compliance with strict API-driven requirements, local fake
                    databases and persistence are disabled for this view. Please implement the
                    required backend endpoints to enable full functionality.
                </p>
            </div>
        </div>
    );
}
