# NOTE: Centralized AI standards have moved to `docs/AI_OPERATIONS_HANDBOOK.md`.

# This file now contains supporting context only. Always consult the master handbook first.

# GEMINI.MD: AI Collaboration Guide

This document provides essential context for AI models interacting with this project. Adhering to these guidelines will ensure consistency and maintain code quality.

## 1. Project Overview & Purpose

- **Primary Goal:** A modern content generation platform built with Next.js, leveraging AI services and brand intelligence to create personalized content at scale.
- **Business Domain:** Content Creation and Marketing Technology.

## 2. Core Technologies & Stack

- **Languages:** TypeScript
- **Frameworks & Runtimes:** Next.js 14.2.16, React 18
- **Databases:** PostgreSQL (via Supabase)
- **Key Libraries/Dependencies:** shadcn/ui, Tailwind CSS, Supabase, Google Generative AI, OpenAI
- **Package Manager(s):** pnpm
- **Formatting:** Prettier
- **Linting:** ESLint
- **Testing:** Node.js Test Runner

## 3. Architectural Patterns

- **Overall Architecture:** Monolithic Application with a Next.js App Router frontend and serverless backend functions.
- **Directory Structure:** The Next.js App Router lives in `/app`, with page-specific layouts kept beside their routes. Shared UI primitives reside in `/components` (Radix-based widgets inside `components/ui`), while cross-cutting logic sits in `/hooks` and `/lib`. Styles belong in `/styles`, static assets in `/public`, and documentation notes in `docs/`. Automation scripts, including Supabase tooling, live under `scripts/`. Add tests to `tests/` and mirror the directory of the code under test.
- **File Searching:** It is permissible to include `.gitignore` files in search queries to gain a complete understanding of the project's structure and ignored files.

## 4. Coding Conventions & Style Guide

- **Formatting:** The project uses Prettier for automated code formatting and ESLint for code quality. The configuration enforces 2-space indentation and single quotes. Run `pnpm lint` before pushing to catch any issues.
- **Naming Conventions:**
  - `variables`, `functions`: camelCase (`myVariable`)
  - `classes`, `components`: PascalCase (`MyClass`)
  - `hooks`: `use` prefix (e.g., `useMyHook`)
  - `files`: kebab-case (`my-component.ts`)
- **Styling:** Order Tailwind CSS utilities logically: layout → spacing → color. Hoist reusable variants into helpers within `/lib`.
- **API Design:** The application uses a mix of RESTful principles for its internal API routes and server-side actions.
- **Error Handling:** The project uses async/await with try...catch blocks.

## 5. Key Files & Entrypoints

- **Main Entrypoint(s):** `app/layout.tsx` and `app/page.tsx` are the primary entry points for the Next.js application.
- **Configuration:**
  - `next.config.mjs`: Next.js configuration.
  - `tsconfig.json`: TypeScript configuration.
  - `.prettierrc.json`: Prettier configuration.
  - `.env`: Environment variables (Supabase, AI provider keys, etc.).
  - `components.json`: Configuration for shadcn/ui.
- **CI/CD Pipeline:** There is no CI/CD pipeline configured in the repository.

## 6. Development, Build & Testing

- **Commands:**
  - `pnpm install` — install dependencies synced with `pnpm-lock.yaml`.
  - `pnpm dev` — launch the dev server on port 3000 with hot reload.
  - `pnpm build` / `pnpm start` — produce and run a production build.
  - `pnpm lint` — execute `next lint` with the shared ESLint rules.
  - `pnpm format` — format the entire codebase using Prettier.
  - `pnpm test` — run the Node test runner against `tests/*.test.ts`.
  - `pnpm db:install-api-billing` / `pnpm db:simplify-rls` — apply packaged Supabase migrations when schema updates land.
- **Testing Guidelines:** Tests rely on Node’s test runner configured by `tests/register-loader.mjs`. Name specs `*.test.ts`, group assertions with `describe`, and stub networked dependencies (Supabase, AI providers) through local mocks. Ship unit tests alongside new hooks or server utilities, and ensure UI changes add at least a smoke test that exercises the primary interaction path.

## 7. Commit & Pull Request Guidelines

- **Commit Messages:** Write imperative, present-tense commit messages. Strive for clear and concise messages that explain the "why" of the change, often starting with a type like `feat:`, `fix:`, or `docs:`.
- **Pull Requests:** PRs should cite the related issue or TODO, include screenshots for visible changes, and call out required migrations or env updates. Verify `pnpm lint` and `pnpm test` succeed before requesting review.

## 8. Security & Configuration

- **Secrets:** Environment secrets stay in `.env.local`; never commit Supabase or AI keys.
- **Configuration:** After adding integrations, run the migration scripts and validate role-based access with restricted test accounts. Document new configuration steps in `docs/` so future agents can reproduce your setup.

## 9. MCP Server Integration

This project uses the Model Context Protocol (MCP) to extend the AI assistant's capabilities with project-specific tools. This allows the assistant to interact with services like Supabase, GitHub, and UI libraries in a more integrated way.

### Adding a New MCP Server

To add a new MCP server, follow these steps:

1.  **Identify the Target Library**: Determine which library or service you want to integrate (e.g., `vercel`, `stripe`, etc.).

2.  **Find the MCP Server Package**: Use the `context7.resolve_library_id` tool to find the correct MCP server package. Look for a result with "MCP Server" in the title and a good trust score.

    _Example:_

    \`\`\`

    > > > context7.resolve_library_id(libraryName="shadcn/ui")
    > > > \`\`\`

3.  **Get Installation Instructions**: Use the `context7.get_library_docs` tool with the `context7CompatibleLibraryID` you found. Set the `topic` to "installation" to get the relevant documentation.

    _Example:_

    \`\`\`

    > > > context7.get_library_docs(context7CompatibleLibraryID="/jpisnice/shadcn-ui-mcp-server", topic="installation")
    > > > \`\`\`

4.  **Configure the Server**: The documentation will provide a JSON snippet to add to the `.gemini/setting.json` file. Add this snippet to the `mcpServers` object.

5.  **Provide Credentials**: Many MCP servers require API keys or access tokens. Add these to the configuration, but use placeholders initially. The user will be prompted to replace them.

6.  **Restart and Test**: The user must restart the CLI for the new settings to take effect. After the restart, test the new toolset to ensure it's working correctly.

### Verifying MCP Server Installation

After a new MCP server has been configured and the CLI has been restarted, the assistant can verify the installation by checking for the availability of the new tools. For example, after installing the GitHub MCP server, the assistant can check if the `github` tools (e.g., `search_repositories`, `create_issue`) are available.

The user may refer to a command like `/mcp list` to check for installed servers. The assistant should not attempt to run this command, as it is not available in the assistant's environment. Instead, the assistant should rely on the availability of the tools to verify the installation.
