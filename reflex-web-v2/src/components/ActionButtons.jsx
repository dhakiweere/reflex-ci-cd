export default function ActionButtons({ onPush, onReset, isModified, owner, canPush, modifiedBy }) {
  const resetLabel = owner
    ? 'Reset to original'
    : `${modifiedBy || 'Someone'} modified this — reset it?`;

  return (
    <div className="flex flex-row md:flex-col md:gap-y-3 md:items-center gap-x-2">
      <button
        className={canPush ? 'btn accent-sq-btn' : 'btn-disabled'}
        onClick={onPush}
        disabled={!canPush}
      >
        Push
      </button>

      {isModified && (
        <button className="btn accent2-sq-btn" onClick={onReset}>
          {resetLabel}
        </button>
      )}
    </div>
  );
}
