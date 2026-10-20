/**
 * Accepted payment methods strip, shown wherever a customer deals with
 * payment (checkout, saved-card form, footer) so nobody types a card we
 * can't take. Discover is explicitly called out as not accepted.
 */
export function AcceptedPayments({ showNote = true }: { showNote?: boolean }) {
  const chip = 'flex items-center justify-center h-6 min-w-[42px] px-2 rounded bg-white shadow-sm ring-1 ring-gray-200'
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs font-medium text-gray-600">We accept:</span>
        <div className={chip}><span className="text-[#1a1f71] font-bold italic text-xs tracking-tight">VISA</span></div>
        <div className={chip}>
          <span className="relative inline-flex items-center">
            <span className="w-3 h-3 rounded-full bg-[#eb001b]" />
            <span className="w-3 h-3 rounded-full bg-[#f79e1b] -ml-1.5 mix-blend-multiply" />
          </span>
        </div>
        <div className="flex items-center justify-center h-6 min-w-[42px] px-2 rounded bg-[#006fcf] shadow-sm">
          <span className="text-white font-bold text-[10px] tracking-wide">AMEX</span>
        </div>
        <div className={chip}><span className="font-medium text-xs text-gray-700"><span className="text-[#4285F4]">G</span> Pay</span></div>
        <div className={chip}><span className="font-medium text-xs text-gray-800"> Pay</span></div>
      </div>
      {showNote && (
        <p className="mt-1.5 text-xs text-gray-500">
          Discover cards are <span className="font-semibold">not accepted</span>.
        </p>
      )}
    </div>
  )
}
