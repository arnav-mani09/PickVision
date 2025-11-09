import React from "react";

export default function SupportSidebar() {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-purple-500 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.7)] p-4 text-white w-64 z-[9999]">
      <h2 className="text-lg font-semibold text-purple-400 mb-1">Need help?</h2>
      <p className="text-sm text-gray-300">
        Email:{" "}
        <a
          href="mailto:pickvisionai@gmail.com"
          className="text-purple-400 hover:text-purple-300 underline"
        >
          pickvisionai@gmail.com
        </a>
      </p>
    </div>
  );
}
