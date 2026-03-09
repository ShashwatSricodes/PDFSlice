import { useState, useEffect } from "react";

interface FormFillerProps {
  fields: Array<{ name: string; type: string; options?: string[] }>;
  onChange: (values: Record<string, string>) => void;
}

export function FormFiller({ fields, onChange }: FormFillerProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const defaults: Record<string, string> = {};
    fields.forEach(f => { defaults[f.name] = ""; });
    setValues(defaults);
  }, [fields]);

  const update = (name: string, value: string) => {
    const next = { ...values, [name]: value };
    setValues(next);
    onChange(next);
  };

  if (fields.length === 0) {
    return (
      <div className="py-6">
        <p className="text-sm font-mono text-muted-foreground">
          No fillable fields detected in this PDF. You can still flatten it to lock the document.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-mono text-muted-foreground">{fields.length} fields detected</p>
      {fields.map(field => (
        <div key={field.name}>
          <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
            {field.name} <span className="normal-case text-muted-foreground/60">({field.type})</span>
          </label>
          {field.type === "Text" && (
            <input
              value={values[field.name] || ""}
              onChange={(e) => update(field.name, e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          {field.type === "CheckBox" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={values[field.name] === "true"}
                onChange={(e) => update(field.name, e.target.checked ? "true" : "false")}
                className="rounded border-border"
              />
              <span className="text-sm font-mono text-foreground">Checked</span>
            </label>
          )}
          {field.type === "Dropdown" && (
            <select
              value={values[field.name] || ""}
              onChange={(e) => update(field.name, e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select...</option>
              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
          {field.type === "Radio" && (
            <div className="flex flex-wrap gap-3">
              {field.options?.map(opt => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={field.name}
                    value={opt}
                    checked={values[field.name] === opt}
                    onChange={() => update(field.name, opt)}
                  />
                  <span className="text-sm font-mono text-foreground">{opt}</span>
                </label>
              ))}
            </div>
          )}
          {!["Text", "CheckBox", "Dropdown", "Radio"].includes(field.type) && (
            <input
              value={values[field.name] || ""}
              onChange={(e) => update(field.name, e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
        </div>
      ))}
    </div>
  );
}
