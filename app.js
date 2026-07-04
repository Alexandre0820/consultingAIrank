// Root-level loader for deployments that rewrite "/" to "/static/index.html".
// It forwards to the real app entry under /static so relative asset resolution
// still works on Netlify and similar static hosts.
(function loadStaticApp() {
  const script = document.createElement("script");
  script.src = "/static/app.js";
  script.defer = false;
  document.head.appendChild(script);
})();
