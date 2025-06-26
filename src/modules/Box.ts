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

export type BoxComponent<P = BoxProps> = React.FunctionComponent<P>;

export interface Box {
  props: BoxProps,
  component: BoxComponent,
}

export class BoxBuilder {
  public showExpandButton: boolean = true;

  constructor(
    public name: string,
    public plaintextOutput: string,
    public options = {} as BoxOptions,
    public onClick = (() => { }) as BoxOnClickFn,
    public priority?: number,
    public component?: BoxComponent,
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

  setTemplate(component?: BoxComponent): BoxBuilder {
    this.component = component;
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
      component: this.component ?? DefaultBoxTemplate,
    };
  }
}
