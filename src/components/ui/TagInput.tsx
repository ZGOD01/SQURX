import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function TagInput({ tags, onChange, placeholder = "Add tag...", className }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                onChange([...tags, inputValue.trim()]);
            }
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className={cn("flex flex-wrap items-center gap-2 rounded-xl border border-input bg-card px-3 py-2 w-full focus-within:ring-2 focus-within:ring-ring transition-shadow", className)}>
            {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {tag}
                    <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X size={12} />
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground border-none ring-0 outline-none"
            />
        </div>
    );
}
