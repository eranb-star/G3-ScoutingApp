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
  let v = Number.isFinite(n) ? n : 0;
  if (typeof min === "number") v = Math.max(min, v);
  if (typeof max === "number") v = Math.min(max, v);
  return v;
}

function StepPills({
  options,
  value,
  onChange,
}: {
  options: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  const opts = (options ?? []).filter((x) => Number.isFinite(x) && x > 0);
  if (opts.length <= 1) return null;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
      <div style={{ fontWeight: 900, opacity: 0.85 }}>Step:</div>
      {opts.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #ccc",
            background: s === value ? "rgba(0,0,0,0.08)" : "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          +{s}
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
  min,
  max,
  stepOptions,
  defaultStep,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  isNarrow: boolean;
  min?: number;
  max?: number;
  stepOptions?: number[];
  defaultStep?: number;
}) {
  const options = Array.isArray(stepOptions) && stepOptions.length > 0 ? stepOptions : [1];
  const initialStep =
    typeof defaultStep === "number" && options.includes(defaultStep) ? defaultStep : options[0] ?? 1;

  const [step, setStep] = React.useState<number>(initialStep);

  React.useEffect(() => {
    // if schema changes while mounted, keep step valid
    if (!options.includes(step)) setStep(initialStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(options), defaultStep]);

  const dec = () => onChange(clamp(value - step, typeof min === "number" ? min : 0, max));
  const inc = () => onChange(clamp(value + step, typeof min === "number" ? min : 0, max));

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

        {/* Optional min/max hint */}
        {(typeof min === "number" || typeof max === "number") && (
          <div style={{ opacity: 0.75, fontWeight: 800 }}>
            {typeof min === "number" ? `min ${min}` : ""}
            {typeof min === "number" && typeof max === "number" ? " · " : ""}
            {typeof max === "number" ? `max ${max}` : ""}
          </div>
        )}
      </div>

      <StepPills options={options} value={step} onChange={setStep} />
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
  stepOptions,
  defaultStep,
}: {
  label: string;
  options: AnyObj[];
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  isNarrow: boolean;
  min?: number;
  max?: number;
  stepOptions?: number[];
  defaultStep?: number;
}) {
  const optionValues = (options ?? []).map((o: AnyObj) => String(o?.value ?? o));
  const [selected, setSelected] = React.useState<string>(optionValues[0] ?? "");

  const optsStep = Array.isArray(stepOptions) && stepOptions.length > 0 ? stepOptions : [1];
  const initStep = typeof defaultStep === "number" && optsStep.includes(defaultStep) ? defaultStep : optsStep[0] ?? 1;
  const [step, setStep] = React.useState<number>(initStep);

  React.useEffect(() => {
    if ((!selected || selected.length === 0) && optionValues.length > 0) {
      setSelected(optionValues[0]);
    }
  }, [optionValues, selected]);

  React.useEffect(() => {
    if (!optsStep.includes(step)) setStep(initStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(optsStep), defaultStep]);

  const currentCount = value?.[selected] ?? 0;

  const setCount = (newCount: number) => {
    const min0 = typeof min === "number" ? min : 0;
    const next = clamp(newCount, min0, max);
    onChange({
      ...(value ?? {}),
      [selected]: next,
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
          onClick={() => setCount(currentCount - step)}
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
          onClick={() => setCount(currentCount + step)}
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

      <StepPills options={optsStep} value={step} onChange={setStep} />
    </div>
  );
}

function isItemAdvanced(item: AnyObj): boolean {
  return !!(item?.ui?.advanced === true);
}

function isBlockAdvanced(block: AnyObj): boolean {
  // supports both: block.ui.advanced_block OR block.advanced_block (if you ever used it)
  return !!(block?.ui?.advanced_block === true || block?.advanced_block === true);
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

  // Global advanced toggle (persisted per-device)
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(() => {
    try {
      const v = localStorage.getItem("g3_show_advanced");
      return v === "1";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("g3_show_advanced", showAdvanced ? "1" : "0");
    } catch {
      // ignore
    }
  }, [showAdvanced]);

  const controlStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    borderRadius: 12,
    border: "1px solid #ccc",
  };

  const renderItem = (item: AnyObj) => {
    const itemId = item?.id;
    if (!itemId) return null;

    const label = item?.label ?? itemId;
    const type = item?.type ?? "counter";

    // Advanced item hiding
    if (isItemAdvanced(item) && !showAdvanced) return null;

    if (type === "counter") {
      const v = typeof values[itemId] === "number" ? values[itemId] : 0;
      const min = typeof item?.min === "number" ? item.min : 0;
      const max = typeof item?.max === "number" ? item.max : undefined;

      const stepOptions = Array.isArray(item?.step_options) ? item.step_options : undefined;
      const defaultStep = typeof item?.default_step === "number" ? item.default_step : undefined;

      const safeV = clamp(v, min, max);

      // if stored value is out of bounds, normalize silently
      if (safeV !== v) {
        // avoid loops: only set if needed
        setTimeout(() => setValue(itemId, safeV), 0);
      }

      return (
        <CounterRow
          key={itemId}
          label={label}
          value={safeV}
          onChange={(nv) => setValue(itemId, clamp(nv, min, max))}
          isNarrow={isNarrow}
          min={min}
          max={max}
          stepOptions={stepOptions}
          defaultStep={defaultStep}
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

      const min = typeof item?.min === "number" ? item.min : 0;
      const max = typeof item?.max === "number" ? item.max : undefined;
      const stepOptions = Array.isArray(item?.step_options) ? item.step_options : undefined;
      const defaultStep = typeof item?.default_step === "number" ? item.default_step : undefined;

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
          stepOptions={stepOptions}
          defaultStep={defaultStep}
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

  // Detect if there is any advanced content at all (so we only show the toggle when relevant)
  const hasAnyAdvanced = React.useMemo(() => {
    try {
      for (const phase of phases) {
        for (const block of phase?.blocks ?? []) {
          if (isBlockAdvanced(block)) return true;
          for (const item of block?.items ?? []) {
            if (isItemAdvanced(item)) return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [phases]);

  return (
    <div>
      {/* Global Advanced toggle (only if schema uses it) */}
      {hasAnyAdvanced ? (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            marginBottom: 10,
            padding: 10,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 1000 }}>Form view:</div>

          <button
            type="button"
            onClick={() => setShowAdvanced(false)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #ccc",
              background: !showAdvanced ? "rgba(0,0,0,0.08)" : "#fff",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Basic
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #ccc",
              background: showAdvanced ? "rgba(0,0,0,0.08)" : "#fff",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Advanced
          </button>

          <div style={{ marginLeft: "auto", opacity: 0.75, fontWeight: 900 }}>
            {showAdvanced ? "Showing advanced fields" : "Hiding advanced fields"}
          </div>
        </div>
      ) : null}

      {phases.map((phase: AnyObj) => (
        <div key={phase.id} style={{ marginTop: 18, paddingTop: 10, borderTop: "1px solid #eee" }}>
          <h2 style={{ margin: "6px 0" }}>{phase.label ?? phase.id}</h2>

          {(phase.blocks ?? []).map((block: AnyObj) => {
            const advancedBlock = isBlockAdvanced(block);

            // Hide whole advanced blocks in Basic mode
            if (advancedBlock && !showAdvanced) return null;

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
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 950 }}>{block.label ?? block.id}</div>
                  {advancedBlock ? (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(0,0,0,0.06)",
                        fontWeight: 900,
                        fontSize: 12,
                      }}
                    >
                      ADVANCED
                    </span>
                  ) : null}
                </div>

                {(block.items ?? []).map((item: AnyObj) => renderItem(item))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
