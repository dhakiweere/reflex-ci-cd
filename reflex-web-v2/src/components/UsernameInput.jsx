export default function UsernameInput({ username, onChange }) {
  return (
    <div className="flex flex-row justify-start gap-x-2">
      <div className="w-[12ch] font-bold">Username</div>
      <input
        className="inpt w-[20ch]"
        type="text"
        value={username}
        onChange={(v) => onChange(v.target.value)}
        placeholder="your name"
      />
    </div>
  );
}
