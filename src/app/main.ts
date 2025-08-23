import { bootstrapApplication } from "@angular/platform-browser"
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules
} from "@angular/router"
import {
  IonicRouteStrategy,
  provideIonicAngular
} from "@ionic/angular/standalone"

import { routes } from "../app/app.routes"
import { AppComponent } from "../app/app.component"
import { defineCustomElements } from "@capacitor-community/sqlite/loader"

// ✅ Registrar jeep-sqlite en la web (solo navegador)
if (typeof window !== "undefined" && "customElements" in window) {
  defineCustomElements(window)
    .then(() => console.log("✅ jeep-sqlite definido como custom element"))
    .catch((err) =>
      console.warn("⚠️ No se pudo definir jeep-sqlite:", err)
    )
}

// ✅ Esperar que IndexedDB (mock o real) esté listo
function waitForDatabase(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).databaseReady === true) {
      console.log("✅ IndexedDB ya estaba listo")
      resolve(true)
      return
    }

    const checkInterval = setInterval(() => {
      if ((window as any).databaseReady === true) {
        clearInterval(checkInterval)
        console.log("✅ IndexedDB listo")
        resolve(true)
      }
    }, 50)

    setTimeout(() => {
      clearInterval(checkInterval)
      console.log("✅ Timeout - continuando con IndexedDB")
      resolve(true)
    }, 2000)
  })
}

// ✅ Inicializar Angular una vez lista la base de datos
async function initializeApp() {
  console.log("🚀 Inicializando aplicación Angular con IndexedDB...")

  try {
    console.log("⏳ Esperando IndexedDB...")
    await waitForDatabase()

    console.log("✅ IndexedDB confirmado, iniciando Angular...")

    await bootstrapApplication(AppComponent, {
      providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideIonicAngular(),
        provideRouter(routes, withPreloading(PreloadAllModules)),
      ],
    })

    console.log("✅ Aplicación Angular inicializada correctamente")
  } catch (err) {
    console.error("❌ Error iniciando aplicación:", err)
  }
}

// ✅ Ejecutar solo cuando DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp)
} else {
  initializeApp()
}
