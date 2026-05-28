import type { Voucher } from '@/types'

interface Props {
  voucher: Voucher
  hotspotName?: string
  currency?: string
}

export default function VoucherCard({
  voucher,
  hotspotName = 'WiFi Voucher',
  currency = '₱',
}: Props) {
  return (
    <div className="voucher-card">
      <div className="voucher-header">
        <span className="voucher-title">{hotspotName}</span>
        <span className="voucher-amount">{currency}{voucher.amount}</span>
      </div>
      <div className="voucher-divider" />
      <div className="voucher-code">{voucher.code}</div>
      <div className="voucher-meta">
        <span>{voucher.profile}</span>
        <span className="voucher-dot">&#183;</span>
        <span>{voucher.timeLimitLabel}</span>
      </div>
    </div>
  )
}
