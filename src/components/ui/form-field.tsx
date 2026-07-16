import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type FieldShellProps = {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

function FieldShell({ children, error, hint, label }: FieldShellProps) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-stone-800">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-red-700">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

const fieldClass =
  "h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-800 focus:ring-2 focus:ring-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextInput({ className = "", error, hint, label, ...props }: TextInputProps) {
  return (
    <FieldShell error={error} hint={hint} label={label}>
      <input className={[fieldClass, className].join(" ")} {...props} />
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
};

export function SelectField({
  className = "",
  error,
  hint,
  label,
  options,
  placeholder,
  ...props
}: SelectFieldProps) {
  return (
    <FieldShell error={error} hint={hint} label={label}>
      <select className={[fieldClass, className].join(" ")} {...props}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextAreaField({
  className = "",
  error,
  hint,
  label,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldShell error={error} hint={hint} label={label}>
      <textarea
        className={[
          fieldClass,
          "min-h-24 resize-y py-2 leading-6",
          className,
        ].join(" ")}
        {...props}
      />
    </FieldShell>
  );
}
