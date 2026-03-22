import React from 'react';

const Skeleton = ({ className = '', variant = 'rect' }) => {
  const baseStyles = 'animate-shimmer';
  
  const variantStyles = {
    rect: 'rounded-md',
    circle: 'rounded-full',
    text: 'rounded h-4 w-full'
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant] || variantStyles.rect} ${className}`} />
  );
};

export default Skeleton;
