"use client";

import { useState } from "react";
import { JigsawStack } from "jigsawstack";
import { XCircleIcon } from "@heroicons/react/24/solid";

//API KEY
const jigsaw = JigsawStack({
  apiKey: process.env.NEXT_PUBLIC_JIGSAW_API_KEY!,
});

type SavedPrompt = {
  id: string;
  prompt: string;
  input: string;
};

type CreatePromptParams = {
  prompt: string;
  inputs: Array<{ key: string; optional: boolean; initial_value?: string }>;
  return_prompt: string;
  prompt_guard?: Array<string>;
  stream: boolean;
};

type RunPromptParams = {
  id: string;
  input_values: Record<string, string>;
};

const returnPromptOptions = [
  { value: "markdown", label: "Markdown format" },
  { value: "json", label: "JSON format" },
  { value: "html", label: "HTML format" },
  { value: "text", label: "Plain text" },
];

const promptGuardOptions = [
  "defamation",
  "privacy",
  "hate",
  "sexual_content",
  "elections",
  "code_interpreter_abuse",
  "indiscrimate_weapons",
  "specialized_advice",
];

const formatJSON = (json: string) => {
  try {
    const obj = JSON.parse(json);
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return json;
  }
};

const JSONDisplay = ({ data }: { data: string }) => {
  try {
    const jsonData = JSON.parse(data);
    return (
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto">
        {JSON.stringify(jsonData, null, 2)}
      </pre>
    );
  } catch {
    return <pre>{data}</pre>;
  }
};

const MarkdownDisplay = ({ data }: { data: string }) => {
  const htmlContent = data
    .replace(
      /#{1,6}\s?([^\n]+)/g,
      (match, p1) => `<h${match.trim().length}>${p1}</h${match.trim().length}>`
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");

  return (
    <div
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      className="markdown-content"
    />
  );
};

const HTMLDisplay = ({ data }: { data: string }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
      <div dangerouslySetInnerHTML={{ __html: data }} />
    </div>
  );
};

const formatResult = (result: string, format: string) => {
  switch (format) {
    case "json":
      return <JSONDisplay data={result} />;
    case "markdown":
      return <MarkdownDisplay data={result} />;
    case "html":
      return <HTMLDisplay data={result} />;
    default:
      return <pre className="whitespace-pre-wrap break-words">{result}</pre>;
  }
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [returnPrompt, setReturnPrompt] = useState(
    returnPromptOptions[0].value
  );
  const [promptGuard, setPromptGuard] = useState<string[]>([]);

  const handleRunPrompt = async (promptToRun: string, inputToUse: string) => {
    setLoading(true);
    setError("");
    setResult(""); // Clear previous result

    try {
      const returnPromptValue = `Return the result in ${returnPrompt} format`;

      const resp = await jigsaw.prompt_engine.run_prompt_direct({
        prompt: promptToRun,
        stream: true,
        return_prompt: returnPromptValue,
        use_internet: true,
      });

      for await (const chunk of resp) {
        console.log(chunk);
        setResult((prev) => prev + chunk); // Update result incrementally
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while processing the prompt"
      );
      console.error(err);
    }
    setLoading(false);
  };

  const handleSavePrompt = () => {
    if (prompt.trim() === "") {
      setError("Please enter a prompt before saving");
      return;
    }
    const newPrompt: SavedPrompt = {
      id: Date.now().toString(),
      prompt: prompt,
      input: input,
    };
    setSavedPrompts([...savedPrompts, newPrompt]);
    setPrompt("");
    setInput("");
  };

  const handlePromptGuardChange = (option: string) => {
    setPromptGuard((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-background text-foreground">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Groq + JigsawStack: 100x speed on every prompt
        </h1>
        <div className="bg-gray-100 dark:bg-gray-800 shadow sm:rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create or Run a Prompt</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium">
                Prompt Template
              </label>
              <input
                type="text"
                id="prompt"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt template, e.g., 'Tell me a story about {input}'"
              />
            </div>
            <div>
              <label htmlFor="input" className="block text-sm font-medium">
                Input Value
              </label>
              <input
                type="text"
                id="input"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input value"
              />
            </div>
            <div>
              <label
                htmlFor="returnPrompt"
                className="block text-sm font-medium"
              >
                Return Format
              </label>
              <select
                id="returnPrompt"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={returnPrompt}
                onChange={(e) => setReturnPrompt(e.target.value)}
              >
                {returnPromptOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Prompt Guard Options
              </label>
              <div className="space-y-2">
                {promptGuardOptions.map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={promptGuard.includes(option)}
                      onChange={() => handlePromptGuardChange(option)}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => handleRunPrompt(prompt, input)}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Run Prompt
              </button>
              <button
                onClick={handleSavePrompt}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Save Prompt
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  Processing your request...
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon
                  className="h-5 w-5 text-red-400"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Result ({returnPrompt} format)
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-auto max-h-96">
              {formatResult(result, returnPrompt)}
            </div>
          </div>
        )}

        {savedPrompts.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-800 shadow sm:rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Saved Prompts</h2>
            <ul className="space-y-4">
              {savedPrompts.map((savedPrompt) => (
                <li
                  key={savedPrompt.id}
                  className="flex flex-col space-y-2 p-4 bg-white dark:bg-gray-700 rounded-lg shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Prompt:</span>
                    <span className="text-sm truncate flex-1 ml-2">
                      {savedPrompt.prompt}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Input:</span>
                    <span className="text-sm truncate flex-1 ml-2">
                      {savedPrompt.input}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleRunPrompt(savedPrompt.prompt, savedPrompt.input)
                    }
                    className="mt-2 w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Run This Prompt
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
