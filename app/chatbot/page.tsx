"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import MessageContent from "@/components/chatbot/MessageContent";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Database,
  TrendingUp,
  Mic,
  MicOff,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  dbQueryType?: string;
  hasOptimizationData?: boolean;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your AI inventory assistant powered by MCP. I have access to your product database and can provide insights based on ML optimization models. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join("");
          setInput(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        console.warn("Browser does not support Speech Recognition API");
      }
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        dbQueryType: data.dbQueryType,
        hasOptimizationData: data.hasOptimizationData,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error processing your request. Please make sure the backend services are running and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.",
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const exampleQueries = [
    "Show me all products in the grocery category",

    "What are the recent orders created this month?",

    "Which products have the highest profit and demand?",

    "Show products that are running low in quantity",

    "Show category-wise performance based on orders and profit",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/chatbot" />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                AI Chatbot Assistant
              </h1>
              <p className="text-sm text-gray-500">
                Ask questions about your inventory, get insights, and analyze
                your data
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">
                Powered by MCP
              </span>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div
          className="bg-white rounded-lg border border-gray-200 shadow-sm"
          style={{ height: "calc(100vh - 250px)" }}
        >
          {/* Messages Area */}
          <div className="h-full overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-purple-600" />
                  </div>
                )}

                <div
                  className={`max-w-[75%] ${
                    message.role === "user"
                      ? "bg-purple-600 text-white rounded-lg px-4 py-3"
                      : "bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3"
                  }`}
                >
                  {/* Message badges for assistant */}
                  {message.role === "assistant" &&
                    (message.dbQueryType || message.hasOptimizationData) && (
                      <div className="flex gap-2 mb-2">
                        {message.dbQueryType && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                            <Database className="h-3 w-3" />
                            Database Query
                          </span>
                        )}
                        {message.hasOptimizationData && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                            <TrendingUp className="h-3 w-3" />
                            ML Insights
                          </span>
                        )}
                      </div>
                    )}

                  {/* Message content with smart rendering for tables and charts */}
                  <MessageContent content={message.content} />

                  <p
                    className={`text-xs mt-2 ${
                      message.role === "user"
                        ? "text-purple-100"
                        : "text-gray-400"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span className="text-sm text-gray-600">
                      Analyzing your query...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex gap-3 mb-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your inventory..."
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={2}
                disabled={isLoading}
              />

              {/* Microphone Button */}
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className={`flex-shrink-0 rounded-lg px-4 py-3 flex items-center gap-2 transition-all h-fit ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-5 w-5" />
                    <span className="font-medium text-sm">Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    <span className="font-medium text-sm">Voice</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 flex items-center gap-2 transition-colors h-fit"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span className="font-medium">Send</span>
                  </>
                )}
              </button>
            </div>

            {/* Example Queries */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 self-center">
                Quick queries:
              </span>
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setInput(example)}
                  className="text-xs bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-full px-3 py-1 transition-colors"
                  disabled={isLoading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-45">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Database Queries</h3>
            </div>
            <p className="text-sm text-gray-600">
              I can query your products, orders, and suppliers directly from the
              database
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">ML Insights</h3>
            </div>
            <p className="text-sm text-gray-600">
              Access optimization recommendations and demand predictions from ML
              models
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Smart Analysis</h3>
            </div>
            <p className="text-sm text-gray-600">
              Get intelligent insights and actionable recommendations for your
              inventory
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
