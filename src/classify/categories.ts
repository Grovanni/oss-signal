export const fileCategories = [
  "code",
  "tests",
  "documentation",
  "ci",
  "dependencies",
  "configuration",
  "security",
  "migrations",
  "release",
  "build",
  "generated",
  "unknown"
] as const;

export type FileCategory = (typeof fileCategories)[number];

export const strongFileCategories: readonly FileCategory[] = [
  "code",
  "tests",
  "documentation",
  "ci",
  "dependencies",
  "configuration",
  "security",
  "migrations",
  "release"
] as const;

export function createEmptyCategoryCounts(): Record<FileCategory, number> {
  return Object.fromEntries(fileCategories.map((category) => [category, 0])) as Record<
    FileCategory,
    number
  >;
}
