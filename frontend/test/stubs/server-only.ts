// Runtime stub for Next's `server-only` marker module. Next resolves this to an
// empty module during a real build; under Vitest we alias to this file so that
// importing server-only code does not throw a MODULE_NOT_FOUND at runtime.
export {};
