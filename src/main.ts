import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';


import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// ✅ Si la importación falla, usa `declare` como backup abajo
// import { defineCustomElements } from '@capacitor-community/sqlite/loader'
declare const defineCustomElements: any;

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
}).then(() => {
  // ✅ Esperar a que el DOM esté listo y registrar jeep-sqlite
  if (typeof defineCustomElements === 'function') {
    defineCustomElements(window)
    console.log("✅ jeep-sqlite registrado desde main.ts")
  } else {
    console.warn("⚠️ defineCustomElements no está disponible aún")
  }
});
