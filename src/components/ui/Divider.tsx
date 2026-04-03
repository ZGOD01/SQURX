import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Divider = forwardRef<HTMLHRElement, HTMLAttributes<HTMLHRElement>>(
    ({ className, ...props }, ref) => (
        <hr
            ref={ref}
            className={cn('m-0 h-px w-full shrink-0 border-none bg-border', className)}
            {...props}
        />
    )
);
Divider.displayName = 'Divider';
