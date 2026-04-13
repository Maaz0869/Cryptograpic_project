import { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import {
  Lock,
  Unlock,
  RefreshCw,
  ShieldCheck,
  Copy,
  Check,
  History,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

const HISTORY_STORAGE_KEY = "aes-tool-history";

function App() {
  const [modeInputs, setModeInputs] = useState({
    encrypt: "",
    decrypt: "",
  });
  const [secretKey, setSecretKey] = useState("");
  const [result, setResult] = useState("");
  const [mode, setMode] = useState("encrypt");
  const [now, setNow] = useState(Date.now());
  const [copiedField, setCopiedField] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [importError, setImportError] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const [history, setHistory] = useState(() => {
    let saved = null;

    try {
      saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    } catch {
      return [];
    }

    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      showToast("Unable to save history in browser storage", "error");
    }
  }, [history]);

  useEffect(() => {
    if (!toast.show) return undefined;

    const timer = setTimeout(() => {
      setToast({ show: false, message: "", type: "info" });
    }, 2200);

    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
  };

  const currentText = modeInputs[mode];

  const setInputForMode = (targetMode, value) => {
    setModeInputs((prev) => ({
      ...prev,
      [targetMode]: value,
    }));
  };

  const addToHistory = (entryMode, input, output) => {
    const item = {
      id: Date.now(),
      createdAt: Date.now(),
      mode: entryMode,
      input,
      output,
      timestamp: new Date().toLocaleString(),
    };

    setHistory((prev) => {
      const withoutDuplicates = prev.filter(
        (entry) =>
          !(
            entry.mode === entryMode &&
            entry.input === input &&
            entry.output === output
          ),
      );

      return [item, ...withoutDuplicates].slice(0, 12);
    });
  };

  const generateSecretKey = () => {
    const key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    setSecretKey(key);
    showToast("Strong key generated", "success");
  };

  const getKeyStrength = (value) => {
    const key = value.trim();

    if (!key) return { label: "Empty", color: "bg-slate-600", width: "0%" };

    let score = 0;

    if (key.length >= 8) score += 1;
    if (key.length >= 16) score += 1;
    if (/[a-z]/.test(key)) score += 1;
    if (/[A-Z]/.test(key)) score += 1;
    if (/[0-9]/.test(key)) score += 1;
    if (/[^A-Za-z0-9]/.test(key)) score += 1;

    if (score <= 2) {
      return { label: "Weak", color: "bg-rose-500", width: "33%" };
    }

    if (score <= 4) {
      return { label: "Medium", color: "bg-amber-400", width: "66%" };
    }

    return { label: "Strong", color: "bg-emerald-500", width: "100%" };
  };

  const keyStrength = getKeyStrength(secretKey);

  const removeHistoryItem = (id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    showToast("Entry removed", "info");
  };

  const exportHistory = () => {
    if (history.length === 0) {
      showToast("No history to export", "error");
      return;
    }

    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "aes-tool-history.json";
    link.click();
    URL.revokeObjectURL(url);

    showToast("History exported", "success");
  };

  const importHistory = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);

      if (!Array.isArray(parsed)) {
        throw new Error("Invalid history format");
      }

      const validHistory = parsed
        .filter(
          (item) =>
            item &&
            (item.mode === "encrypt" || item.mode === "decrypt") &&
            typeof item.input === "string" &&
            typeof item.output === "string",
        )
        .map((item) => ({
          id: item.id || Date.now() + Math.random(),
          createdAt: item.createdAt || Date.now(),
          mode: item.mode,
          input: item.input,
          output: item.output,
          timestamp: item.timestamp || new Date().toLocaleString(),
        }));

      if (validHistory.length === 0) {
        throw new Error("No valid entries found");
      }

      setHistory(validHistory.slice(0, 12));
      setImportError("");
      showToast("History imported", "success");
    } catch {
      setImportError(
        "Invalid history file. Please import a valid JSON export.",
      );
      showToast("Import failed", "error");
    }
  };

  const copyToClipboard = async (value, field) => {
    if (!value) {
      showToast("Nothing to copy yet", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showToast("Copied to clipboard", "success");
      setTimeout(() => setCopiedField(""), 1200);
    } catch {
      showToast("Copy failed. Browser permission required.", "error");
    }
  };

  const normalizeCipherText = (value) => value.replace(/\s+/g, "");

  const isProbablyBase64 = (value) =>
    /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0;

  const formatRelativeTime = (createdAt, fallback) => {
    if (!createdAt) return fallback || "Unknown time";

    const diffMs = Math.max(0, now - createdAt);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) return "just now";
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;

    return `${Math.floor(diffMs / day)}d ago`;
  };

  const handleProcess = () => {
    const cleanedText = currentText.trim();
    const cleanedSecret = secretKey.trim();

    if (!cleanedText || !cleanedSecret) {
      showToast("Please enter both message and secret key!", "error");
      return;
    }

    try {
      if (mode === "encrypt") {
        const encrypted = CryptoJS.AES.encrypt(
          currentText,
          cleanedSecret,
        ).toString();
        setResult(encrypted);
        addToHistory("encrypt", currentText, encrypted);
        showToast("Message encrypted successfully", "success");
      } else {
        const normalizedCipher = normalizeCipherText(cleanedText);

        if (
          !isProbablyBase64(normalizedCipher) ||
          normalizedCipher.length < 24
        ) {
          showToast("Cipher text format seems invalid", "error");
          return;
        }

        const bytes = CryptoJS.AES.decrypt(normalizedCipher, cleanedSecret);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        if (!decrypted) throw new Error("Decryption failed");
        setResult(decrypted);
        addToHistory("decrypt", currentText, decrypted);
        showToast("Message decrypted successfully", "success");
      }
    } catch {
      showToast("Invalid key or corrupted data!", "error");
      setResult("");
    }
  };

  const clearAll = () => {
    setModeInputs({ encrypt: "", decrypt: "" });
    setSecretKey("");
    setResult("");
    showToast("Inputs cleared", "info");
  };

  const clearHistory = () => {
    setHistory([]);
    showToast("History cleared", "info");
  };

  const useResultAsInput = () => {
    if (!result) {
      showToast("No result available yet", "error");
      return;
    }

    setInputForMode(mode, result);
    showToast("Result moved to input", "success");
  };

  const handleInputKeyDown = (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      handleProcess();
    }
  };

  const inputLength = currentText.length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center relative">
      {toast.show && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded-lg shadow-lg border z-50 text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-700/90 border-emerald-500"
              : toast.type === "error"
                ? "bg-rose-700/90 border-rose-500"
                : "bg-slate-700/90 border-slate-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck size={40} className="text-blue-400" />
        <h1 className="text-3xl font-bold tracking-tight">
          Cyber Security: AES Tool
        </h1>
      </div>

      <div className="w-full max-w-2xl bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex mb-6 bg-slate-900 p-1 rounded-lg">
          <button
            onClick={() => {
              setMode("encrypt");
              setResult("");
            }}
            className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition ${mode === "encrypt" ? "bg-blue-600 text-white" : "text-slate-400"}`}
          >
            <Lock size={18} /> Encrypt
          </button>
          <button
            onClick={() => {
              setMode("decrypt");
              setResult("");
            }}
            className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition ${mode === "decrypt" ? "bg-green-600 text-white" : "text-slate-400"}`}
          >
            <Unlock size={18} /> Decrypt
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-400">
              {mode === "encrypt"
                ? "Plain Text (Message)"
                : "Cipher Text (Encrypted Code)"}
            </label>
            <textarea
              value={currentText}
              onChange={(e) => setInputForMode(mode, e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none h-24"
              placeholder={
                mode === "encrypt"
                  ? "Enter secret message..."
                  : "Paste encrypted text here..."
              }
            />
            <p className="text-xs text-slate-500 mt-1">
              Characters: {inputLength}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-400">
                Secret Key (Password)
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type={showSecret ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Keep this key safe!"
              />
              <button
                onClick={() => setShowSecret((prev) => !prev)}
                className="px-3 bg-slate-700 rounded-lg hover:bg-slate-600"
                title={showSecret ? "Hide key" : "Show key"}
                aria-label={showSecret ? "Hide secret key" : "Show secret key"}
              >
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                onClick={generateSecretKey}
                className="px-3 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs font-semibold"
                title="Generate a secure random key"
              >
                Generate
              </button>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Key strength</span>
                <span>{keyStrength.label}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${keyStrength.color}`}
                  style={{ width: keyStrength.width }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleProcess}
              disabled={!currentText.trim() || !secretKey.trim()}
              className={`flex-1 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${mode === "encrypt" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
            >
              {mode === "encrypt" ? "Generate Cipher" : "Reveal Message"}
            </button>
            <button
              onClick={() => copyToClipboard(currentText, "input")}
              className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600"
              title="Copy input"
              aria-label="Copy input text"
            >
              {copiedField === "input" ? (
                <Check size={20} />
              ) : (
                <Copy size={20} />
              )}
            </button>
            <button
              onClick={clearAll}
              className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600"
              aria-label="Clear all fields"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-8 p-4 bg-slate-900 rounded-lg border border-dashed border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase font-bold text-slate-500">
                Result:
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={useResultAsInput}
                  className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                >
                  Use as Input
                </button>
                <button
                  onClick={() => copyToClipboard(result, "result")}
                  className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 flex items-center gap-1"
                  aria-label="Copy result"
                >
                  {copiedField === "result" ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                  {copiedField === "result" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="font-mono break-all text-blue-300 selection:bg-blue-500 selection:text-white">
              {result}
            </p>
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl mt-6 bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-300" />
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportHistory}
              disabled={history.length === 0}
              className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600"
            >
              Export
            </button>
            <label className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 cursor-pointer">
              Import
              <input
                type="file"
                accept="application/json"
                onChange={importHistory}
                className="hidden"
              />
            </label>
            <button
              onClick={clearHistory}
              disabled={history.length === 0}
              className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 flex items-center gap-1"
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>

        {importError && (
          <p className="mb-3 text-xs text-rose-300">{importError}</p>
        )}

        {history.length === 0 ? (
          <p className="text-sm text-slate-400">
            No history yet. Perform encrypt/decrypt to save entries.
          </p>
        ) : (
          <div className="space-y-3 max-h-72 overflow-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-slate-900 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${item.mode === "encrypt" ? "bg-blue-600/30 text-blue-300" : "bg-green-600/30 text-green-300"}`}
                  >
                    {item.mode.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatRelativeTime(item.createdAt, item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">Input</p>
                <p className="text-xs font-mono break-all text-slate-200 mb-2">
                  {item.input}
                </p>
                <p className="text-xs text-slate-400 mb-1">Output</p>
                <p className="text-xs font-mono break-all text-slate-300">
                  {item.output}
                </p>
                <button
                  onClick={() => {
                    setMode(item.mode);
                    setInputForMode(item.mode, item.input);
                    setResult(item.output);
                    showToast("Loaded from history", "info");
                  }}
                  className="mt-2 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 mr-2"
                >
                  Load Entry
                </button>
                <button
                  onClick={() =>
                    copyToClipboard(item.output, `history-${item.id}`)
                  }
                  className="mt-2 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 mr-2"
                >
                  {copiedField === `history-${item.id}`
                    ? "Copied"
                    : "Copy Output"}
                </button>
                <button
                  onClick={() => removeHistoryItem(item.id)}
                  className="mt-2 text-xs px-2 py-1 rounded bg-rose-800/60 hover:bg-rose-700/80"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-amber-300/90 max-w-2xl text-center">
        Security note: Your recent activity is stored in browser local storage
        on this device.
      </p>

      <p className="mt-6 text-slate-500 text-sm italic">
        Tip: Press Ctrl+Enter in input box to run quickly.
      </p>
    </div>
  );
}

export default App;
