import {h} from 'preact';
import './layer-choice.css';

export interface LayerChoiceProps extends Omit<h.JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  type: 'checkbox' | 'radio';
}

export function LayerChoice({label, type = 'checkbox', ...props}: LayerChoiceProps): h.JSX.Element {
  return (
    <label className={`iitc-iris-layer-choice ${props.checked ? 'is-checked' : ''}`} title={props.title}>
      <input type={type} {...props} title={undefined} />
      <span className="iitc-iris-layer-choice-label">{label}</span>
    </label>
  );
}
