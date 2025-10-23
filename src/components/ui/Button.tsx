import React from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg' | 'icon';
};

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    default: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
    outline: 'border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  };
  const sizes: Record<string, string> = {
    sm: 'h-9 px-4 text-xs',
    default: 'h-11 px-6',
    lg: 'h-12 px-8',
    icon: 'h-11 w-11',
  };

  return <button className={cx(base, variants[variant], sizes[size], className)} {...props} />;
}


