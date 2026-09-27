import {h} from 'preact';

export interface TextInputProps extends Omit<h.JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: 'text' | 'search';
}

export function TextInput(props: TextInputProps): h.JSX.Element {
  return (
    <input
      type="text"
      {...props}
    />
  );
}
