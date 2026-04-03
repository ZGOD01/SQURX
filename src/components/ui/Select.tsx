import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <select
                ref={ref}
                className={cn(
                    'flex h-12 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-shadow appearance-none cursor-pointer',
                    className
                )}
                {...props}
            >
                {children}
            </select>
        );
    }
);
Select.displayName = 'Select';
