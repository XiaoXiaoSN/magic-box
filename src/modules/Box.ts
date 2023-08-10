import { DefaultBox } from '@components/Boxes';

export type BoxOptions = Record<string, BoxOptionValues>;
export type BoxOptionValues = string | boolean;

// Checks whether any of the given keys are exist in the BoxOptions
export const hasOptionKeys = (options: BoxOptions, ...keys: string[]): boolean => {
  const regularKeys = keys.map((k) => k.toLowerCase());

  return regularKeys.some((key) => options[key] !== undefined);
};

// Extracts the value of the first key that is exist in the BoxOptions
export const extractOptionKeys = (
  options: BoxOptions,
  ...keys: string[]
): BoxOptionValues | null => {
  const foundKey = keys.find((key) => options[key.toLowerCase()] !== undefined);
  return foundKey ? options[foundKey.toLowerCase()] : null;
};

export type BoxOnClickFn = (out: string) => void;

export interface BoxProps {
  name: string,
  stdout: string,
  options: BoxOptions,
  onClick: BoxOnClickFn,
  priority?: number,
}

export type BoxComponent<P = BoxProps> = React.FunctionComponent<P>;

export interface Box {
  props: BoxProps,
  component: BoxComponent,
}

export class BoxBuilder {
  constructor(
    public name: string,
    public stdout: string,
    public options = {} as BoxOptions,
    public onClick = (() => {}) as BoxOnClickFn,
    public priority?: number,
    public component?: BoxComponent,
  ) { }

  setPriority(priority?: number) {
    this.priority = priority;
    return this;
  }

  setOptions(options: BoxOptions) {
    this.options = options;
    return this;
  }

  setOnClick(onClick: BoxOnClickFn) {
    this.onClick = onClick;
    return this;
  }

  setComponent(component?: BoxComponent) {
    this.component = component;
    return this;
  }

  build(): Box {
    return {
      props: {
        name: this.name,
        stdout: this.stdout,
        priority: this.priority,
        options: this.options,
        onClick: this.onClick,
      },
      component: this.component ?? DefaultBox,
    };
  }
}
