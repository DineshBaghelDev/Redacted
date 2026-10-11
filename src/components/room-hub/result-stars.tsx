export function ResultStars({ count }: { count: number }) {
  return <span aria-label={`${count} out of 5 stars`} className="inline-flex items-center gap-1">{Array.from({ length: 5 }, (_, index) => <span aria-hidden="true" className={`case-star ${index < count ? "case-star--filled" : "case-star--empty"}`} key={index} />)}</span>;
}
