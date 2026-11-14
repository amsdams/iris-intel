import {useEffect, useState} from 'preact/hooks';
import {readLocalStorage, writeLocalStorage} from '../platform/storage';

export type UiTextSize = 'normal' | 'larger';
const STORAGE_KEY = 'iitc-iris:ui-text-size';

export function useUiTextSize(): {textSize: UiTextSize; setTextSize: (size: UiTextSize) => void} {
  const [textSize, setTextSize] = useState<UiTextSize>(() => readLocalStorage(
    storage => storage?.getItem(STORAGE_KEY) === 'larger' ? 'larger' : 'normal', () => 'normal'));
  useEffect(() => {
    document.documentElement.dataset.iitcIrisTextSize = textSize;
    writeLocalStorage(storage => storage?.setItem(STORAGE_KEY, textSize));
  }, [textSize]);
  return {textSize, setTextSize};
}
