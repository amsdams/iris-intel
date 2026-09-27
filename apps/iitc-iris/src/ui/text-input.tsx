import {h} from 'preact';

export interface TextInputProps extends Omit<h.JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: 'text' | 'search';
}

export function TextInput({className, ...props}: TextInputProps): h.JSX.Element {
  return (
    <input
      type="text"
      className={`iitc-iris-text-input ${className || ''}`.trim()}
      {...props}
    />
  );
}
