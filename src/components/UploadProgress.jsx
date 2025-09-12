import React from 'react';

const UploadProgress = ({ fileName, progress }) => (
  <div className="w-full px-4">
    <p className="text-sm text-gray-300 mb-2 truncate">{fileName}</p>
    <div className="w-full bg-gray-700 rounded-full h-2.5">
      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
    </div>
    <p className="text-sm text-blue-400 text-center mt-2">{Math.round(progress)}%</p>
  </div>
);

export default UploadProgress;

