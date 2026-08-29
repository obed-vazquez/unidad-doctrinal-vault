# Guía de Contribución — Unidad Doctrinal Vault

¡Gracias por tu interés en contribuir al proyecto **Unidad Doctrinal**! Este repositorio (*Vault*) tiene como objetivo centralizar, migrar y organizar recursos teológicos y estudios doctrinales en formato Markdown.

---

## 🔄 Flujo de Trabajo para Contribuir

Si deseas migrar documentos desde el Google Drive oficial o aportar nuevas notas doctrinales, sigue los pasos descritos a continuación.

Si tu aporte toca `apologética/`, lee el aviso del paso 5: Drive es la fuente de verdad de esa carpeta y cada sincronización la reemplaza.

### 1. Crear un Fork del Repositorio
1. En GitHub, navega al repositorio oficial de `unidad-doctrinal-vault`.
2. En la esquina superior derecha, haz clic en el botón **Fork** para crear una copia del repositorio en tu cuenta personal de GitHub.

### 2. Clonar tu Fork Localmente
Abre tu terminal o consola Git y ejecuta:

```bash
git clone https://github.com/TU-USUARIO/unidad-doctrinal-vault.git
cd unidad-doctrinal-vault
```

### 3. Abrir la Carpeta en Obsidian
1. Abre **Obsidian**.
2. Selecciona **"Abrir carpeta como bóveda"** (*Open folder as vault*).
3. Selecciona la carpeta `unidad-doctrinal-vault` clonada en tu computadora.

### 4. Crear una Rama (*Branch*) de Trabajo
Antes de realizar cambios, crea una rama descriptiva para tus aportaciones:

```bash
git checkout -b migrar-documento-nombre
```

### 5. Edición y Migración de Documentos
- **Formato:** Asegurate de seguir las convenciones descritas en los documentos relativos a tu aporte.
- **Carpeta `apologética/`:** Google Drive es la fuente de verdad. El Action **Sincronizar Google Docs** **reemplaza** el contenido de `apologética/` en cada ejecución. No uses esa carpeta para notas que existan solo en el vault y deban sobrevivir a una sincronización; colócalas en otra ruta del repositorio.

### 6. Guardar y Confirmar Cambios (*Commit*)
Una vez que hayas redactado o revisado tus notas:

```bash
git add .
git commit -m "docs: migra documento de [Nombre del tema] a Markdown"
```

### 7. Subir Cambios a tu Fork (*Push*)

```bash
git push origin migrar-documento-nombre
```

### 8. Crear un Pull Request (PR)
1. Ve a tu repositorio forkeado en GitHub.
2. Verás un mensaje sugiriendo **"Compare & pull request"**.
3. Escribe un título descriptivo y una breve explicación de los documentos agregados o modificados.
4. Envía el Pull Request para revisión.

---

