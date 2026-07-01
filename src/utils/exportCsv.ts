export function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF';
  const line = (cells: string[]) =>
    cells.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
  const csv = [line(headers), ...rows.map(line)].join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
