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
      <div className="w-12.5 h-12.5 border-[5px] border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default Loader;