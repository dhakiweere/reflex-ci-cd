export default function StatusBar({ isModified, modifiedBy }) {
  if (!isModified) return null;

  return (
    <div className="status-bar p-2">
      {modifiedBy ? `Modified by ${modifiedBy}` : 'Modified'}
    </div>
  );
}
