# GATOCHENTE

```txt
              @$@$$$                              @@@@$@
             $$$$$$$$@@                        @$$$$$$$@@
             $@$$$$$$$$$@B @$@@@$@$@$$@@$$B $@@@@$$$$$$@@
             $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@$$$
             $$$$$$$$$$$$$$$$$@$$$$$$$$$$$$$$$$$$$$$$$$$@
              $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@
              @$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@
              $@$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@
             @@$$$$$$$@$   $$$$$$$$$$$$$$@@   $$$$$$$$$$$
            $@$$$$$$$$       $$$$$$$$$$$$       $$$$$$$$$$
            @$$$$$$$$@       $$$$$$$$$$$$       $$$$$$$$$$
            @$$$$$$$$$@    $@$$$$$$$$$$$$@@    @$$$$$$$$$$
            @@$$$$$$$$$$$$$$$@$@      @$$$$$$$$$$$$$$$$$$$
            $$@$$$$$$$$$$$$$$$$@      $$$$$$$$$$$$$$$$$$$$
             @@$$$$$$$$$$$$$$$$$@$  @$$$$$$$$$$$$$$$$$$@$
              @$$$$$$$$$$$$$$$$@$@  $$@$$$$$$$$$$$$$$$$@
               $@$$$$$$$$$$$@$    @@    @$$$$$$$$$$$$$$
                 @@$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@
                   $@$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
                     d@$$$$$$$$$$$$$$$$$$$$$$$$@$
                         @@@$$$$$$$$$$$$$$$$$
```

Portafolio personal de **GATOCHENTE**, enfocado en desarrollo web, tecnologia, electronica, Arduino, Raspberry Pi, diseno visual y proyectos creativos.

La web combina una identidad visual propia con una experiencia interactiva: header ASCII animado, tema claro/oscuro, buscador, mini juego FishingCat, secciones de proyectos, contacto y una pagina dedicada a CatPack.

## Caracteristicas

- Header con arte ASCII animado y logo en negativo.
- Navbar con boton principal multifuncion, busqueda, configuracion de tema y demo de FishingCat.
- Tema claro/oscuro persistente.
- Buscador interno con resultados, historial y limpieza rapida.
- Mini juego **FishingCat** integrado en la pagina y en el panel del navbar.
- Seccion de proyectos con tarjetas, detalles y modales.
- Pagina de contacto con formulario y enlaces sociales.
- Modal de donaciones con boton a PayPal web.
- Pagina de **CatPack**, archivador `.gcat` para Windows.
- Service worker y manifest para comportamiento tipo PWA.

## Estructura

```txt
.
|-- index.html
|-- proyectos.html
|-- sobre-mi.html
|-- contacto.html
|-- catpack/
|   `-- index.html
|-- img/
|-- glyphs/
|-- logo.png
|-- logo ASCII.txt
|-- favicon.png
|-- manifest.json
|-- service-worker.js
|-- script.js
`-- style.css
```

## Uso Local

Este proyecto esta construido con HTML, CSS y JavaScript puro. Para revisarlo localmente, abre `index.html` en el navegador o usa un servidor estatico.

```bash
python -m http.server 8000
```

Luego visita:

```txt
http://localhost:8000
```

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Service Worker
- Web App Manifest
- SVG e imagenes locales
- Fuentes e iconos externos puntuales

## Paginas Principales

- **Inicio:** presentacion principal, arte ASCII, habilidades, CatSocial, FishingCat y proyectos destacados.
- **Proyectos:** archivo de proyectos escolares, electronicos y web.
- **Sobre mi:** perfil, intereses y habilidades.
- **Contacto:** formulario y redes.
- **CatPack:** pagina de producto para el archivador `.gcat`.

## Identidad

El logo ASCII vive en [`logo ASCII.txt`](./logo%20ASCII.txt) y forma parte de la identidad visual del portafolio. Tambien se usa una version grafica en `logo.png` para navegacion, loader, modales y elementos visuales.

## Donaciones

El boton de donaciones abre PayPal web con el enlace oficial configurado en el proyecto:

```txt
https://www.paypal.com/ncp/payment/DHUX2QKEDJARN
```

## Notas

El sitio esta pensado como portafolio personal y laboratorio creativo. Algunas funciones, como el formulario de contacto o servicios externos, pueden depender de conexion a internet y configuraciones de terceros.

## Creditos

Proyecto creado y mantenido por **GATOCHENTE**.

## Licencia y Uso

Puedes visitar, revisar y aprender desde este proyecto. El contenido visual, textos, logos, marca GATOCHENTE y proyectos mostrados pertenecen a GATOCHENTE salvo que se indique lo contrario.
