# Unidad Doctrinal — Vault

Bienvenido a la bóveda de conocimiento (**Vault**) del proyecto **Unidad Doctrinal**.

Este repositorio está diseñado para centralizar, organizar y expandir la documentación del proyecto Unidad Doctrinal en un formato abierto, perdurable e interconectado mediante archivos **Markdown** (optimizado para herramientas como [Obsidian](https://obsidian.md/)).

---

## 🌐 Enlaces Oficiales y Fuentes

- 📖 **Sitio Web Publicado:** [https://unidad.whiteweb.mx/](https://unidad.whiteweb.mx/)
- 🐙 **GitHub Pages (Proyecto Original):** [https://obed-vazquez.github.io/unidad-doctrinal/](https://obed-vazquez.github.io/unidad-doctrinal/)
- 📄 **Documento Principal de Google Docs (Fuente Oficial):** [Documento en Google Docs](https://docs.google.com/document/d/11AA-q7WJT9KE5S4CMfm4IpKPPTbegSrFdW3qx-4Z5E4/edit?usp=drive_web&ouid=111370028134665902682) *(Acceso público para lectura y comentarios)*
- 📁 **Carpeta de Recursos en Google Drive:** [Carpeta en Google Drive](https://drive.google.com/drive/folders/0B-9PnaxsQwDUOVE0ZDJQQk80SGs?resourcekey=0-nc0kG3WmircBx3CI-TW9Tg)

---

## 🚀 Publicación del sitio web

El sitio se publica automáticamente con GitHub Actions al hacer merge a
`main`. El workflow construye un artefacto con esta estructura:

- `index.html` — página de inicio del sitio (en la raíz del repositorio)
- `recursos/diagramas/arbol-web/` — visor interactivo del árbol de posturas
- `recursos/definiciones/` — notas Markdown referenciadas por el visor

URL publicada: [Unidad Doctrinal Vault](https://doctrinal.whiteweb.mx/)

El workflow de publicación de GitHub Pages **no se ejecuta en ramas de PR**; solo al integrar cambios en `main` (o manualmente desde la pestaña **Actions**). La fuente de GitHub Pages debe estar en **Settings → Pages → Build and deployment → Source → GitHub Actions**.

## 📌 Visión y Propósito

**Unidad Doctrinal** (*Doctrinal Unity*) es una iniciativa liderada por un grupo de personas dedicadas a la investigación rigurosa, el estudio sistemático y la búsqueda constante de la verdad revelada por Dios.

El propósito primordial de esta **bóveda (Vault)** es:

1. **Migrar y Unificar:** Trasladar gradualmente todos los recursos y documentos oficiales desarrollados originalmente en plataformas como Google Docs y sitios web a una estructura de notas en Markdown limpia, estructurada y versionada en Git.
2. **Expandir y Profundizar:** Agregar nuevos estudios, investigaciones, diagramas y recursos doctrinales para enriquecer el cuerpo documental existente.
3. **Fomentar la Interconexión:** Utilizar el potencial de los enlaces bidireccionales y grafos de conocimiento (*knowledge graphs*) para relacionar doctrinas, textos bíblicos, antecedentes históricos y temas teológicos de manera fluida y coherente.

---

## 🎯 Objetivos del Repositorio

- **Preservación y Accesibilidad:** Garantizar que los estudios y documentos de investigación se mantengan en un formato de texto plano (Markdown), independiente de plataformas propietarias.
- **Unificación del Conocimiento:** Construir una base documental sistemática que sirva como referencia clara para la enseñanza, el estudio individual y el debate teológico fraterno.
- **Estructura Bilingüe Definida:** Aunque la totalidad del vault y su idioma de trabajo principal están definidos en **español**, se incluyen recursos, textos o referencias teológicas en **inglés** claramente categorizados e identificados.
- **Evolución del Proyecto:** Servir como el cimiento que eventualmente consolidará la versión oficial de todo el repositorio documental de Unidad Doctrinal.

---

## 🗂️ Estructura del Vault y Convenciones

La estructura del Vault se rige por la taxonomía y organización establecidas en el **sitio web publicado**: [https://unidad.whiteweb.mx/](https://unidad.whiteweb.mx/).

Los distintos documentos de convenciones, normas editoriales y directrices doctrinales que ya han sido definidos se irán pasando e integrando gradualmente a este repositorio en formato Markdown.

---

## 📝 Convenciones de Trabajo

Para mantener la cohesión en la documentación dentro del Vault, se consideran las siguientes pautas generales:

- **Formato:** Todo el contenido debe estar redactado en Markdown estándar (`.md`).
- **Idiomas:** 
  - Las descripciones, metadatos e índices principales están en **español**.
  - Los recursos o textos específicos en inglés deben incluir un encabezado claro indicando su idioma original y, de ser posible, una síntesis en español.
- **Enlaces Internos (Wikilinks):** Haz uso de enlaces entre notas (`[[Nombre de la Nota]]` o `[Texto](archivo.md)`) para conectar conceptos teológicos, pasajes y fuentes.
- Más detalles sobre las convenciones de trabajo pueden encontrarse en la Carpeta oficial de Google Drive y serán migradas a este repositorio paulatinamente.

---

## 🤝 Cómo Contribuir

Para ver los detalles paso a paso sobre cómo hacer un *fork*, clonar la bóveda en Obsidian, realizar cambios y enviar un *Pull Request*, consulta nuestra guía dedicada:

👉 **[[COMO_CONTRIBUIR]] / [Guía de Contribución](COMO_CONTRIBUIR.md)**

---

## 🔄 Sincronizar Drive (local)

Para actualizar `apologética/` desde Google Drive (Drive es la fuente de verdad). El script **reemplaza** esa carpeta en cada ejecución; el aviso de sobrescritura está en [COMO_CONTRIBUIR.md](COMO_CONTRIBUIR.md).

Obtén el JSON de **cuenta de servicio** (no un cliente OAuth):

1. [Google Cloud Console](https://console.cloud.google.com/) → selecciona el proyecto (p. ej. `striped-option-507020-r4`).
2. **APIs & Services** → **Library** → habilita **Google Drive API** (el script exporta con Drive `files.export`; no hace falta Docs API).
3. **IAM & Admin** → **Service accounts** → **Create service account** (si aún no hay una) → **Done**. No hace falta asignar roles de GCP: basta compartir la carpeta de Drive.
4. Abre el **email** de la cuenta → pestaña **Keys** → **Add key** → **Create new key** → **JSON**.
5. **No uses** **Google Auth Platform** → **Clients** → **Create client** (`client_secret_…apps.googleusercontent.com.json`). El archivo correcto contiene `"type": "service_account"`.
6. Comparte la carpeta de Drive (y archivos si hace falta) con el `client_email` del JSON, permiso **Viewer**.

Si al crear la clave aparece *Service account key creation is disabled*, la org-policy lo bloquea: no uses **Create client** como alternativa.

Desde la raíz del repositorio, apunta `GOOGLE_APPLICATION_CREDENTIALS` a ese JSON, instala dependencias y ejecuta el script. Configura la variable de entorno para que apunte a tu JSON En PowerShell: `$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\sa.json"`. En cmd: `set GOOGLE_APPLICATION_CREDENTIALS=C:\ruta\sa.json`.

```
pip install -r scripts/requirements-sync-drive.txt
python scripts/sync_drive_markdown.py
```

---

## 📄 Licencia y Contacto

Este proyecto tiene fines educativos, teológicos y de difusión abierta de la Verdad Revelada. Para más información, comentarios o colaboración directa, visita [https://unidad.whiteweb.mx/](https://unidad.whiteweb.mx/).
