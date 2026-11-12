import { useState, type FormEvent } from 'react';
import { EntityIcon } from './EntityIcon';
import { useUI, type DialogRequest } from '../../stores/uiStore';
import { ACCENTS } from '../../features/workspace/appearance';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { AccentPicker, IconPicker } from './Pickers';

const inputClass =
  'h-8 w-full rounded-md border border-line-strong bg-surface px-2.5 text-[13px] text-fg outline-none transition-ui placeholder:text-fg-3 focus:border-focus/80 focus:shadow-[0_0_0_3px_var(--focus-soft)]';

export function DialogHost() {
  const dialog = useUI((s) => s.dialog);
  const setDialog = useUI((s) => s.setDialog);
  if (!dialog) return null;
  const done = () => setDialog(null);
  // Keyed so each request gets fresh local state.
  const key = `${dialog.kind}:${dialog.title}`;
  switch (dialog.kind) {
    case 'confirm':
      return <ConfirmDialog key={key} request={dialog} done={done} />;
    case 'form':
      return <FormDialog key={key} request={dialog} done={done} />;
    case 'entity':
      return <EntityDialog key={key} request={dialog} done={done} />;
  }
}

function ConfirmDialog({
  request,
  done,
}: {
  request: Extract<DialogRequest, { kind: 'confirm' }>;
  done: () => void;
}) {
  const [option, setOption] = useState(false);
  const finish = (ok: boolean) => {
    done();
    request.resolve({ ok, option: ok && option });
  };
  return (
    <Dialog
      title={request.title}
      onClose={() => finish(false)}
      footer={
        <>
          <Button variant="ghost" onClick={() => finish(false)}>
            Cancel
          </Button>
          <Button
            data-autofocus
            variant={request.danger ? 'danger' : 'primary'}
            onClick={() => finish(true)}
          >
            {request.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-fg-2">{request.message}</p>
      {request.option && (
        <label className="mt-3 flex items-center gap-2 text-[13px] text-fg-2">
          <input
            type="checkbox"
            checked={option}
            onChange={(e) => setOption(e.target.checked)}
            className="size-3.5 accent-[var(--accent)]"
          />
          {request.option}
        </label>
      )}
    </Dialog>
  );
}

function FormDialog({
  request,
  done,
}: {
  request: Extract<DialogRequest, { kind: 'form' }>;
  done: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(request.fields.map((f) => [f.name, f.initial ?? ''])),
  );
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    done();
    request.resolve(null);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const missing = request.fields.find((f) => f.required && !values[f.name]?.trim());
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    const problem = request.validate?.(values) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    done();
    request.resolve(values);
  };

  return (
    <Dialog title={request.title} onClose={cancel}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {request.fields.map((field, index) => (
          <label key={field.name} className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-fg-2">{field.label}</span>
            {field.type === 'select' ? (
              <select
                data-autofocus={index === 0 ? true : undefined}
                className={inputClass}
                value={values[field.name] ?? ''}
                onChange={(e) => {
                  setError(null);
                  setValues((v) => ({ ...v, [field.name]: e.target.value }));
                }}
              >
                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                data-autofocus={index === 0 ? true : undefined}
                className={inputClass}
                value={values[field.name] ?? ''}
                placeholder={field.placeholder}
                spellCheck={field.type === 'url' ? false : undefined}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  setError(null);
                  setValues((v) => ({ ...v, [field.name]: e.target.value }));
                }}
              />
            )}
          </label>
        ))}
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <Button variant="ghost" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {request.submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EntityDialog({
  request,
  done,
}: {
  request: Extract<DialogRequest, { kind: 'entity' }>;
  done: () => void;
}) {
  const [name, setName] = useState(request.initial.name);
  const [icon, setIcon] = useState(request.initial.icon);
  const [accent, setAccent] = useState(request.initial.accent);

  const cancel = () => {
    done();
    request.resolve(null);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    done();
    request.resolve({ name: name.trim(), icon, accent });
  };

  return (
    <Dialog title={request.title} onClose={cancel} width="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface"
            style={{ color: ACCENTS[accent].value }}
          >
            <EntityIcon name={icon} size={20} strokeWidth={1.9} />
          </span>
          <input
            data-autofocus
            aria-label="Name"
            className={inputClass + ' h-10 text-[14px]'}
            value={name}
            maxLength={80}
            placeholder="Name"
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <section className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-fg-2">Color</span>
          <AccentPicker value={accent} onChange={setAccent} />
        </section>
        <section className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-fg-2">Icon</span>
          <IconPicker value={icon} accent={accent} onChange={setIcon} />
        </section>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            {request.submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
