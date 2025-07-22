# Assistant Chatbot (TypeScript)

## Overview
This is a modular Discord bot written in TypeScript, featuring dynamic command loading, scheduling, Notion and Google Sheets integration, and error handling.

---

## Features
- **Dynamic Slash Command Loading**
- **Task and Exercise Tracking (Notion, Google Sheets)**
- **Cron-based Scheduling**
- **Centralized Error Handling**
- **Health Check HTTP Server**

---

## Centralized Error Handling

### How It Works
- All errors in commands and button handlers are routed through a centralized error handler (`src/utils/errorHandler.ts`).
- Errors are logged with a unique error ID and context (command name, user ID, etc.).
- Users receive a friendly error message with the error ID, which can be referenced for support or debugging.

### Usage in Commands
Import the utilities:
```ts
import { handleError, safeReply } from "../utils/errorHandler";
```
Wrap your logic in try/catch:
```ts
try {
  // ...command logic...
} catch (error) {
  const { userMessage, errorId } = handleError(error, {
    location: "command:yourcommand",
    userId: interaction.user.id,
  });
  await safeReply(interaction, userMessage, errorId);
}
```
- Use `handleError` for logging and generating a user message.
- Use `safeReply` to send the error message to the user (handles deferred/replied state).

### Best Practices
- Always provide context (location, userId) to `handleError` for better logs.
- Use `safeReply` for all user-facing error replies in commands and button handlers.
- For utility/services, use `handleError` for logging and propagate user-friendly errors up to the command layer.
- Error IDs help users and maintainers track and debug issues efficiently.

---

## Project Purpose

- Personal Discord bot for tracking exercise, managing tasks (Notion), scheduling messages/commands, and experimenting with AI (OpenRouter).
- Modular command system, easy to extend.

## Technologies Used

- **TypeScript** (strict mode)
- **Discord.js v14** (slash commands, components)
- **Google Sheets API** (exercise logging, schedule storage)
- **Notion API** (task management)
- **OpenRouter API** (AI chat/completions)
- **Docker** (for deployment/testing)
- **GitHub Actions** (for deployment, deploys automatically on commit/PR)

## Project Structure

- `src/commands/` — All slash commands (e.g., exercise, today, schedule)
- `src/utils/` — Service helpers (sheets, notion, openrouter, scheduler, button registry)
- `src/types/` — Shared TypeScript types
- `src/config.ts` — Loads env vars, exits if missing
- `src/index.ts` — Bot entry point, command loader, interaction handler

## Environment Variables

- See `.env.example` for all required keys (Discord, Notion, Google, OpenRouter)
- Google credentials are a JSON string
- Notion DB ID is hardcoded for now

## Notable Features / Quirks

- **Exercise logging:** `/exercise pushup|pullup` logs to Google Sheets, `/exercise stats` shows chart or today's stats
- **/today command:** fetches tasks from Notion, displays each with a ☑️ button to mark as done
- **Scheduling:** `/schedule add` lets you schedule either a command (e.g., `/today`, `/exercise pullup`) or a plain custom message to any channel or user, with flexible frequency (daily, weekly, monthly, every N days/weeks, or custom cron). Only relevant options are required. List and remove schedules with `/schedule list` and `/schedule remove`.
- Button handlers are registered by prefix (see `buttonHandlerRegistry`)
- All error replies are ephemeral and use a `safeReply` helper
- Uses Discord.js v14 "V2" components (ContainerBuilder, SectionBuilder, etc)
- All commands are auto-loaded from `src/commands/`

## TODO / Ideas

- Add more Notion task filters (e.g., by due date, priority)
- Add OpenRouter-powered chat command
- Add tests for utils/services
- Add a refresh button to `/today` to reload tasks after marking done
- Refactor large command files if they grow

## Setup Reminders

- Use `docker-compose up --build`
- If adding new commands, just drop them in `src/commands/` and export default
- For new button types, register handler with `registerButtonHandler`
- For new schedule types or logic, update `src/commands/schedule.ts` and `src/utils/schedulerService.ts`

---

_These notes are for my own reference. Update as needed when adding features or changing structure._
