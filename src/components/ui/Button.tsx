import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'aa-btn aa-btn-primary',
      outline: 'aa-btn aa-btn-outline',
      ghost: 'aa-btn aa-btn-ghost',
    };

    const sizes = {
      sm: 'aa-btn-sm',
      md: 'aa-btn-md',
      lg: 'aa-btn-lg',
    };

    return (
      <button
        ref={ref}
        className={cn('aa-btn-base', variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
