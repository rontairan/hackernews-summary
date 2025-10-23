
import React from 'react';

const Spinner: React.FC<{ size?: string }> = ({ size = 'h-8 w-8' }) => {
  return (
    <div className={`animate-spin rounded-full ${size} border-b-2 border-t-2 border-blue-500`}></div>
  );
};

export default Spinner;
