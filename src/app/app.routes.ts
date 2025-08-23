import type { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "",
    redirectTo: "/login",
    pathMatch: "full",
  },
  {
    path: "login",
    loadComponent: () => import("./pages/login/login.page").then((m) => m.LoginPage),
  },
  {
    path: "tabs",
    loadChildren: () => import("./tabs/tabs.routes").then((m) => m.routes),
  },
  // ✅ Ruta directa a tab1 como fallback
  {
    path: "tab1",
    loadComponent: () => import("./tab1/tab1.page").then((m) => m.Tab1Page),
  },
  {
    path: "tab2",
    loadComponent: () => import("./tab2/tab2.page").then((m) => m.Tab2Page),
  },
  {
    path: "tab3",
    loadComponent: () => import("./tab3/tab3.page").then((m) => m.Tab3Page),
  },
  {
    path: "tab4",
    loadComponent: () => import("./tab4/tab4.page").then((m) => m.Tab4Page),
  },
]
