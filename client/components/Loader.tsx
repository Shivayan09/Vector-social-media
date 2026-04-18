"use client";
import React from "react";

const Loader = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "50px",
          height: "50px",
          border: "5px solid white",
          borderTop: "5px solid transparent",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
    </div>
  );
};

export default Loader;