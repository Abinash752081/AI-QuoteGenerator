import React, { useState, useEffect, useCallback } from "react";

// --- Type Definitions for TypeScript ---

// Defines the structure of the quote object from the API
interface Quote {
  content: string;
  author: string;
}

// Defines the allowed modes for the Gemini API calls
type GeminiMode = "explain" | "continue" | "summarize" | "visualize";

// Defines the structure of the Gemini API response object stored in state
interface GeminiResponse {
  type: GeminiMode;
  content: string;
}

// Main App Component
export default function App() {
  // --- State Hooks with TypeScript Types ---

  // State for the quote from the API
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // State for the response from Gemini API
  const [geminiResponse, setGeminiResponse] = useState<GeminiResponse | null>(
    null
  );
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // API endpoint for quotes
  const QUOTE_API_URL = "https://quotes-api-self.vercel.app/quote";

  /**
   * Fetches a random quote from the API with a retry mechanism.
   */
  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true);
    setQuoteError(null);
    // Clear previous Gemini response when fetching a new quote
    setGeminiResponse(null);
    setGeminiError(null);

    let lastError: Error | null = null;
    // Retry logic: try up to 3 times
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(QUOTE_API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Handle the API's response structure { "quote": "...", "author": "..." }
        if (data.quote && data.author) {
          setQuote({
            content: data.quote,
            author: data.author,
          });
          setQuoteLoading(false);
          return; // Success, so we exit the function.
        } else {
          throw new Error("Invalid data structure from API.");
        }
      } catch (e) {
        lastError = e as Error;
        console.error(`Attempt ${i + 1} to fetch quote failed:`, e);
        // Wait before retrying
        if (i < 2) {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }

    // If all retries failed, set the error state
    console.error("Failed to fetch quote after multiple retries:", lastError);
    setQuoteError("Failed to load quote. Please try again.");
    setQuoteLoading(false);
  }, []);

  // Fetch initial quote on component mount
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  /**
   * Calls the Gemini API with a specific prompt.
   * @param mode - The type of request to make, constrained to GeminiMode type.
   */
  const callGeminiApi = async (mode: GeminiMode) => {
    if (!quote || !quote.content) return;
    setGeminiLoading(true);
    setGeminiError(null);
    setGeminiResponse(null);

    let prompt: string = "";
    // Determine the prompt based on the selected mode
    switch (mode) {
      case "explain":
        prompt = `Explain the meaning and context of the following quote: "${quote.content}" by ${quote.author}.`;
        break;
      case "continue":
        prompt = `Creatively continue the thought of the following quote in a short paragraph: "${quote.content}" by ${quote.author}.`;
        break;
      case "summarize":
        prompt = `Based on the quote "${quote.content}", briefly summarize the general philosophy or key ideas of the author, ${quote.author}.`;
        break;
      case "visualize":
        prompt = `Act as a prompt engineer for a text-to-image AI. Based on the quote "${quote.content}" by ${quote.author}, write a short, descriptive, and visually rich prompt that could be used to generate an image representing the quote's core message or feeling.`;
        break;
      default:
        console.error("Invalid Gemini API mode");
        setGeminiLoading(false);
        return;
    }

    // IMPORTANT: In a real-world application, use an environment variable for your API key for security.
    const apiKey = "AIzaSyANwZokP0kFq-__CXzX40K_OtQNOA56wqU";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (!response.ok)
        throw new Error(`Gemini API error! status: ${response.status}`);
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setGeminiResponse({ type: mode, content: text });
      } else {
        throw new Error("Invalid response structure from Gemini API.");
      }
    } catch (e) {
      console.error("Failed to get response from Gemini:", e);
      setGeminiError("Sorry, something went wrong. Please try again.");
    } finally {
      setGeminiLoading(false);
    }
  };

  // --- UI Rendering ---
  return (
    <div className="bg-slate-900 text-white min-h-screen flex items-center justify-center font-sans p-4">
      <main className="w-full max-w-2xl mx-auto">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-10 transition-all duration-300 ease-in-out">
          <h1 className="text-3xl md:text-4xl font-bold text-cyan-400 text-center mb-8">
            AI-Enhanced Quote Generator
          </h1>

          {/* Quote Display Section */}
          <div className="min-h-[180px] flex flex-col justify-center">
            {quoteLoading ? (
              <div className="text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                <p className="mt-4">Fetching a great quote...</p>
              </div>
            ) : quoteError ? (
              <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg">
                <p>{quoteError}</p>
              </div>
            ) : (
              <div className="text-center">
                <blockquote className="text-xl md:text-2xl leading-relaxed text-slate-200 italic">
                  <p>"{quote?.content}"</p>
                </blockquote>
                <cite className="block text-right mt-6 text-cyan-400 font-medium not-italic">
                  — {quote?.author || "Unknown"}
                </cite>
              </div>
            )}
          </div>

          {/* Action Buttons Section */}
          <div className="text-center mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={fetchQuote}
              disabled={quoteLoading || geminiLoading}
              className="bg-cyan-500 text-slate-900 font-bold py-3 px-6 rounded-full hover:bg-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              Get New Quote
            </button>
            <button
              onClick={() => callGeminiApi("explain")}
              disabled={quoteLoading || geminiLoading || !quote}
              className="bg-violet-500 text-white font-bold py-3 px-6 rounded-full hover:bg-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-400/50 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              ✨ Explain
            </button>
            <button
              onClick={() => callGeminiApi("continue")}
              disabled={quoteLoading || geminiLoading || !quote}
              className="bg-amber-500 text-white font-bold py-3 px-6 rounded-full hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-400/50 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              ✨ Continue
            </button>
            <button
              onClick={() => callGeminiApi("summarize")}
              disabled={quoteLoading || geminiLoading || !quote}
              className="bg-teal-500 text-white font-bold py-3 px-6 rounded-full hover:bg-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-400/50 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              ✨ Summarize Author
            </button>
            <button
              onClick={() => callGeminiApi("visualize")}
              disabled={quoteLoading || geminiLoading || !quote}
              className="bg-rose-500 text-white font-bold py-3 px-6 rounded-full hover:bg-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-400/50 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              ✨ Visualize Quote
            </button>
          </div>

          {/* Gemini API Response Section */}
          {(geminiLoading || geminiError || geminiResponse) && (
            <div className="mt-8 pt-6 border-t border-slate-700">
              {geminiLoading && (
                <div className="text-center text-slate-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-400 mx-auto"></div>
                  <p className="mt-3">✨ Gemini is thinking...</p>
                </div>
              )}
              {geminiError && (
                <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg">
                  <p>{geminiError}</p>
                </div>
              )}
              {geminiResponse && (
                <div className="bg-slate-900/50 p-4 rounded-lg text-slate-300 text-left space-y-3">
                  <h3 className="font-bold text-violet-400">
                    {
                      {
                        explain: "Explanation:",
                        continue: "Continuation:",
                        summarize: `About ${quote?.author}:`,
                        visualize: "Image Prompt:",
                      }[geminiResponse.type]
                    }
                  </h3>
                  <p className="whitespace-pre-wrap">
                    {geminiResponse.content}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <footer className="text-center text-slate-500 mt-8 text-sm">
          <p>Quotes from Vercel API | AI features powered by Gemini</p>
        </footer>
      </main>
    </div>
  );
}
