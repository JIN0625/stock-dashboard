/**
 * ModalFooter
 *
 * Sticky bottom action bar for bottom-sheet modals.
 * Adds enough padding so buttons are never hidden behind:
 *   - BottomNav (≈ 64 px)
 *   - iPhone home indicator / safe area
 *   - PWA chrome
 *
 * Usage:
 *   <ModalFooter>
 *     <div className="flex gap-3">
 *       <button …>取消</button>
 *       <button …>確認</button>
 *     </div>
 *   </ModalFooter>
 */
export default function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky bottom-0 shrink-0 bg-white border-t border-gray-100 px-4 pt-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
    >
      {children}
    </div>
  );
}
