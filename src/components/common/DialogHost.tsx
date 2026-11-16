import { useState, type FormEvent } from 'react';
import { EntityIcon } from './EntityIcon';
import { useUI, type DialogRequest } from '../../stores/uiStore';
import { cn } from '../../utils/misc';
import { Button } from './Button';
import { Checkbox } from './Controls';
import { Dialog } from './Dialog';
import { AccentPicker, IconPicker } from './Pickers';

const inputClass = 'field h-8 w-full px-2.5 text-[13px]';

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
      <p className="text-[12.5px] leading-[18px] text-fg-2">{request.message}</p>
      {request.option && (
        <div className="mt-3">
          <Checkbox checked={option} onChange={setOption}>
            {request.option}
          </Checkbox>
        </div>
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
            <span className="tf-l">{field.label}</span>
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
        {error && <p className="text-[11.5px] text-danger-ink">{error}</p>}
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
          <span className={cn('icbox size-10 rounded-[10px]', `h-${accent}`)}>
            <EntityIcon name={icon} size={20} />
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
          <span className="tf-l">Color</span>
          <AccentPicker value={accent} onChange={setAccent} />
        </section>
        <section className="flex flex-col gap-2">
          <span className="tf-l">Icon</span>
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
