import { motion, type HTMLMotionProps } from 'framer-motion';

export function PageTransition({ children, className, ...props }: HTMLMotionProps<"div">) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}
