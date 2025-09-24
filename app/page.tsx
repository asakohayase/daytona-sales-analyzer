"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setOutput("");
    setGeneratedCode("");

    try {
      const res = await fetch("/api/runQuery", {
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
            AI Sales Analysis Playground
          </h1>

          <div className="space-y-6">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your sales query
              </label>
              <textarea
                id="prompt"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-500"
                placeholder="Enter your sales query..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <button
              onClick={handleRun}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? "Running..." : "Run Query"}
            </button>

            {generatedCode && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Python Code:</h2>
                <div className="bg-gray-900 border border-gray-200 rounded-md p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-green-400 font-mono break-words">
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
