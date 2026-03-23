JSON.stringify(Array.from(document.querySelectorAll('select')).map((el, index) => ({
  index,
  value: el.value,
  ariaLabel: el.getAttribute('aria-label'),
  name: el.getAttribute('name'),
  options: Array.from(el.options).slice(0, 5).map((opt) => ({ text: opt.text, value: opt.value })),
})), null, 2);