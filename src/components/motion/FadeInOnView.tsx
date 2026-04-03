import { motion, type HTMLMotionProps } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export interface FadeInOnViewProps extends HTMLMotionProps<"div"> {
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    distance?: number;
}

export function FadeInOnView({
    children,
    delay = 0,
    direction = 'up',
    distance = 30,
    className,
    ...props
}: FadeInOnViewProps) {
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const getInitialState = () => {
        switch (direction) {
            case 'up': return { opacity: 0, y: distance };
            case 'down': return { opacity: 0, y: -distance };
            case 'left': return { opacity: 0, x: distance };
            case 'right': return { opacity: 0, x: -distance };
            case 'none': return { opacity: 0 };
        }
    };

    return (
        <motion.div
            ref={ref}
            initial={getInitialState()}
            animate={inView ? { opacity: 1, x: 0, y: 0 } : getInitialState()}
            transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}
