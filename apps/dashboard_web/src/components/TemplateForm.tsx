import React from "react";

type AnyObj = any;

function CounterRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0" }}>
      <div style={{ width: 260, fontWeight: 800 }}>{label}</div>

      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width: 48, height: 48, fontSize: 24, borderRadius: 12, border: "1px solid #ccc" }}
      >
        -
      </button>

      <div style={{ width: 64, textAlign: "center", fontSize: 24, fontWeight: 900 }}>{value}</div>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={{ width: 48, height: 48, fontSize: 24, borderRadius: 12, border: "1px solid #ccc" }}
      >
        +
      </button>
    </div>
  );
}

/**
 * picklist_counter stores counts PER option:
 * values[itemId] = { optionValue1: 3, optionValue2: 1, ... }
 */
function PicklistCounter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: AnyObj[];
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const optionValues = (options ?? []).map((o: AnyObj) => String(o?.value ?? o));
  const [selected, setSelected] = React.useState<string>(optionValues[0] ?? "");

  React.useEffect(() => {
    if ((!selected || selected.length === 0) && optionValues.length > 0) {
      setSelected(optionValues[0]);
    }
  }, [optionValues, selected]);

  const currentCount = value?.[selected] ?? 0;

  const setCount = (newCount: number) => {
    onChange({
      ...(value ?? {}),
      [selected]: Math.max(0, newCount),
    });
  };

  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ width: 260, padding: 10, borderRadius: 12, border: "1px solid #ccc", fontSize: 16 }}
        >
          {(options ?? []).map((o: AnyObj, idx: number) => {
            const v = String(o?.value ?? o);
            const t = String(o?.label ?? o?.value ?? o);
            return (
              <option key={`${v}_${idx}`} value={v}>
                {t}
              </option>
            );
          })}
        </select>

        <button
          type="button"
          onClick={() => setCount(currentCount - 1)}
          style={{ width: 48, height: 48, fontSize: 24, borderRadius: 12, border: "1px solid #ccc" }}
        >
          -
        </button>

        <div style={{ width: 64, textAlign: "center", fontSize: 24, fontWeight: 900 }}>{currentCount}</div>

        <button
          type="button"
          onClick={() => setCount(currentCount + 1)}
          style={{ width: 48, height: 48, fontSize: 24, borderRadius: 12, border: "1px solid #ccc" }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function TemplateForm({
  template,
  values,
  setValue,
}: {
  template: AnyObj;
  values: Record<string, any>;
  setValue: (id: string, value: any) => void;
}) {
  const phases = template?.phases ?? [];

  const renderItem = (item: AnyObj) => {
    const itemId = item?.id;
    if (!itemId) return null;

    const label = item?.label ?? itemId;
    const type = item?.type ?? "counter";

    if (type === "counter") {
      const v = typeof values[itemId] === "number" ? values[itemId] : 0;
      return <CounterRow key={itemId} label={label} value={v} onChange={(nv) => setValue(itemId, nv)} />;
    }

    if (type === "toggle") {
      const v = !!values[itemId];
      return (
        <label key={itemId} style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
          <input type="checkbox" checked={v} onChange={(e) => setValue(itemId, e.target.checked)} />
          <span style={{ fontWeight: 800 }}>{label}</span>
        </label>
      );
    }

    if (type === "select") {
      const opts = Array.isArray(item?.options) ? item.options : [];
      const v = values[itemId] ?? "";
      return (
        <div key={itemId} style={{ margin: "12px 0" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
          <select
            value={v}
            onChange={(e) => setValue(itemId, e.target.value)}
            style={{ width: 360, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
          >
            <option value="">Select…</option>
            {opts.map((o: AnyObj, idx: number) => {
              const ov = String(o?.value ?? o);
              const ot = String(o?.label ?? o?.value ?? o);
              return (
                <option key={`${ov}_${idx}`} value={ov}>
                  {ot}
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    if (type === "picklist_counter") {
      const opts = Array.isArray(item?.options) ? item.options : [];
      const v = typeof values[itemId] === "object" && values[itemId] ? values[itemId] : {};
      return <PicklistCounter key={itemId} label={label} options={opts} value={v} onChange={(nv) => setValue(itemId, nv)} />;
    }

    // default text
    const v = values[itemId] ?? "";
    return (
      <div key={itemId} style={{ margin: "12px 0" }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
        <input
          value={v}
          onChange={(e) => setValue(itemId, e.target.value)}
          placeholder={item?.placeholder ?? ""}
          style={{ width: 460, padding: 10, borderRadius: 12, border: "1px solid #ccc" }}
        />
      </div>
    );
  };

  return (
    <div>
      {phases.map((phase: AnyObj) => (
        <div key={phase.id} style={{ marginTop: 18, paddingTop: 10, borderTop: "1px solid #eee" }}>
          <h2 style={{ margin: "6px 0" }}>{phase.label ?? phase.id}</h2>

          {(phase.blocks ?? []).map((block: AnyObj) => (
            <div
              key={block.id}
              style={{ margin: "10px 0", padding: 14, border: "1px solid #eee", borderRadius: 14, background: "#fff" }}
            >
              <div style={{ fontWeight: 950, marginBottom: 10 }}>{block.label ?? block.id}</div>
              {(block.items ?? []).map((item: AnyObj) => renderItem(item))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
