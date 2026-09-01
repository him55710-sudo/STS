import type { SocialSourceError, SocialSourceErrorCode } from "./types";

type ErrorInput = {
  readonly rowNumber: number;
  readonly code: SocialSourceErrorCode;
  readonly field: string | null;
  readonly message: string;
};

export function socialSourceError(input: ErrorInput): SocialSourceError {
  return {
    kind: "quarantine",
    rowNumber: input.rowNumber,
    code: input.code,
    field: input.field,
    message: input.message,
  };
}
