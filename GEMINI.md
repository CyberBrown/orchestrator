# GEMINI.MD: AI Collaboration Guide

This document provides essential context for AI models interacting with this project. Adhering to these guidelines will ensure consistency and maintain code quality.

## 1. Project Overview & Purpose

- **Primary Goal:** A generalized, modular, and production-ready framework for building multi-step AI workflows using TypeScript. It is designed to be decoupled from any specific business logic, allowing for flexible and scalable AI orchestration.
- **Business Domain:** AI Workflow Orchestration, Developer Tools, and Framework Development.

## 2. Core Technologies & Stack

- **Languages:** TypeScript (~5.3.0)
- **Frameworks & Runtimes:** Node.js (>=18.0.0). The project is a framework itself, not reliant on a specific runtime framework like Express or Next.js.
- **Databases:** The framework uses a pluggable architecture for data sources. It includes a ready-made adapter for Supabase (PostgreSQL).
- **Key Libraries/Dependencies:**
  - `@google-cloud/vertexai`: For AI provider integration (optional).
  - `@supabase/supabase-js`: For data client integration (optional).
  - `vitest`: For testing.
- **Package Manager(s):** pnpm (inferred from `pnpm-lock.yaml`).

## 3. Architectural Patterns

- **Overall Architecture:** Modular, pluggable framework architecture. The core logic is contained within the `src-core` package, which provides a workflow engine, abstractions for AI and data providers, and a dynamic action registration system. Workflows are defined declaratively in JSON files.
- **Directory Structure Philosophy:**
  - `src-core/`: Contains the primary source code for the orchestration framework.
    - `orchestrator/`: The core orchestration engine and workflow runner.
    - `plugins/`: Contains abstractions and implementations for pluggable components like AI providers (`VertexAIAdapter`) and data clients (`SupabaseClientAdapter`).
    - `actions-template/`: Provides the base classes and registry for creating workflow actions.
    - `types/`: Houses all TypeScript type definitions for the framework.
    - `config/`: Includes example workflow configurations and the workflow JSON schema.
    - `utils/`: Contains utility functions, such as the workflow loader.
  - `tests/`: Contains integration tests for the framework.

## 4. Coding Conventions & Style Guide

- **Formatting:** The project uses Prettier for automated code formatting. The configuration (`.prettierrc.json`) enforces 2-space indentation, single quotes, and no semicolons.
- **Naming Conventions:**
  - `variables`, `functions`: camelCase (`workflowRunner`)
  - `classes`, `interfaces`, `types`: PascalCase (`GenericAction`, `WorkflowDefinition`)
  - `files`: kebab-case for tests (`core-flow.test.ts`), PascalCase for class/interface definitions (`Orchestrator.ts`).
- **API Design:** The framework exposes a programmatic API centered around classes and interfaces. Key components include the `WorkflowRunner` class for executing workflows and the `AIProvider` and `DataClient` interfaces for extensibility.
- **Error Handling:** The framework includes built-in error handling mechanisms such as step-level retries, timeouts, and fallback routes defined in the workflow JSON. Custom error handlers can also be defined.

## 5. Key Files & Entrypoints

- **Main Entrypoint(s):** `src-core/index.ts` is the main entrypoint for the framework package.
- **Configuration:**
  - `src-core/package.json`: Defines project metadata, scripts, and dependencies.
  - `src-core/config/workflow-schema.json`: The JSON schema for defining workflows.
  - `src-core/config/default-workflow.json`: An example workflow definition.
  - `.prettierrc.json`: Prettier formatting configuration.
  - `.eslintrc.json`: ESLint linting configuration.
- **CI/CD Pipeline:** There is no CI/CD pipeline configured in the repository.

## 6. Development, Build & Testing

- **Commands:**
  - `pnpm install` — install dependencies synced with `pnpm-lock.yaml`.
  - `pnpm build` — transpile TypeScript to JavaScript using `tsc`.
  - `pnpm test` — run tests using `vitest`.
  - `pnpm lint` — execute `eslint` to check for code quality issues.
  - `pnpm format` — format the codebase using Prettier.
- **Testing Guidelines:** Tests are written using `vitest` and are located in the `tests/` directory. The framework is designed to be testable, with mock implementations available for core interfaces like `DataClient`.

## 7. Commit & Pull Request Guidelines

- **Commit Messages:** Commit messages should be descriptive of the changes made. While there is no strictly enforced format, clarity is important. Examples from history include `feat:`, `fix:`, and simple descriptions.

## 8. Security & Configuration

- **Secrets:** Secrets and environment-specific configurations (e.g., API keys for AI providers, database connection strings) are managed through environment variables. The `src-core/README.md` provides examples such as `GCP_PROJECT_ID` and `NEXT_PUBLIC_SUPABASE_URL`.
