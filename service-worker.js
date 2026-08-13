const CACHE_VERSION = "gatochente-v130";
const APP_SHELL_FILES = [
	"./",
	"./index.html",
	"./sobre-mi.html",
	"./proyectos.html",
	"./contacto.html",
	"./sobre-mi/",
	"./proyectos/",
	"./contacto/",
	"./catpack/",
	"./sobre-mi/index.html",
	"./proyectos/index.html",
	"./contacto/index.html",
	"./catpack/index.html",
	"./style.css",
	"./glyphs/crcglyph.ttf",
	"./script.js",
	"./manifest.json",
	"./favicon.png",
	"./logo.png",
	"./img/check.PNG",
	"./img/catpack-logo.png",
	"./img/catsocial.PNG",
	"./img/footer.png",
	"./img/gatochente.jpg",
	"./img/preview.jpg",
	"./img/proyecto1.jpg",
	"./img/proyecto2.jpg",
	"./img/proyecto3.jpg"
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_VERSION).then((cache) =>
			Promise.allSettled(APP_SHELL_FILES.map((file) => cache.add(file)))
		)
	);
	self.skipWaiting();
});

self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) =>
				Promise.all(
					cacheNames
						.filter((cacheName) => cacheName !== CACHE_VERSION)
						.map((cacheName) => caches.delete(cacheName))
				)
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;

	const requestUrl = new URL(event.request.url);
	if (requestUrl.origin !== self.location.origin) return;

	if (/\.exe$/i.test(requestUrl.pathname)) {
		const installerName = requestUrl.pathname.split("/").pop();

		event.respondWith(
			fetch(event.request, { cache: "no-store" })
				.then((networkResponse) => {
					const contentType = networkResponse.headers.get("content-type") || "";

					if (!networkResponse.ok || contentType.includes("text/html")) {
						return new Response("El instalador no está disponible.", {
							status: 502,
							headers: { "Content-Type": "text/plain; charset=utf-8" }
						});
					}

					const headers = new Headers(networkResponse.headers);
					headers.set("Content-Type", "application/octet-stream");
					headers.set("Content-Disposition", `attachment; filename="${installerName}"`);

					return new Response(networkResponse.body, {
						status: networkResponse.status,
						statusText: networkResponse.statusText,
						headers
					});
				})
				.catch(() => new Response("", { status: 503, statusText: "Service Unavailable" }))
		);

		return;
	}

	event.respondWith(
		fetch(event.request)
			.then((networkResponse) => {
				const responseClone = networkResponse.clone();
				caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, responseClone));
				return networkResponse;
			})
			.catch(() =>
				caches.match(event.request).then((cached) => {
					if (cached) return cached;
					if (event.request.mode === "navigate") {
						return caches.match("./index.html");
					}
					return new Response("", { status: 504, statusText: "Gateway Timeout" });
				})
			)
	);
});



