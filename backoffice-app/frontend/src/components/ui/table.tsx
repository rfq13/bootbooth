import { cn } from '../../lib/utils'

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse', className)} {...props} />
}
export function Thead(props: React.HTMLAttributes<HTMLTableSectionElement>) { return <thead {...props} /> }
export function Tbody(props: React.HTMLAttributes<HTMLTableSectionElement>) { return <tbody {...props} /> }
export function Tr(props: React.HTMLAttributes<HTMLTableRowElement>) { return <tr {...props} /> }
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('border-b border-[#e5e7eb] py-3 text-left text-sm font-semibold text-[#6c757d]', className)} {...props} />
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-[#e5e7eb] py-3 text-sm', className)} {...props} />
}