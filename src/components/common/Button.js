import React from 'react';
import './common.css';

const Button = ({ children, onClick, disabled = false, variant = 'primary' }) => {
  return (
    <button onClick={onClick} className={`btn btn-${variant}`} disabled={disabled}>
      {children}
    </button>
  );
};

export default Button;