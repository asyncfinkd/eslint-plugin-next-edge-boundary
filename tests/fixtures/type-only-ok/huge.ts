export type Huge = {
  a: string;
  b: number;
  c: boolean;
};

export const hugeRuntime = { payload: "x".repeat(100_000) };
