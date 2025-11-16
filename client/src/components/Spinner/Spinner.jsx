import React from "react";
import "./Spinner.css";

const Spinner = ({ size = "40px" }) => {
  return (
    <div className="spinner-container">
      <div 
        className="spinner" 
        style={{ 
          width: size, 
          height: size,
          borderWidth: `calc(${size} * 0.1)`
        }}
      ></div>
    </div>
  );
};

export default Spinner;
