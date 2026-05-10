// Global Vitest setup. Keep tiny — per-test mocks live in their own files.
//
// Each test that touches Anthropic env vars or globalThis.fetch is responsible
// for stashing/restoring its own state via afterEach. We don't reset
// process.env globally here because that hides ownership of env state.
//
// `clearMocks` and `restoreMocks` are already set in vitest.config.ts.
