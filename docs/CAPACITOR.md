# 📱 Build móvil nativo con Capacitor

La PWA sigue siendo la forma más rápida de tener la app en el móvil (un click
y "Añadir a pantalla de inicio"). Si además quieres **APK firmable para
distribuir / Play Store** o **IPA para App Store / TestFlight**, esta guía
explica cómo con [Capacitor](https://capacitorjs.com/).

Capacitor envuelve el export estático de Next.js en un **WebView nativo**,
así que la app sigue funcionando exactamente igual — solo cambia el envoltorio.

---

## 1. Requisitos previos

### Android (APK / AAB)
- **Android Studio** (última versión estable): <https://developer.android.com/studio>
- **JDK 21** (lo trae Android Studio o usa Temurin/Adoptium)
- **Android SDK** 24+ (target 36), se instala desde Android Studio → SDK Manager

### iOS (IPA)
- **macOS** (obligatorio para build de iOS — Apple no lo permite desde otros SOs)
- **Xcode 15+**
- **CocoaPods** (`sudo gem install cocoapods`)
- **Cuenta Apple Developer** (99€/año) para firmar y subir a App Store / TestFlight

---

## 2. Generar el bundle web (sin basePath)

El export para Capacitor **no debe** llevar `NEXT_PUBLIC_BASE_PATH`
(en GitHub Pages sí lo usamos porque la app vive en `/fooday-productivity/`,
pero en el WebView nativo se sirve desde local).

El script `scripts/cap-build.js` se encarga de todo:

```bash
# Android
npm run cap:build:android

# iOS (solo macOS)
npm run cap:build:ios
```

Esto hace, en orden:
1. `next build` con `NEXT_PUBLIC_BASE_PATH=""` → genera `./out`
2. `npx cap sync <platform>` → copia `./out` a `android/app/src/main/assets/public`
   (o `ios/App/App/public`) y actualiza plugins

Si prefieres abrir el IDE tras la build:

```bash
node scripts/cap-build.js android --open
```

---

## 3. Compilar APK (Android)

### Opción A — Android Studio (recomendado para empezar)
1. `npm run cap:build:android -- --open`  → abre Android Studio
2. Espera a que Gradle sincronice (primera vez tarda ~5 min)
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`
5. Instala en tu móvil: copia el APK y ábrelo, o usa `adb install`

### Opción B — Línea de comandos (CI / automatizado)
```bash
cd android
./gradlew assembleDebug          # APK debug (sin firmar)
./gradlew assembleRelease        # APK release (necesita keystore)
./gradlew bundleRelease          # AAB para Play Store
```

### Firmar APK para distribución

1. Genera keystore (una sola vez, **guárdalo bien**):
   ```bash
   keytool -genkey -v -keystore fooday-release.keystore \
     -alias fooday -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Crea `android/key.properties` (NO commitear):
   ```
   storeFile=../fooday-release.keystore
   storePassword=TU_PASSWORD
   keyAlias=fooday
   keyPassword=TU_PASSWORD
   ```
3. Edita `android/app/build.gradle` para usar `key.properties`
   (Capacitor ya deja preparado el hook `signingConfigs.release` —
   descomenta el bloque de release y enlaza con `key.properties`).
4. `./gradlew assembleRelease` → `app/build/outputs/apk/release/app-release.apk`

### Subir a Google Play Store
1. Crea cuenta de desarrollador: <https://play.google.com/console> (25 USD una vez)
2. **Crear app** →填写 ficha
3. **Versión de producción** → subir AAB (`./gradlew bundleRelease`)
4. Rellenar clasificación, contenido, etc.
5. Enviar a revisión (tarda 1-3 días la primera vez)

---

## 4. Compilar IPA (iOS, solo macOS)

```bash
npm run cap:build:ios -- --open   # abre Xcode
```

En Xcode:
1. Selecciona el equipo de firma: **Signing & Capabilities → Team**
2. Bundle identifier: `com.fooday.productivity` (ya configurado)
3. **Product → Archive**
4. Una vez archivado: **Distribute App** → elige **App Store Connect** (subir a
   TestFlight / App Store) o **Ad Hoc** (instalar en dispositivos sin tienda)

Para testing rápido en tu iPhone sin pagar cuenta de developer:
- En Xcode: **Window → Devices and Simulators**
- Selecciona tu iPhone → **+** → elige el .app compilado

---

## 5. Personalizar icono y splash (opcional)

Por defecto Capacitor pone un icono genérico. Para reemplazarlo:

### Icono de app
- Genera `icon-1024.png` con tu logo
- Usa [capacitor-assets](https://github.com/ionic-team/capacitor-assets):
  ```bash
  npx @capacitor/assets generate --android --ios
  ```
  (coloca `icon.png` y `splash.png` en `resources/` en la raíz del proyecto)

### Tema / colores
Ya personalizado al tema dark `#0a0a0a` en:
- `android/app/src/main/res/values/colors.xml`
- `android/app/src/main/res/values/styles.xml`

Para iOS, edita `ios/App/App/Assets.xcassets/AppIcon.appiconset/` y
`ios/App/App/Info.plist` (status bar, etc.).

---

## 6. Supabase Auth en nativo

Los **magic links / reset password** de Supabase redirigen por defecto a tu
URL web. Para que abran la app nativa:

1. **Supabase Dashboard → Authentication → URL Configuration:**
   - Site URL: tu URL de GitHub Pages (por si usas la web)
   - **Redirect URLs** añade también: `com.fooday.productivity://callback`

2. La app ya viene con `custom_url_scheme=com.fooday.productivity` configurado.
   Capacitor interceptará ese esquema y lo abrirá en el WebView.

3. Si quieres universal links (https en lugar de esquema custom), edita
   `capacitor.config.ts` → `server.iosScheme` / `server.androidScheme` y configura
   los `apple-app-site-association` / `assetlinks.json` en tu dominio.

---

## 7. Workflow día a día

```bash
# 1. Modificas código en src/
# 2. Reconstruyes y sincronizas
npm run cap:build:android          # build + sync + (opcional) abre Android Studio

# Si solo quieres resincronizar sin rebuild (ej. cambiaste plugins)
npm run cap:sync

# Si solo quieres iterar rápido en web (sin Capacitor)
npm run dev
```

Cada vez que cambias código en `src/` tienes que ejecutar
`npm run cap:build:android` (o iOS) para que `./out` se regenere y se copie
a `android/app/src/main/assets/public`.

---

## 8. Troubleshooting

| Problema | Solución |
|:---|:---|
| `SDK location not found` | Crea `android/local.properties` con `sdk.dir=/ruta/al/Android/Sdk` |
| `Could not find tools.jar` | Instala JDK 21 y configura `JAVA_HOME` |
| App abre pero se queda en blanco | Revisa la consola Chrome (`chrome://inspect`) — suele ser basePath mal puesto |
| `npx cap sync` falla | Borra `node_modules/.cache` y `android/app/build`, vuelve a intentar |
| iOS: "No signing identity found" | Xcode → Preferences → Accounts → añadir Apple ID + descargar certificados |

---

## 9. Estructura del repo (lo que añade Capacitor)

```
android/                 # proyecto Android Studio (Gradle)
ios/                     # proyecto Xcode
capacitor.config.ts      # config Capacitor (appId, webDir, scheme, …)
scripts/cap-build.js     # script multiplataforma para build + sync
```

Todos ignorados en `.gitignore` salvo `capacitor.config.ts` y `scripts/`.
Los proyectos nativos (`android/`, `ios/`) **se commitean** — son parte del
código fuente, pero sus artefactos de build (`build/`, `Pods/`, `.gradle/`)
están ignorados.
