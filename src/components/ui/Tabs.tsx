import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface TabItem {
    id: string;
    label: string;
    content: React.ReactNode;
}

export interface TabsProps {
    items: TabItem[];
    defaultTab?: string;
    className?: string;
}

export function Tabs({ items, defaultTab, className }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || items[0]?.id);

    return (
        <div className={cn('w-full', className)}>
            <div className="flex space-x-2 border-b border-border mb-6">
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            'relative px-4 py-3 text-sm font-medium transition-colors hover:text-foreground cursor-pointer',
                            activeTab === item.id ? 'text-foreground' : 'text-muted-foreground'
                        )}
                    >
                        {item.label}
                        {activeTab === item.id && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute left-0 right-0 bottom-0 h-0.5 bg-primary"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                    </button>
                ))}
            </div>
            <div>
                {items.map(
                    (item) =>
                        activeTab === item.id && (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {item.content}
                            </motion.div>
                        )
                )}
            </div>
        </div>
    );
}
