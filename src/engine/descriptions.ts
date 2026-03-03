/** Resolve the appropriate description for the current mode. */
export function resolveDescription(
  standard: string,
  easy: string | undefined,
  useEasyRead: boolean,
): string {
  return useEasyRead && easy ? easy : standard;
}
