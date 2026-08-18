import { FileText, ImageIcon, Paperclip, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { api } from '../lib/api';
import { fileSize } from '../lib/format';
import type { Attachment } from '../lib/types';
import { Button, useAction } from './ui';

/**
 * Screenshot / bill / photo attachments for any owning record.
 * Pass exactly one owner id — the API rejects an attachment with no owner.
 */
export function Attachments({
  owner, items, onChange, compact,
}: {
  owner: Partial<Record<'quotationId' | 'projectId' | 'taskId' | 'noteId' | 'expenseId', string>>;
  items: Attachment[];
  onChange: () => void | Promise<void>;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { run, busy } = useAction();
  const [dragging, setDragging] = useState(false);

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    void run(async () => {
      const form = new FormData();
      for (const [k, v] of Object.entries(owner)) if (v) form.append(k, v);
      Array.from(files).forEach((f) => form.append('files', f));
      await api.upload('/attachments', form);
      await onChange();
    }, `${files.length} file(s) attached`);
  };

  const remove = (id: string) =>
    run(async () => {
      await api.del(`/attachments/${id}`);
      await onChange();
    }, 'Attachment removed');

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed px-4 text-center transition ${
          compact ? 'py-3' : 'py-6'
        } ${dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50'}`}
      >
        <input
          ref={input}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = '';
          }}
        />
        <Paperclip className="mx-auto size-4 text-slate-400" />
        <p className="mt-1.5 text-xs text-slate-500">
          Drop screenshots or site photos here, or{' '}
          <button className="font-medium text-brand-700 hover:underline" onClick={() => input.current?.click()}>
            browse
          </button>
        </p>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((a) => {
            const isImage = a.mimeType.startsWith('image/');
            return (
              <li key={a.id} className="group flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200">
                {isImage ? (
                  <img
                    src={api.fileUrl(`/attachments/${a.id}/file`)}
                    alt={a.originalName}
                    className="size-9 shrink-0 rounded object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded bg-slate-100">
                    <FileText className="size-4 text-slate-400" />
                  </span>
                )}
                <a
                  href={api.fileUrl(`/attachments/${a.id}/file`)}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-xs font-medium text-slate-800 hover:underline">{a.originalName}</p>
                  <p className="text-[11px] text-slate-400">{fileSize(a.size)}</p>
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => remove(a.id)}
                  className="opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5 text-red-500" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const AttachmentIcon = ({ mimeType }: { mimeType: string }) =>
  mimeType.startsWith('image/') ? <ImageIcon className="size-4" /> : <Upload className="size-4" />;
