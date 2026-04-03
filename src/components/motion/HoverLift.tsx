import { motion, type HTMLMotionProps } from 'framer-motion';

export function HoverLift({ children, className, ...props }: HTMLMotionProps<"div">) {
    return (
        <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
            whileTap={{ y: 0 }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}
