import { translateResult } from "../src/translateResult";
import { IEvalDetail, ReasonKinds } from "@featbit/node-server-sdk"
import { ErrorCode, StandardResolutionReasons } from "@openfeature/server-sdk";

it.each([
  true,
  'potato',
  42,
  { yes: 'no' },
])('puts the value into the result.', (value) => {
  const evalDetail: IEvalDetail<typeof value> = {
    value,
    kind: ReasonKinds.FallThrough,
  }

  expect(translateResult<typeof value>(evalDetail).value).toEqual(value);
});

it.each([
  ReasonKinds.Off,
  ReasonKinds.FallThrough,
  ReasonKinds.TargetMatch,
  ReasonKinds.RuleMatch
])('populates the resolution reason with kind', (kind: ReasonKinds) => {
  expect(translateResult<boolean>({
    value: true,
    kind
  }).reason).toEqual(kind);
});

it.each([
  [ReasonKinds.WrongType, ErrorCode.TYPE_MISMATCH],
  [ReasonKinds.Error, ErrorCode.GENERAL],
  [ReasonKinds.ClientNotReady, ErrorCode.PROVIDER_NOT_READY],
])('populates the resolution reason with error', (kind: ReasonKinds, expectedErrorCode) => {
  const result = translateResult<boolean>({
    value: true,
    kind
  });

  expect(result.reason).toEqual(StandardResolutionReasons.ERROR);
  expect(result.errorCode).toEqual(expectedErrorCode);
});

it('does not populate the errorCode when there is not an error', () => {
  const translated = translateResult<boolean>({
    value: true,
    kind: ReasonKinds.FallThrough,
  });
  expect(translated.errorCode).toBeUndefined();
});