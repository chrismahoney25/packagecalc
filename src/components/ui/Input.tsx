import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cx(
        'h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-slate-400 transition-all focus:border-slate-900 focus:ring-4 focus:ring-slate-200 hover:border-slate-400',
        className
      )}
      {...props}
    />
  );
});


