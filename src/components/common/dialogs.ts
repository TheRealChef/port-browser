import { useUI, type FormField } from '../../stores/uiStore';
import type { AccentColor } from '../../types/models';

/** Promise-based dialog helpers backed by the single DialogHost. */

export function askConfirm(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  option?: string;
}): Promise<{ ok: boolean; option: boolean }> {
  return new Promise((resolve) => {
    useUI.getState().setDialog({
      kind: 'confirm',
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      danger: options.danger ?? false,
      option: options.option,
      resolve,
    });
  });
}

export function askForm(options: {
  title: string;
  submitLabel?: string;
  fields: FormField[];
  validate?: (values: Record<string, string>) => string | null;
}): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    useUI.getState().setDialog({
      kind: 'form',
      title: options.title,
      submitLabel: options.submitLabel ?? 'Save',
      fields: options.fields,
      validate: options.validate,
      resolve,
    });
  });
}

export async function askText(options: {
  title: string;
  label: string;
  initial?: string;
  placeholder?: string;
  submitLabel?: string;
}): Promise<string | null> {
  const values = await askForm({
    title: options.title,
    submitLabel: options.submitLabel,
    fields: [
      {
        name: 'value',
        label: options.label,
        initial: options.initial,
        placeholder: options.placeholder,
        required: true,
      },
    ],
  });
  return values ? (values.value ?? '').trim() || null : null;
}

export function askEntity(options: {
  title: string;
  submitLabel?: string;
  initial: { name: string; icon: string; accent: AccentColor };
}): Promise<{ name: string; icon: string; accent: AccentColor } | null> {
  return new Promise((resolve) => {
    useUI.getState().setDialog({
      kind: 'entity',
      title: options.title,
      submitLabel: options.submitLabel ?? 'Save',
      initial: options.initial,
      resolve,
    });
  });
}
