const CACHE_VERSION = "gatochente-v7";
const APP_SHELL_FILES = [
	"./",
	"./index.html",
	"./sobre-mi.html",
	"./proyectos.html",
	"./contacto.html",
	"./sobre-mi/",
	"./proyectos/",
	"./contacto/",
	"./sobre-mi/index.html",
	"./proyectos/index.html",
	"./contacto/index.html",
	"./style.css",
	"./script.js",
	"./manifest.json",
	"./favicon.png",
	"./logo.png",
	"./img/header.jpg",
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