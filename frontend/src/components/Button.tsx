import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'pill';
  color?: 'black' | 'coral' | 'purple' | 'orange' | 'white';
  children: React.ReactNode;
}

export default function Button({ 
  variant = 'primary', 
  color = 'black',
  className = '',
  children,
  ...props 
}: ButtonProps) {
  const classes = `btn btn--${variant} btn--${color} ${className}`.trim();
  
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
