const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-bg-elevated text-txt-muted',
  pass: 'bg-emerald-500/15 text-emerald-400',
  partial: 'bg-amber-500/15 text-amber-400',
  fail: 'bg-red-500/15 text-red-400',
  error: 'bg-red-500/10 text-txt-muted',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  pass: 'Pass',
  partial: 'Partial',
  fail: 'Fail',
  error: 'Error',
};

export function StatusBadge({ status, passCount, totalCount }: {
  status: string;
  passCount?: number | null;
  totalCount?: number | null;
}) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const label = STATUS_LABELS[status] || status;
  const counts = passCount != null && totalCount != null ? ` ${passCount}/${totalCount}` : '';

  return (
    <span className={`inline-flex items-center text-2xs font-mono font-medium px-2 py-0.5 rounded-sm ${style}`}>
      {label}{counts}
    </span>
  );
}
