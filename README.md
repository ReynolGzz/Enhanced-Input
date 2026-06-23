# Enhanced Input

Remapeador de mando para **Windows**, con interfaz estilo Steam Input.
Lee la señal de tu mando físico, la **transforma** (zonas muertas, sensibilidad,
curvas, reasignación de botones, turbo…) y la entrega a un **mando virtual Xbox
360** que el juego lee como si fuera un mando normal.

> Stack: **Tauri 2 + Rust** (backend de entrada/salida) y **React + TypeScript**
> (interfaz).

---

## ⚠️ Lo primero que debes entender (emulación y anticheat)

Hay un mito muy extendido: *"Steam Input no emula, solo transforma la señal"*.
**No es cierto.** Steam Input (y reWASD, y DS4Windows) hacen exactamente esto:

1. Leen tu mando físico.
2. Lo **ocultan** del juego.
3. Crean un **mando virtual** con la señal ya transformada.
4. El juego lee el mando virtual.

Es decir, **sí emulan**. La razón por la que "no los flaggea el anticheat" es que
Valve está en lista blanca de los anticheats — no porque hagan magia.

Para remapear mando→mando (cambiar zonas muertas, sensibilidad, botón→botón) y
que **el juego** lo lea, solo existen dos caminos reales:

| Camino | Riesgo anticheat | ¿Lo usamos? |
| --- | --- | --- |
| **Mando virtual** (ViGEmBus) | Bajo — es el estándar | ✅ **Sí** |
| **Driver de kernel** (señal real *in-place*) | Alto — es justo lo que cazan | ❌ No |

Enhanced Input usa **mando virtual** (ViGEmBus), que es el camino de **menor
riesgo** y el mismo que usan las herramientas que ya conoces.

**Sinceridad total:** ninguna herramienta puede prometer "cero baneos en todo
juego". Esto es perfectamente seguro para juegos sin anticheat agresivo (como
**Rocket League**) y arriesgado en juegos con anticheat a nivel kernel
(Valorant/Vanguard, FACEIT…). Úsalo con cabeza.

---

## 📦 Estado del proyecto (v1 — base funcional)

Esta es una **base sólida y funcional**, no un producto terminado. Se desarrolló
en Linux, así que la lógica pura (modelo de perfiles + matemáticas de
transformación) está **validada con tests**, pero las partes específicas de
Windows (ViGEm/HID) **necesitan que las compiles y pruebes tú en Windows**.

**Implementado y cableado:**

- ✅ Lectura de **DualShock 4 por USB** (HID).
- ✅ Salida a **mando virtual Xbox 360** (ViGEmBus).
- ✅ **Zonas muertas**: tipo (círculo, círculo reescalado, cuadrado, cruz),
  interior y exterior.
- ✅ **Sensibilidad** y **curvas de respuesta**.
- ✅ **Anti zona muerta** (anillo exterior).
- ✅ **Reasignar botones** a otro botón del mando **o a una tecla** del teclado.
- ✅ **Turbo** (mantener para repetir) con velocidad configurable.
- ✅ **Gatillos**: umbral, recorrido analógico, curva y reasignación digital.
- ✅ **Perfiles** guardados en disco + selección de perfil activo.
- ✅ **Preview en vivo** del stick (entrada vs salida).

**Roadmap (siguiente):**

- ⏳ Soporte de **DualSense** y mandos Xbox (XInput) como fuentes.
- ⏳ **Ocultar el mando físico** automáticamente (HidHide) para evitar doble input.
- ⏳ Capturar teclas "al vuelo" en la UI (en vez de elegir de una lista).
- ⏳ Action sets / capas, macros, salida de ratón.
- ⏳ Curvas personalizadas con editor visual.

---

## 🧩 Cómo funciona (arquitectura)

```
DualShock 4 (USB)                                   Mando virtual Xbox 360
   │  HID report                                          ▲  XInput frame
   ▼                                                      │
input.rs ──► transform.rs ──► engine.rs ──► output.rs ────┘
 (parseo)     (deadzone/       (bucle a    (ViGEmBus)
              sens/curva)       ~250 Hz)        │
                                  │             └──► keyboard.rs (SendInput, teclas)
                                  ▼
                            profile.rs (perfil activo, en vivo)
```

El bucle del motor corre en un hilo aparte: lee el estado físico, aplica el
perfil activo, y empuja cada frame al mando virtual (y/o teclas). Cambiar el
perfil en la UI se aplica **en caliente**.

---

## 🛠️ Requisitos (en tu PC con Windows)

- **Windows 10 / 11** (64-bit).
- **[Rust](https://rustup.rs/)** (stable).
- **[Node.js](https://nodejs.org/)** 18+.
- **[ViGEmBus](https://github.com/nefarius/ViGEmBus/releases)** — el driver del
  mando virtual. **Imprescindible.** Instálalo antes de ejecutar.
- **WebView2** — viene preinstalado en Windows 10/11 modernos.
- *(Opcional, recomendado)* **[HidHide](https://github.com/nefarius/HidHide/releases)**
  para ocultar el DS4 físico y evitar que el juego vea dos mandos. *(La
  integración automática está en el roadmap; por ahora puedes ocultarlo
  manualmente con la app de HidHide.)*

---

## 🚀 Compilar y ejecutar

```bash
# 1. Instala dependencias del frontend
npm install

# 2. Modo desarrollo (recarga en caliente)
npm run app:dev      # = tauri dev

# 3. Build de producción (genera el .exe + instalador)
npm run app:build    # = tauri build
```

El ejecutable y el instalador quedan en
`src-tauri/target/release/` y `src-tauri/target/release/bundle/`.

> Si `tauri` no está disponible como comando, usa `npx tauri dev`.

### Uso

1. Conecta el DualShock 4 **por cable USB**.
2. Abre Enhanced Input → verás el nombre del mando y el selector de perfil.
3. Pulsa **Editar** para ajustar zonas muertas, sensibilidad, botones, turbo…
4. Pulsa **Iniciar** para empezar a transformar la señal.
5. *(Recomendado)* oculta el DS4 físico con HidHide para que el juego solo vea
   el mando virtual.

---

## 📁 Estructura

```
enhanced-input/
├── src/                      # Frontend (React + TS)
│   ├── App.tsx               # Orquestador (pantallas, perfiles, motor)
│   ├── components/
│   │   ├── Home.tsx          # Pantalla inicial (mando + perfil)
│   │   ├── ui.tsx            # Slider, Toggle, Select
│   │   └── editor/           # Editor estilo Steam Input
│   └── lib/                  # Tipos, API (invoke), metadatos de inputs
└── src-tauri/                # Backend (Rust)
    └── src/
        ├── input.rs          # Lectura + parseo DS4 (HID)
        ├── transform.rs      # Zonas muertas, sensibilidad, curvas (con tests)
        ├── output.rs         # Mando virtual Xbox 360 (ViGEm) + helpers
        ├── keyboard.rs       # Inyección de teclas (SendInput, scancodes)
        ├── engine.rs         # Bucle de tiempo real
        ├── profile.rs        # Modelo de perfil
        ├── storage.rs        # Guardado/carga de perfiles
        └── commands.rs       # Comandos expuestos a la UI
```

Los perfiles se guardan en `%APPDATA%/EnhancedInput/profiles/`.

---

## 🧪 Tests

La lógica pura se puede testear en cualquier sistema:

```bash
cd src-tauri && cargo test
```

(Las dependencias de Windows solo se compilan en Windows; en otros sistemas se
compila la lógica pura.)
