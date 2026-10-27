import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  asLink?: boolean;
  to?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, asLink = true, to = '/' }) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
  };

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const content = (
    <>
      <img
        src="/cypher.png"
        alt="Cypher"
        className={sizeClasses[size]}
      />
      {showText && (
        <span className={`font-bold gradient-text ${textSizeClasses[size]}`}>
          Cypher
        </span>
      )}
    </>
  );

  if (!asLink) {
    return <div className="flex items-center gap-2">{content}</div>;
  }

  return (
    <Link to={to} className="flex items-center gap-2">
      {content}
    </Link>
  );
};

export default Logo;
