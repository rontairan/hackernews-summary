
import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div className="bg-red-900 border border-red-600 text-red-100 px-4 py-3 rounded-lg relative" role="alert">
      <strong className="font-bold">Error:</strong>
      <span className="block sm:inline ml-2">{message}</span>
    </div>
  );
};

export default ErrorDisplay;
