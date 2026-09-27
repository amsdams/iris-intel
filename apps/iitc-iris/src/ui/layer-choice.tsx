import {h} from 'preact';

export interface LayerChoiceProps extends Omit<h.JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function LayerCheckbox({label, ...props}: LayerChoiceProps): h.JSX.Element {
  return (
    <label className={`iitc-iris-layer-choice ${props.checked ? 'is-checked' : ''}`} title={props.title}>
      <input type="checkbox" {...props} title={undefined} />
      <span className="iitc-iris-layer-choice-label">{label}</span>
    </label>
  );
}

export function LayerRadio({label, ...props}: LayerChoiceProps): h.JSX.Element {
  return (
    <label className={`iitc-iris-layer-choice ${props.checked ? 'is-checked' : ''}`} title={props.title}>
      <input type="radio" {...props} title={undefined} />
      <span className="iitc-iris-layer-choice-label">{label}</span>
    </label>
  );
}
