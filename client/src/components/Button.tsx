import React from 'react';
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'outline' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  className?: string;
}
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
  type = 'button',
  href,
  className = ''
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const combinedClass = `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) onClick();
  };
  if (href) {
    return (
      <a
        href={disabled ? undefined : href}
        className={combinedClass}
        onClick={handleClick}
        aria-disabled={disabled}
        style={disabled ? { pointerEvents: 'none', opacity: 0.6 } : {}}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      className={combinedClass}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
export default Button;
