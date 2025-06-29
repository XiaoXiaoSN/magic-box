import { DefaultBoxTemplate } from '@components/BoxTemplate';

export type BoxOptions = Record<string, BoxOptionValues> | null;
export type BoxOptionValues = string | boolean;

// Checks whether any of the given keys are exist in the BoxOptions
export const hasOptionKeys = (options: BoxOptions, ...keys: string[]): boolean => {
  if (options === null) {
    return false;
  }

  const regularKeys = keys.map((k) => k.toLowerCase());

  return regularKeys.some((key) => options[key] !== undefined);
};

// Extracts the value of the first key that is exist in the BoxOptions
export const extractOptionKeys = (
  options: BoxOptions,
  ...keys: string[]
): BoxOptionValues | null => {
  if (options === null) {
    return null;
  }

  const foundKey = keys.find((key) => options[key.toLowerCase()] !== undefined);
  return foundKey ? options[foundKey.toLowerCase()] : null;
};

export type BoxOnClickFn = (out: string) => void;

export interface BoxProps {
  name: string,
  plaintextOutput: string,
  options: BoxOptions,
  onClick: BoxOnClickFn,
  priority?: number,
  showExpandButton?: boolean,
  large?: boolean,
  onClose?: () => void,
}

export type BoxTemplate<P = BoxProps> = React.FunctionComponent<P>;

export interface Box {
  props: BoxProps,
  boxTemplate: BoxTemplate,
}

export class BoxBuilder {
  public showExpandButton: boolean = true;

  constructor(
    public name: string,
    public plaintextOutput: string,
    public options = {} as BoxOptions,
    public onClick = (() => { }) as BoxOnClickFn,
    public priority?: number,
    public boxTemplate?: BoxTemplate,
  ) { }

  setPriority(priority?: number): BoxBuilder {
    this.priority = priority;
    return this;
  }

  setOptions(options: BoxOptions): BoxBuilder {
    this.options = options;
    return this;
  }

  setOnClick(onClick: BoxOnClickFn): BoxBuilder {
    this.onClick = onClick;
    return this;
  }

  setTemplate(template?: BoxTemplate): BoxBuilder {
    this.boxTemplate = template;
    return this;
  }

  setShowExpandButton(show: boolean): BoxBuilder {
    this.showExpandButton = show;
    return this;
  }

  build(): Box {
    return {
      props: {
        name: this.name,
        plaintextOutput: this.plaintextOutput,
        priority: this.priority,
        options: this.options,
        onClick: this.onClick,
        showExpandButton: this.showExpandButton,
      },
      boxTemplate: this.boxTemplate ?? DefaultBoxTemplate,
    };
  }
}
