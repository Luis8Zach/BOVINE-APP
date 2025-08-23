import { Injectable } from "@angular/core"
import { BehaviorSubject } from "rxjs"
import { DatabaseService } from "./database.service"

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false)
  public isLoggedIn$ = this.isLoggedInSubject.asObservable()

  constructor(private databaseService: DatabaseService) {
    // Verificar si ya hay una sesión activa al inicializar
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    this.isLoggedInSubject.next(isLoggedIn)

    // Si ya está logueado, inicializar la base de datos
    if (isLoggedIn) {
      console.log("🔄 Sesión activa detectada, inicializando IndexedDB...")
      this.initializeDatabaseAsync()
    }
  }

  private async initializeDatabaseAsync() {
    try {
      // Esperar un poco para que IndexedDB esté completamente listo
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("🔄 Inicializando IndexedDB para sesión existente...")
      const dbInitialized = await this.databaseService.initializeDatabase()

      if (dbInitialized) {
        console.log("✅ IndexedDB inicializada para sesión existente")
      } else {
        console.warn("⚠️ Fallo inicializando IndexedDB para sesión existente")
      }
    } catch (error) {
      console.error("❌ Error inicializando IndexedDB para sesión existente:", error)
    }
  }

  public async login(username: string): Promise<boolean> {
    try {
      console.log(`🔐 Iniciando sesión para: ${username}`)

      localStorage.setItem("isLoggedIn", "true")
      localStorage.setItem("username", username)
      localStorage.setItem("loginTime", new Date().toISOString())

      // Esperar un poco para que IndexedDB esté completamente listo
      console.log("⏳ Esperando que IndexedDB esté completamente listo...")
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Inicializar base de datos al hacer login
      console.log("🔄 Inicializando IndexedDB después del login...")
      const dbInitialized = await this.databaseService.initializeDatabase()

      if (dbInitialized) {
        this.isLoggedInSubject.next(true)
        console.log("✅ Login exitoso e IndexedDB inicializada")

        // Mostrar estadísticas
        const stats = await this.databaseService.getStats()
        console.log(`📊 Estadísticas: ${stats.animals} animales, ${stats.eventos} eventos`)

        return true
      } else {
        // Si falla la inicialización de la DB, continuar sin base de datos
        console.warn("⚠️ Fallo en inicialización de IndexedDB, continuando sin base de datos")
        this.isLoggedInSubject.next(true)
        return true
      }
    } catch (error) {
      console.error("❌ Error en login:", error)
      return false
    }
  }

  public async logout(): Promise<void> {
    console.log("🚪 Cerrando sesión...")

    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("username")
    localStorage.removeItem("loginTime")

    // Cerrar base de datos al hacer logout
    await this.databaseService.closeDatabase()

    this.isLoggedInSubject.next(false)
    console.log("✅ Sesión cerrada correctamente")
  }

  public isLoggedIn(): boolean {
    return localStorage.getItem("isLoggedIn") === "true"
  }

  public getUsername(): string | null {
    return localStorage.getItem("username")
  }

  public getCurrentUser(): string | null {
    return this.getUsername()
  }

  public getLoginTime(): Date | null {
    const loginTime = localStorage.getItem("loginTime")
    return loginTime ? new Date(loginTime) : null
  }

  public isSessionValid(): boolean {
    const loginTime = this.getLoginTime()
    if (!loginTime) return false

    // Sesión válida por 24 horas
    const now = new Date()
    const diffHours = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
    return diffHours < 24
  }

  public isDatabaseReady(): boolean {
    return this.databaseService.isReady()
  }
}
