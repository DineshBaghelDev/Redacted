import { menuButton, panel } from "../constants";

type FreshStartModalProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

export function FreshStartModal({ onConfirm, onCancel }: FreshStartModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
      <div className={`${panel} w-full max-w-md text-center`}>
        <h2 className="text-3xl uppercase text-cyan-50">Start fresh?</h2>
        <p className="mt-4 text-xl text-cyan-100">
          This will delete your previous progress and state.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button className={`${menuButton} text-yellow-200`} onClick={onConfirm} type="button">
            Start fresh
          </button>
          <button className={menuButton} onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}