interface TimelineItem {
  title: string;
  date: string;
  done?: boolean;
  reject?: boolean;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative pe-5">
      <div className="absolute end-[7px] top-1 bottom-1 w-0.5 bg-[#e3e9f2]" />
      {items.map((item, i) => (
        <div key={i} className="relative pb-4 last:pb-0">
          <span
            className={`absolute -end-[19px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px] ${
              item.reject ? 'bg-red-500 shadow-red-500' : item.done ? 'bg-brand-500 shadow-brand-500' : 'bg-navy/40 shadow-navy/40'
            }`}
          />
          <div className={`font-bold text-sm ${item.reject ? 'text-red-700' : 'text-navy'}`}>{item.title}</div>
          <div className="text-xs text-muted mt-0.5">{item.date}</div>
        </div>
      ))}
    </div>
  );
}
