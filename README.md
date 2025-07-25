# Assistant Chatbot (TypeScript)

A personal, modular Discord bot built with TypeScript. This bot integrates with Notion for task management, Google Sheets for data logging, and OpenRouter for AI capabilities, all running on Discord.js v14.

## Key Features

-   **Dynamic Command Loading:** Commands in the `src/commands` directory are automatically registered on startup.
-   **Task Management (Notion):** Create new tasks (`/newtask`) and view today's agenda (`/today`) with interactive completion buttons.
-   **Exercise Logging (Google Sheets):** Log pushups and pullups with quick-add buttons or specific amounts.
-   **Stats Visualization:** View exercise statistics as a chart for various timeframes (`/exercise stats`).
-   **Advanced Scheduling:** Schedule commands or custom messages with flexible timing (daily, weekly, custom cron, etc.) via `/schedule`.
-   **Centralized Error Handling:** A robust system that provides users with a unique error ID while logging detailed context for debugging.
-   **Dockerized Environment:** Fully containerized for consistent development and easy deployment.
-   **CI/CD Pipeline:** Automated deployments to Railway via GitHub Actions on every push to `main`.

## Technology Stack

-   **Language:** TypeScript (Strict Mode)
-   **Framework:** Discord.js v14
-   **APIs:** Notion, Google Sheets, OpenRouter
-   **Scheduling:** `node-cron`
-   **Containerization:** Docker & Docker Compose
-   **Deployment:** Railway.app & GitHub Actions

---

## Getting Started (Local Development)

### Prerequisites

-   Node.js v18+
-   Docker and Docker Compose
-   A Discord Bot application
-   API keys for Notion, Google, and OpenRouter

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd assistant-chatbot-ts
```

### 2. Set Up Environment Variables

Create a `.env` file by copying the example:

```bash
cp .env.example .env
```

Fill in the values in the `.env` file.

**Important:** For `GOOGLE_CREDENTIALS_JSON`, you must provide the full JSON content of your service account key, encoded in Base64. You can generate this with the following command:

```bash
# For Linux/macOS
cat /path/to/your/credentials.json | base64 -w 0

# For Windows (in PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("/path/to/your/credentials.json"))
```

Copy the resulting string into the `.env` file.

### 3. Run the Bot

Use Docker Compose to build the image and start the container. The `docker-compose.yaml` is configured for development with hot-reloading.

```bash
docker-compose up --build
```

The bot should now be running and connected to Discord.

---

## Project Structure

assistant-chatbot-ts/
├── .github/workflows/  # CI/CD pipeline for deployment
├── src/
│   ├── commands/       # Each file is a slash command
│   ├── types/          # Shared TypeScript interfaces and types
│   ├── utils/          # Service clients and helper functions
│   ├── config.ts       # Environment variable loading and validation
│   └── index.ts        # Bot entry point, client setup, event handlers
├── Dockerfile          # Multi-stage build for lean production images
├── docker-compose.yaml # Development environment setup
└── README.md           # You are here

---

## Core Concepts & Architecture

This section provides an overview of the main architectural patterns, intended to guide future development and LLM-based assistance.

### Command Handling

-   **Location:** `src/commands/`
-   **Pattern:** Each command file exports a `default` object conforming to the `Command` interface (`src/types/command.ts`).
-   **Separation of Concerns:**
    -   The `execute` function handles Discord-specific logic (interactions, replies, deferrals).
    -   The `core` function contains the pure business logic. It is decoupled from Discord.js and can be tested independently or called from other parts of the application (like the scheduler).

### Error Handling

-   **Location:** `src/utils/errorHandler.ts`
-   **Flow:** All `try/catch` blocks in commands and button handlers call `handleError`.
-   **Functionality:**
    1.  `handleError` logs the full error with context (location, user ID) and generates a unique, 4-byte hex `errorId`.
    2.  It returns a user-friendly message containing this `errorId`.
    3.  `safeReply` is used to send this message to the user, correctly handling whether the interaction has already been deferred or replied to.

### Scheduling Service

-   **Location:** `src/utils/schedulerService.ts` & `src/utils/sheetsService.ts`
-   **Storage:** Schedule configurations are stored as rows in a dedicated Google Sheet ("Schedules").
-   **Execution:**
    1.  On startup, `startScheduler` fetches all active schedules from the sheet.
    2.  It creates `node-cron` jobs for each schedule.
    3.  Scheduled jobs can either send a simple message or execute a command's `core` function, allowing complex tasks to be automated.

### Button Handling

-   **Location:** `src/utils/buttonHandlerRegistry.ts`
-   **Pattern:** Handlers are registered with a string `prefix` (e.g., `complete-task-`).
-   **Execution:** The main `interactionCreate` event listener uses `getButtonHandler` to find the correct handler based on the `customId` of the clicked button. This avoids a giant `if/else` or `switch` statement.

---

## Deployment

This project is configured for continuous deployment to [Railway](https://railway.app/).

-   **Trigger:** A `git push` to the `main` branch.
-   **Process:**
    1.  The GitHub Action defined in `.github/workflows/deploy.yml` is triggered.
    2.  It uses the Railway CLI to deploy the application.
    3.  Railway automatically detects the `Dockerfile` and builds the `production` stage, creating a lean, optimized image.
    4.  Environment variables are passed securely from GitHub Secrets to the Railway build environment.

## Future Work & Ideas

-   [ ] Add an OpenRouter-powered command.