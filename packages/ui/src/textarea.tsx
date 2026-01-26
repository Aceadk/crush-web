'use client';

import * as React from 'react';
import { cn } from './utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  helperText?: string;
  maxLength?: number;
  showCount?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, helperText, id, maxLength, showCount, value, ...props }, ref) => {
    const textareaId = id || React.useId();
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[120px] w-full rounded-xl border bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none',
            error
              ? 'border-destructive focus-visible:ring-destructive'
              : 'border-input hover:border-primary/50',
            className
          )}
          ref={ref}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />
        <div className="flex justify-between mt-1.5">
          <div>
            {error && (
              <p id={`${textareaId}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={`${textareaId}-helper`} className="text-sm text-muted-foreground">
                {helperText}
              </p>
            )}
          </div>
          {showCount && maxLength && (
            <span
              className={cn(
                'text-sm',
                charCount > maxLength * 0.9
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
