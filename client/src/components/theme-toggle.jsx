import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { id: 'light', label: 'Day', icon: Sun },
  { id: 'dark', label: 'Night', icon: Moon },
  { id: 'system', label: 'Auto', icon: Monitor },
];

export function ThemeToggle({ className }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5',
        className,
      )}
      role="group"
      aria-label="Color theme"
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = theme === id;
        return (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={active ? 'default' : 'ghost'}
            className={cn(
              'h-8 gap-1.5 px-2.5 text-xs',
              !active && 'text-muted-foreground',
            )}
            onClick={() => setTheme(id)}
            title={`${label} mode${id === 'system' ? ` (${resolvedTheme})` : ''}`}
            aria-pressed={active}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
