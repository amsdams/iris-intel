export interface PasscodeRewardAwardData {
  level?: number | string;
  count?: number | string;
}

export interface PasscodeRewardInventoryItemData {
  name?: string;
  awards?: PasscodeRewardAwardData[];
}

export interface PasscodeRewardsData {
  xm?: number | string;
  ap?: number | string;
  other?: string[];
  inventory?: PasscodeRewardInventoryItemData[];
}

export interface PasscodeResponseData {
  error?: string;
  rewards?: PasscodeRewardsData;
}
