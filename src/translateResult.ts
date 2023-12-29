import { ErrorCode, ResolutionDetails, StandardResolutionReasons } from "@openfeature/server-sdk";
import { ReasonKinds, IEvalDetail } from "@featbit/node-server-sdk";

/**
 * Create a ResolutionDetails for an evaluation that produced a type different
 * than the expected type.
 * @param value The default value to populate the ResolutionDetails with.
 * @returns A ResolutionDetails with the default value.
 */
function errorResult<T>(value: T, errorCode: ErrorCode, errorMessage?: string): ResolutionDetails<T> {
  return {
    value,
    reason: StandardResolutionReasons.ERROR,
    errorCode,
    errorMessage
  };
}

export function translateResult<T>(result: IEvalDetail<T>): ResolutionDetails<T> {
  if (result.kind === ReasonKinds.WrongType) {
    return errorResult(result.value, ErrorCode.TYPE_MISMATCH, result.reason);
  }

  if (result.kind === ReasonKinds.Error) {
    return errorResult(result.value, ErrorCode.GENERAL, result.reason);
  }

  if (result.kind === ReasonKinds.ClientNotReady) {
    return errorResult(result.value, ErrorCode.PROVIDER_NOT_READY, result.reason);
  }

  const resolution: ResolutionDetails<T> = {
    value: result.value,
    reason: result.kind,
  };

  return resolution;
}