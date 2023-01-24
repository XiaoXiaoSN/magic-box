export type Options = Record<string, any>;

export interface BoxSourceProps {
  src: BoxSource;
  clickHook: (out: string) => void;
}

export type BoxSourceFC<P = BoxSourceProps> = React.FunctionComponent<P>;

export interface BoxSource {
  name: string,
  stdout: string,
  priority?: number,
  component?: BoxSourceFC,
  options?: Options,
}
