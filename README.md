<div align="center">

# 🤖 RGPT

### Your Personal AI Assistant — Private, Fast, Local

<img src="public/rgpt.svg" alt="RGPT Logo" width="80" />

**RGPT** is a modern desktop AI chatbot built with **Tauri + React + TypeScript**, powered by local [Ollama](https://ollama.com) models. No cloud, no API keys — everything runs on your machine.

[![License: MIT](https://img.shields.io/badge/License-MIT-10a37f.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)

</div>

---

## ✨ Features

- 🧠 **Local AI** — Runs on Ollama models (Qwen 3, Qwen 2.5, Llama, etc.) entirely on your device
- 🔒 **Private** — No data leaves your machine, no cloud dependencies
- 💬 **Chat Interface** — ChatGPT-style UI with session management
- 💭 **Thinking Display** — Shows Qwen 3's internal reasoning in a collapsible block
- 📝 **Markdown Rendering** — Full markdown support with syntax-highlighted code blocks
- 🎨 **Modern UI** — Dark theme with glassmorphism, animations, and a 3D animated login page
- 🔐 **Authentication** — Simple login system with session persistence
- 📋 **Code Copy** — One-click copy for code blocks
- ✏️ **Edit & Regenerate** — Edit messages and regenerate AI responses
- 🗑️ **Chat Management** — Create, load, and delete chat sessions
- 🔄 **Model Switching** — Switch between installed Ollama models on the fly
- 🖥️ **Desktop App** — Native desktop app via Tauri (Windows, macOS, Linux)

---

## 📸 Screenshots


### Login Page
Modern split-screen login with animated 3D cube and particle effects:

- Left panel: Gradient mesh background, floating glow orbs, rotating 3D RGPT cube
- Right panel: Clean login form with the RGPT branding

### Chat Interface
- Sidebar with chat history and delete/new chat options
- AI responses with markdown rendering and code block copy
- Thinking block display for Qwen 3 models
- Loading spinner during AI response generation

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (v18+) — [Download](https://nodejs.org)
2. **Rust** — [Install](https://rustup.rs)
3. **Ollama** — [Download](https://ollama.com/download)

### Install a Model

```bash
ollama pull qwen3:0.6b
```

You can use any Ollama model. RGPT auto-detects installed models.

### Clone & Install

```bash
git clone https://github.com/MRajibH/RGPT.git
cd RGPT
npm install
```

### Run in Development

```bash
# Web only (browser)
npm run dev

# Desktop app (Tauri)
npm run tauri dev
```

### Build for Production

```bash
# Build the desktop app
npm run tauri build
```

---

## 🏗️ Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| **Frontend** | React 18, TypeScript, Vanilla CSS |
| **Desktop**  | Tauri 2.x (Rust)                  |
| **AI Backend** | Ollama (local inference)        |
| **Markdown** | react-markdown, remark-gfm, rehype-raw |
| **Icons**    | Lucide React                      |
| **Build**    | Vite 5                            |

---

## 📁 Project Structure

```
RGPT/
├── public/
│   ├── rgpt.svg            # App icon (SVG)
│   └── rgpt-icon.png       # App icon (PNG)
├── src/
│   ├── App.tsx             # Main application component
│   ├── index.css           # All styles (dark theme, login, chat)
│   ├── main.tsx            # React entry point
│   └── vite-env.d.ts       # Vite type declarations
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs          # Tauri commands (Ollama API)
│   │   └── main.rs         # Tauri main entry
│   ├── Cargo.toml          # Rust dependencies
│   ├── tauri.conf.json     # Tauri configuration
│   └── icons/              # App icons for all platforms
├── index.html              # HTML entry point
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript config
└── vite.config.ts          # Vite config
```

---

## 🔑 Default Login

| Field    | Value   |
|----------|---------|
| Username | `rajib` |
| Password | `rajib` |

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

## 👨‍💻 Author

**Rajib**  
🌐 [rajib.uk](https://rajib.uk)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
