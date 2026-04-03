import { motion, type HTMLMotionProps } from 'framer-motion';

export interface StaggerContainerProps extends HTMLMotionProps<"div"> {
    staggerDelay?: number;
    delayChildren?: number;
}

export function StaggerContainer({
    children,
    staggerDelay = 0.1,
    delayChildren = 0,
    className,
    ...props
}: StaggerContainerProps) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: staggerDelay,
                        delayChildren: delayChildren,
                    },
                },
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export interface StaggerItemProps extends HTMLMotionProps<"div"> {
    yOffest?: number;
}

export function StaggerItem({ children, yOffest = 20, className, ...props }: StaggerItemProps) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: yOffest },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}
