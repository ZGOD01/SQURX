import { forwardRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps extends HTMLMotionProps<"div"> {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children?: ReactNode;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
    ({ className, isOpen, onClose, title, children, ...props }, ref) => {
        useEffect(() => {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
            return () => {
                document.body.style.overflow = 'auto';
            };
        }, [isOpen]);

        return (
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            ref={ref}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className={cn(
                                'relative z-50 w-full max-w-lg overflow-hidden rounded-2xl bg-card p-6 text-card-foreground shadow-xl sm:p-8',
                                className
                            )}
                            {...props}
                        >
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                            {title && <h2 className="mb-4 text-2xl font-semibold tracking-tight">{title}</h2>}
                            {children}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    }
);
Modal.displayName = 'Modal';
