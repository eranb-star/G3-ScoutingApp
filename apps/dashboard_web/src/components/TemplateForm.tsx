import React from "react";

type AnyObj = any;

// Simple breakpoint hook (UI only)
function useIsNarrow(breakpointPx = 600) {
  const [isNarrow, setIsNarrow] = React.useState(() => window.innerWidth <= breakpointPx);

  React.useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= breakpointPx);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpointPx]);

  return isNarrow;
}

function clamp(n: number, min?: number, max?: number) {
  let v = n;
  if (typeof min === "number") v = Math.max(min, v);
  if (typeof max === "number") v = Math.min(max, v);
  return v;
}

function CounterRow({
  label,
  value,
  onChange,
  isNarrow,
  min,
  max,
  step,
  quickButtons,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  isNarrow: boolean;
  min?: number;
  max?: number;
  step?: number;
  quickButtons?: number[];
}) {
  const stepSafe = Number.isFinite(step as any) && Number(step) > 0 ? Number(step) : 1;

  const dec = () => onChange(clamp(value - stepSafe, min ?? 0, max));
  const inc = () => onChange(clamp(value + stepSafe, min ?? 0, max));

  const addQuick = (delta: number) => onChange(clamp(value + delta, min ?? 0, max));

  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{label}</div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={dec}
          style={{
            width: isNarrow ? 56 : 48,
            height: isNarrow ? 56 : 48,
            fontSize: 24,
            borderRadius: 12,
            border: "1px solid #ccc",
            flex: "0 0 auto",
          }}
        >
          -
        </button>

        <div
          style={{
            minWidth: 64,
            textAlign: "center",
            fontSize: 24,
            fontWeight: 900,
            flex: "0 0 auto",
          }}
        >
          {value}
        </div>

        <button
          type="button"
          onClick={inc}
          style={{
            width: isNarrow ? 56 : 48,
            height: isNarrow ? 56 : 48,
            fontSize: 24,
            borderRadius: 12,
            border: "1px solid #ccc",
            flex: "0 0 auto",
          }}
        >
          +
        </button>

        {/* min/max hint */}
        <div style={{ opacity: 0.75, fontWeight: 800, fontSize: 16 }}>
          min {typeof min === "number" ? min : 0} · max {typeof max === "number" ? max : "∞"}
        </div>

        {/* quick buttons (+1/+5/+10 וכו׳) */}
        {Array.isArray(quickButtons) && quickButtons.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: 6 }}>
            {quickButtons.map((qb, idx) => {
              const d = Number(qb);
              if (!Number.isFinite(d) || d === 0) return null;
              return (
                <button
                  key={`${d}_${idx}`}
                  type="button"
                  onClick={() => addQuick(d)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #ccc",
                    fontWeight: 900,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  +{d}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
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
  isNarrow,
  min,
  max,
  step,
  quickButtons,
}: {
  label: string;
  options: AnyObj[];
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  isNarrow: boolean;
  min?: number;
  max?: number;
  step?: number;
  quickButtons?: number[];
}) {
  const optionValues = (options ?? []).map((o: AnyObj) => String(o?.value ?? o));
  const [selected, setSelected] = React.useState<string>(optionValues[0] ?? "");

  React.useEffect(() => {
    if ((!selected || selected.length === 0) && optionValues.length > 0) {
      setSelected(optionValues[0]);
    }
  }, [optionValues, selected]);

  const currentCount = value?.[selected] ?? 0;
  const stepSafe = Number.isFinite(step as any) && Number(step) > 0 ? Number(step) : 1;

  const setCount = (newCount: number) => {
    onChange({
      ...(value ?? {}),
      [selected]: clamp(newCount, min ?? 0, max),
    });
  };

  const addQuick = (delta: number) => setCount(currentCount + delta);

  const controlStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    borderRadius: 12,
    border: "1px solid #ccc",
    fontSize: 16,
  };

  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ width: "100%", maxWidth: isNarrow ? "100%" : 320 }}>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={controlStyle}>
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
        </div>

        <button
          type="button"
          onClick={() => setCount(currentCount - stepSafe)}
          style={{
            width: isNarrow ? 56 : 48,
            height: isNarrow ? 56 : 48,
            fontSize: 24,
            borderRadius: 12,
            border: "1px solid #ccc",
          }}
        >
          -
        </button>

        <div style={{ minWidth: 64, textAlign: "center", fontSize: 24, fontWeight: 900 }}>{currentCount}</div>

        <button
          type="button"
          onClick={() => setCount(currentCount + stepSafe)}
          style={{
            width: isNarrow ? 56 : 48,
            height: isNarrow ? 56 : 48,
            fontSize: 24,
            borderRadius: 12,
            border: "1px solid #ccc",
          }}
        >
          +
        </button>

        <div style={{ opacity: 0.75, fontWeight: 800, fontSize: 16 }}>
          min {typeof min === "number" ? min : 0} · max {typeof max === "number" ? max : "∞"}
        </div>

        {Array.isArray(quickButtons) && quickButtons.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: 6 }}>
            {quickButtons.map((qb, idx) => {
              const d = Number(qb);
              if (!Number.isFinite(d) || d === 0) return null;
              return (
                <button
                  key={`${d}_${idx}`}
                  type="button"
                  onClick={() => addQuick(d)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #ccc",
                    fontWeight: 900,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  +{d}
                </button>
              );
            })}
          </div>
        ) : null}
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
  const isNarrow = useIsNarrow(600);

  const controlStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    borderRadius: 12,
    border: "1px solid #ccc",
  };

  // ✅ central helper to decide if an item should be hidden
  const shouldHideItem = (item: AnyObj) => {
    const label = String(item?.label ?? "").trim().toLowerCase();

    const isExplicitHidden =
      item?.hidden === true ||
      item?.ui?.hidden === true ||
      item?.meta?.hidden === true;

    const tags = Array.isArray(item?.tags) ? item.tags.map((t: any) => String(t).toLowerCase()) : [];
    const isTaggedHidden = tags.includes("hidden") || tags.includes("legacy");
    const isDeprecated = item?.deprecated === true;

    const isLegacyLabel =
      label.includes("hidden (legacy)") ||
      label.startsWith("hidden") ||
      label.includes("legacy");

    // If it’s explicitly hidden → hide no matter what
    if (isExplicitHidden) return true;

    // Extra safety: if someone forgot hidden:true but kept the label/tags
    if (isDeprecated || isTaggedHidden || isLegacyLabel) return true;

    return false;
  };

  const renderItem = (item: AnyObj) => {
    const itemId = item?.id;
    if (!itemId) return null;

    // ✅ hide support
    if (shouldHideItem(item)) return null;

    const label = item?.label ?? itemId;
    const type = item?.type ?? "counter";

    // Common numeric controls
    const min = typeof item?.min === "number" ? item.min : 0;
    const max = typeof item?.max === "number" ? item.max : undefined;
    const step = typeof item?.step === "number" ? item.step : 1;
    const quickButtons = Array.isArray(item?.quick_buttons) ? item.quick_buttons : undefined;

    if (type === "counter") {
      const v = typeof values[itemId] === "number" ? values[itemId] : 0;
      return (
        <CounterRow
          key={itemId}
          label={label}
          value={v}
          onChange={(nv) => setValue(itemId, nv)}
          isNarrow={isNarrow}
          min={min}
          max={max}
          step={step}
          quickButtons={quickButtons}
        />
      );
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
          <div style={{ width: "100%", maxWidth: isNarrow ? "100%" : 420 }}>
            <select value={v} onChange={(e) => setValue(itemId, e.target.value)} style={controlStyle}>
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
        </div>
      );
    }

    if (type === "picklist_counter") {
      const opts = Array.isArray(item?.options) ? item.options : [];
      const v = typeof values[itemId] === "object" && values[itemId] ? values[itemId] : {};
      return (
        <PicklistCounter
          key={itemId}
          label={label}
          options={opts}
          value={v}
          onChange={(nv) => setValue(itemId, nv)}
          isNarrow={isNarrow}
          min={min}
          max={max}
          step={step}
          quickButtons={quickButtons}
        />
      );
    }

    // default text
    const v = values[itemId] ?? "";
    return (
      <div key={itemId} style={{ margin: "12px 0" }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
        <div style={{ width: "100%", maxWidth: isNarrow ? "100%" : 520 }}>
          <input
            value={v}
            onChange={(e) => setValue(itemId, e.target.value)}
            placeholder={item?.placeholder ?? ""}
            style={controlStyle}
          />
        </div>
      </div>
    );
  };

  return (
    <div>
      {phases.map((phase: AnyObj) => (
        <div key={phase.id} style={{ marginTop: 18, paddingTop: 10, borderTop: "1px solid #eee" }}>
          <h2 style={{ margin: "6px 0" }}>{phase.label ?? phase.id}</h2>

          {(phase.blocks ?? []).map((block: AnyObj) => {
            const visibleItems = (block.items ?? []).filter((it: AnyObj) => !shouldHideItem(it));
            if (visibleItems.length === 0) return null;

            return (
              <div
                key={block.id}
                style={{
                  margin: "10px 0",
                  padding: isNarrow ? 12 : 14,
                  border: "1px solid #eee",
                  borderRadius: 14,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 950, marginBottom: 10 }}>{block.label ?? block.id}</div>
                {(block.items ?? []).map((item: AnyObj) => renderItem(item))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
