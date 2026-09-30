// The aggregate download, as a bar and a number. Indeterminate while only a
// sign of life is known (the tokenizer files carry no total).
const LocalAIProgress = ({
  label,
  percent,
}: {
  label: string;
  percent: number | null;
}): React.JSX.Element => (
  <div className="local-ai-progress" data-testid="local-ai-progress">
    <span>{percent === null ? label : `${Math.floor(percent)}%`}</span>
    <progress aria-label={label} max={100} value={percent ?? undefined} />
  </div>
);

export default LocalAIProgress;
