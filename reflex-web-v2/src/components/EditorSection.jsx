import Editor from '@monaco-editor/react';

export default function EditorSection({ source, onChange, branch, commitSha }) {
  const shortSha = commitSha?.slice(0, 7) || '—';

  return (
    <>
      <div className="commit-details w-full h-fit overflow-x-hidden">
        <div className="flex flex-row">
          <p className="w-[10ch]">Viewing</p>:
          <span className="text-accent ms-2">page.jsx</span>
        </div>
        <div className="flex flex-row">
          <p className="w-[10ch]">Branch</p>
          <p>:&nbsp;{branch || '—'}</p>
        </div>
        <div className="flex flex-row w-full h-fit">
          <p className="w-[10ch] shrink-0">Commit</p>
          <p>:&nbsp;{shortSha}</p>
        </div>
      </div>

      <div className="editor-wrapper">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={source}
          theme="vs-dark"
          onChange={(value) => onChange(value || '')}
        />
      </div>
    </>
  );
}
