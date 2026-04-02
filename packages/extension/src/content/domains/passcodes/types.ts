export interface PasscodeRewardAwardData {
  level?: number;
  count?: number;
}

export interface PasscodeRewardInventoryItemData {
  name?: string;
  awards?: PasscodeRewardAwardData[];
}

export interface PasscodeRewardsData {
  xm?: number;
  ap?: number;
  other?: string[];
  inventory?: PasscodeRewardInventoryItemData[];
}

export interface PasscodeResponseData {
  error?: string;
  rewards?: PasscodeRewardsData;
}
