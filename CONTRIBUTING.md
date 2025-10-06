# Contributing to the LLM Orchestration Framework

We welcome contributions from the community! Please read this guide to learn how you can help improve the framework.

## 💻 Development Setup

To get started, you'll need to clone the repository and install the dependencies.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-org/llm-orchestration-framework.git
    cd llm-orchestration-framework
    ```

2.  **Install dependencies:**
    This project uses `pnpm` for package management. Navigate to the `src-core` directory and install the dependencies.
    ```bash
    cd src-core
    pnpm install
    ```

## 🧪 Running Tests

We use `vitest` for testing. To run the tests, use the following command from the `src-core` directory:

```bash
pnpm test
```

Please make sure that all tests pass before submitting a pull request.

## ✨ Submitting a Pull Request

1.  **Fork the repository:**
    Click the "Fork" button at the top right of the repository page.

2.  **Create a new branch:**

    ```bash
    git checkout -b my-feature-branch
    ```

3.  **Make your changes:**
    Implement your feature or bug fix.

4.  **Commit your changes:**

    ```bash
    git commit -m "feat: add my new feature"
    ```

    Please follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for your commit messages.

5.  **Push your changes to your fork:**

    ```bash
    git push origin my-feature-branch
    ```

6.  **Create a pull request:**
    Open a pull request from your fork to the `main` branch of the original repository. Please provide a clear description of your changes and link to any relevant issues.

## ✍️ Code Style

We use `prettier` for code formatting and `eslint` for linting. Please make sure your code adheres to the project's code style. You can run the following commands from the root of the project to check and fix your code:

```bash
# Check formatting
pnpm format:check

# Fix formatting
pnpm format

# Check for linting errors
pnpm lint

# Fix linting errors
pnpm lint:fix
```

Thank you for contributing!
