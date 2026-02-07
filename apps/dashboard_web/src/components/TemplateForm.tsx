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
  let x = n;
  if (typeof min === "number") x = Math.max(min, x);
  if (typeof max === "number") x = Math.min(max, x);
  return x;
}

function asNum(x: any, fallback = 0) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function QuickButtonsRow({
  quickButtons,
  onDelta,
  isNarrow,
}: {
  quickButtons: number[];
  onDelta: (delta: number) => void;
  isNarrow: boolean;
}) {
  if (!quickButtons || quickButtons.length === 0) return null;

  const unique = Array.from(new Set(quickButtons.map((x) => Math.abs(asNum(x, 0))).filter((x) => x > 0))).sort(
    (a, b) => a - b
  );
  if (unique.length === 0) return null;

  const btnStyle: React.CSSProperties = {
    padding: isNarrow ? "10px 14px" : "8px 12px",
    borderRadius: 999,
    border: "1px solid #ccc",
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {[...unique].reverse().map((q) => (
        <button key={`m${q}`} type="button" onClick={() => onDelta(-q)} style={btnStyle}>
          -{q}
        </button>
      ))}
      {unique.map((q) => (
        <button key={`p${q}`} type="button" onClick={() => onDelta(+q)} style={btnStyle}>
          +{q}
        </button>
      ))}
    </div>
  );
}

function CounterRow({
  label,
  value,
  onChange,
  isNarrow,
  min = 0,
  max,
  step = 1,
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
  const dec = () => onChange(clamp(value - step, min, max));
  const inc = () => onChange(clamp(value + step, min, max));
  const onDelta = (delta: number) => onChange(clamp(value + delta, min, max));

  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{label}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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

        <div style={{ opacity: 0.65, fontWeight: 800 }}>
          min {typeof min === "number" ? min : 0} · max {typeof max === "number" ? max : "∞"}
        </div>
      </div>

      <QuickButtonsRow quickButtons={quickButtons ?? []} onDelta={onDelta} isNarrow={isNarrow} />
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
}: {
  label: string;
  options: AnyObj[];
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  isNarrow: boolean;
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

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
          onClick={() => setCount(currentCount - 1)}
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
          onClick={() => setCount(currentCount + 1)}
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
      </div>
    </div>
  );
}

function normalizeLabel(s: string) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\(optional\)/gi, "")
    .trim()
    .toLowerCase();
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

  // ✅ IDs to hide (works even if label changes)
  const HIDE_ITEM_IDS = new Set<string>([
    // legacy Scout Name field (now irrelevant due to device-locked picklist)
    "scout_name",
    "scouter_name",
    "scoutName",
    "scouter",
    "name",

    // your requested removals (if template IDs happen to match)
    "starting_mechanism_config",
    "startingMechanismConfig",
    "mobility_setup",
    "mobilitySetup",
    "auto_attempted",
    "autoAttempted",
    "mobility_leave_start_zone",
    "mobilityLeaveStartZone",
    "auto_path_quality",
    "autoPathQuality",
  ]);

  // ✅ Labels to hide (case-insensitive, ignores "(optional)")
  const HIDE_LABELS = new Set<string>([
    normalizeLabel("Scout Name (optional)"),
    normalizeLabel("Starting Mechanism Config (optional)"),
    normalizeLabel("Mobility / Setup"),
    normalizeLabel("Auto Attempted"),
    normalizeLabel("Mobility / Leave Start Zone"),
    normalizeLabel("Auto Path Quality"),
  ]);

  const shouldHideItem = (item: AnyObj) => {
    if (!item) return true;

    // hide legacy/explicit hidden fields
    if (item?.hidden === true) return true;

    const itemId = String(item?.id ?? "").trim();
    if (itemId && HIDE_ITEM_IDS.has(itemId)) return true;

    const label = normalizeLabel(String(item?.label ?? ""));
    if (label && HIDE_LABELS.has(label)) return true;

    return false;
  };

  const renderItem = (item: AnyObj) => {
    const itemId = item?.id;
    if (!itemId) return null;

    if (shouldHideItem(item)) return null;

    const label = item?.label ?? itemId;
    const type = item?.type ?? "counter";

    if (type === "counter") {
      const v = typeof values[itemId] === "number" ? values[itemId] : 0;
      const min = typeof item?.min === "number" ? item.min : 0;
      const max = typeof item?.max === "number" ? item.max : undefined;
      const step = typeof item?.step === "number" ? item.step : 1;
      const quickButtons = Array.isArray(item?.quick_buttons) ? item.quick_buttons : [];

      return (
        <CounterRow
          key={itemId}
          label={label}
          value={clamp(v, min, max)}
          onChange={(nv) => setValue(itemId, clamp(nv, min, max))}
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
        />
      );
    }

    // default text
    const v = values[itemId] ?? "";
    return (
      <div key={itemId} style={{ margin: "12px 0" }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
        <div style={{ width: "100%", maxWidth: isNarrow ? "100%" : 520 }}>
          <input value={v} onChange={(e) => setValue(itemId, e.target.value)} placeholder={item?.placeholder ?? ""} style={controlStyle} />
        </div>
      </div>
    );
  };

  return (
    <div>
      {phases.map((phase: AnyObj) => {
        // ✅ filter blocks that have at least 1 visible item
        const blocks = (phase.blocks ?? []).filter((block: AnyObj) => {
          const items = (block.items ?? []).filter((it: AnyObj) => !shouldHideItem(it) && !!it?.id);
          return items.length > 0;
        });

        // ✅ if phase became empty, don't render it
        if (!blocks.length) return null;

        return (
          <div key={phase.id} style={{ marginTop: 18, paddingTop: 10, borderTop: "1px solid #eee" }}>
            <h2 style={{ margin: "6px 0" }}>{phase.label ?? phase.id}</h2>

            {blocks.map((block: AnyObj) => {
              const visibleItems = (block.items ?? []).filter((it: AnyObj) => !shouldHideItem(it) && !!it?.id);
              if (!visibleItems.length) return null; // extra safety

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
                  {visibleItems.map((item: AnyObj) => renderItem(item))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
