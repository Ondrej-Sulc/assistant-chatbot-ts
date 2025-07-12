# Assistant Chatbot (TypeScript)

A personal Discord chatbot with Google Sheets and Notion integration, written in TypeScript.

## Features
- Slash commands (e.g., /exercise, /ping)
- Exercise logging and stats with Google Sheets
- Notion integration for tasks
- Modular command system
- TypeScript for type safety
- Docker support

## Setup

1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd assistant-chatbot-ts
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your secrets:
     ```sh
     cp .env.example .env
     ```
   - Edit `.env` with your Discord, Google, and Notion credentials.

4. **Run the bot:**
   ```sh
   npm run build
   npm start
   ```
   Or with Docker:
   ```sh
   docker-compose up --build
   ```

## Environment Variables
See `.env.example` for all required and optional variables.

- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_APPLICATION_ID` - Your Discord application ID
- `NOTION_API_KEY` - Notion integration token
- `NOTION_TASKS_DATABASE_ID` - Notion database for tasks
- `OPEN_ROUTER_API_KEY` - OpenRouter API key (for AI features)
- `GOOGLE_CREDENTIALS_JSON` - Google service account credentials (as JSON string)
- `TIMEZONE` - (Optional) Timezone for date formatting (default: Europe/Prague)

## Project Structure
- `src/commands/` - Command modules
- `src/utils/` - Utilities and service integrations
- `src/types/` - TypeScript type definitions
- `src/config.ts` - Configuration loader
- `src/index.ts` - Bot entry point

## Contributing
Pull requests and issues are welcome! Please:
- Use conventional commit messages
- Write clear, concise code and comments
- Add or update types as needed
- Run `npm run lint` before submitting

## License
MIT 