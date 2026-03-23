JSON.stringify({
  bounds: ['.site-workspace-rail--filters','.site-workspace-map-column','.site-workspace-inspector'].map((sel) => {
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
  }),
  filters: {
    province: document.querySelector('select[aria-label="省份"]')?.value ?? null,
    category: document.querySelector('select[aria-label="类别"]')?.value ?? null,
    status: document.querySelector('select[aria-label="状态"]')?.value ?? null,
  }
}, null, 2);