/* compose: the ten checks pass one by one when the list comes into view, like the skill running them (Sasha 11-23).
   Every word stays visible; only the number turns into a tick. Reduced motion: all ticked at once. */
(function () {
  var list = document.querySelector('.ck-legend'); if (!list) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll('li'));
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function run() { rows.forEach(function (li, i) { if (still) li.classList.add('is-pass'); else setTimeout(function () { li.classList.add('is-pass'); }, 250 + i * 110); }); }
  if (!('IntersectionObserver' in window)) { run(); return; }
  var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); run(); } }, { threshold: 0.35 });
  io.observe(list);
})();
