import { useStore, PasscodeParser, PasscodeResponseData } from '@iris/core';

export function handlePasscodeResponse(data: PasscodeResponseData): void {
  const result = PasscodeParser.parseResponse(data);

  if (result.error) {
    useStore.getState().setPasscodeRedeemError(result.error);
    return;
  }

  if (result.rewards) {
    useStore.getState().setPasscodeRedeemSuccess(result.rewards);
    return;
  }

  useStore.getState().setPasscodeRedeemError('Unexpected passcode response.');
}
