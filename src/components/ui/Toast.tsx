import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'success' | 'error' | 'info';
    title: string;
    description?: string;
    onClose?: () => void;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
    ({ className, variant = 'info', title, description, onClose, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'flex min-w-[300px] items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-lg w-fit',
                    className
                )}
                {...props}
            >
                <div className={cn("mt-0.5 shrink-0", {
                    'text-green-500': variant === 'success',
                    'text-destructive': variant === 'error',
                    'text-blue-500': variant === 'info',
                })}>
                    {variant === 'success' && <CheckCircle2 size={20} />}
                    {variant === 'error' && <AlertCircle size={20} />}
                    {variant === 'info' && <Info size={20} />}
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-semibold text-card-foreground">{title}</h4>
                    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                </div>
                {onClose && (
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors shrink-0 cursor-pointer">
                        <X size={16} />
                    </button>
                )}
            </div>
        );
    }
);
Toast.displayName = 'Toast';
