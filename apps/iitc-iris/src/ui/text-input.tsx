import {h} from 'preact';

/**
 * Text input component that forwards all standard `<input>` attributes except the
 * `type` attribute, which defaults to `text` but can be overridden by the
 * `type` prop.  The original implementation always rendered a `type="text"`
 * input, ignoring the `type` prop which meant callers could not use the
 * component for `search` inputs.  This patch respects the provided `type` and
 * still falls back to `'text'` when none is supplied.
 */
export interface TextInputProps extends Omit<h.JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * The type of the `<input>` element.  Defaults to `'text'` if omitted.
   */
  type?: 'text' | 'search';
}

export function TextInput({className, type = 'text', ...props}: TextInputProps): h.JSX.Element {
  return (
    <input
      type={type}
      className={`iitc-iris-text-input ${className || ''}`.trim()}
      {...props}
    />
  );
}
