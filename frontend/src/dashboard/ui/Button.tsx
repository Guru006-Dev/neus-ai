import type { ButtonHTMLAttributes } from 'react'
export function Button({ variant = 'ghost', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return <button className={`nx-btn nx-btn--${variant} ${className}`} {...rest} />
}
