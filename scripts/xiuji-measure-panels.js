JSON.stringify(['.site-workspace-rail--filters','.site-workspace-map-column','.site-workspace-inspector'].map((sel) => {
  const el = document.querySelector(sel);
  if (!el) {
    return { sel, missing: true };
  }

  const rect = el.getBoundingClientRect();
  return {
    sel,
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    height: Math.round(rect.height),
  };
}), null, 2);