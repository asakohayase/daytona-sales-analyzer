"use client";

import { useState } from "react";

type Mode = "sandbox" | "backend";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("sandbox");

  const handleRun = async () => {
    setLoading(true);
    setOutput("");
    setGeneratedCode("");

    try {
      const endpoint = mode === "sandbox" ? "/api/runQuery/sandbox" : "/api/runQuery/backend";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setOutput(data.result);
      setGeneratedCode(data.code || "");
    } catch (err) {
      setOutput("Error: " + err);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            AI Sales Analyzer
          </h1>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div className="sm:col-span-2">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your sales query
                </label>
                <textarea
                  id="prompt"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08AE78]  focus:border-[#08AE78]  resize-none text-gray-900 placeholder-gray-500"
                  placeholder="Enter your sales query..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as Mode)}
                  className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#08AE78] focus:border-[#08AE78] "
                >
                  <option value="sandbox">Daytona Sandbox</option>
                  <option value="backend">Backend (FastAPI)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRun}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-[#08AE78] text-white font-medium rounded-md hover:bg-[#08AE78]/90 focus:outline-none focus:ring-2 focus:ring-[#08AE78]  focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? "Running..." : "Run Query"}
            </button>

            {generatedCode && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Python Code:</h2>
                <div className="bg-gray-900 border border-gray-200 rounded-md p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-[#08AE78] font-mono break-words">
                    {generatedCode}
                  </pre>
                </div>
              </div>
            )}

            {output && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Result:</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono break-words">
                    {output}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 