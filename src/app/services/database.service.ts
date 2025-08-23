import { Injectable } from "@angular/core";
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";

export interface Animal {
  id: string;
  siniga: string;
  nombre: string;
  madre: string;
  padre: string;
  fechaNacimiento: string;
  edad: string;
  sexo: "Hembra" | "Macho";
  estado: "Excelente" | "Bueno" | "Regular" | "Enfermo";
  peso?: number;
  observaciones: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface Evento {
  id: string;
  fecha: string;
  animalId: string;
  animalNombre: string;
  tipo: "Celo" | "Vacunación" | "Inseminación" | "Parto";
  estado: "Programado" | "Realizado" | "Pendiente" | "Alerta";
  notas: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  recordatorio?: boolean;
}

@Injectable({
  providedIn: "root"
})
export class DatabaseService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;
  private readonly DB_NAME = "agrodata.db";
  private readonly DB_VERSION = 1;
  private isInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;
  public useMockDatabase = false;

  constructor() {
    console.log("🏗️ DatabaseService inicializado");
  }

  // ==================== INICIALIZACIÓN ====================

  async initializeDatabase(): Promise<boolean> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized && this.db) {
      return true;
    }

    this.initializationPromise = this.performInitialization();
    const result = await this.initializationPromise;
    this.initializationPromise = null;
    return result;
  }

  private async performInitialization(): Promise<boolean> {
    try {
      const platform = Capacitor.getPlatform();
      console.log(`📱 Plataforma detectada: ${platform}`);

      switch (platform) {
        case 'android':
          return await this.initializeAndroid();
        case 'ios':
          return await this.initializeIOS();
        case 'web':
          return await this.initializeWeb();
        default:
          console.error('Plataforma no soportada');
          return false;
      }
    } catch (error) {
      console.error('❌ Error en inicialización:', error);
      this.isInitialized = false;
      this.db = null;
      return false;
    }
  }

  private async initializeAndroid(): Promise<boolean> {
    try {
      // Verificar y limpiar conexiones existentes
      await this.cleanupConnections();

      // Crear nueva conexión
      this.db = await this.sqlite.createConnection(
        this.DB_NAME,
        false,
        'no-encryption',
        this.DB_VERSION,
        false
      );

      // Abrir base de datos
      await this.db.open();

      // Configurar tablas y datos iniciales
      await this.setupDatabase();

      this.isInitialized = true;
      console.log("✅ SQLite en Android lista");
      return true;
    } catch (error) {
      console.error('❌ Error en Android:', error);
      throw error;
    }
  }

  private async initializeIOS(): Promise<boolean> {
    try {
      // Similar a Android pero con ajustes específicos para iOS si son necesarios
      await this.cleanupConnections();

      this.db = await this.sqlite.createConnection(
        this.DB_NAME,
        false,
        'no-encryption',
        this.DB_VERSION,
        false
      );

      await this.db.open();
      await this.setupDatabase();

      this.isInitialized = true;
      console.log("✅ SQLite en iOS lista");
      return true;
    } catch (error) {
      console.error('❌ Error en iOS:', error);
      throw error;
    }
  }

  private async initializeWeb(): Promise<boolean> {
    try {
      // Verificar si jeep-sqlite está disponible
      const jeepReady = await this.checkJeepSQLite();
      
      if (!jeepReady) {
        console.warn("⚠️ JeepSQLite no disponible. Usando modo mock.");
        this.useMockDatabase = true;
        this.isInitialized = true;
        return true;
      }

      // Inicializar WebStore
      await this.sqlite.initWebStore();
      console.log("🌐 WebStore inicializado");

      // Crear conexión
      this.db = await this.sqlite.createConnection(
        this.DB_NAME,
        false,
        'no-encryption',
        this.DB_VERSION,
        false
      );

      // Abrir base de datos
      await this.db.open();

      // Configurar tablas
      await this.setupDatabase();

      this.isInitialized = true;
      console.log("✅ SQLite en Web lista");
      return true;
    } catch (error) {
      console.error('❌ Error en Web:', error);
      throw error;
    }
  }

  private async cleanupConnections(): Promise<void> {
    try {
      await this.sqlite.checkConnectionsConsistency();
      await this.sqlite.retrieveAllConnections();
      await this.sqlite.closeAllConnections();
    } catch (error) {
      console.log('ℹ️ No hay conexiones existentes para limpiar');
    }
  }

  private async checkJeepSQLite(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).jeepSQLiteReady) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        window.removeEventListener('jeep-sqlite-ready', listener);
        resolve(false);
      }, 2000);

      const listener = () => {
        clearTimeout(timeout);
        window.removeEventListener('jeep-sqlite-ready', listener);
        resolve(true);
      };

      window.addEventListener('jeep-sqlite-ready', listener);
    });
  }

  private async setupDatabase(): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');
    
    await this.createTables();
    await this.seedInitialData();
    
    const stats = await this.getStats();
    console.log(`📊 Estadísticas iniciales: ${stats.animals} animales, ${stats.eventos} eventos`);
  }

  // ==================== OPERACIONES DE BASE DE DATOS ====================

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Base de datos no inicializada');

    const schema = `
      -- Tabla de Animales
      CREATE TABLE IF NOT EXISTS animals (
        id TEXT PRIMARY KEY,
        siniga TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        madre TEXT,
        padre TEXT,
        fechaNacimiento TEXT NOT NULL,
        edad TEXT,
        sexo TEXT NOT NULL CHECK (sexo IN ('Hembra', 'Macho')),
        estado TEXT NOT NULL CHECK (estado IN ('Excelente', 'Bueno', 'Regular', 'Enfermo')),
        peso REAL,
        observaciones TEXT,
        fechaCreacion TEXT NOT NULL,
        fechaActualizacion TEXT NOT NULL
      );

      -- Tabla de Eventos
      CREATE TABLE IF NOT EXISTS eventos (
        id TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        animalId TEXT NOT NULL,
        animalNombre TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('Celo', 'Vacunación', 'Inseminación', 'Parto')),
        estado TEXT NOT NULL CHECK (estado IN ('Programado', 'Realizado', 'Pendiente', 'Alerta')),
        notas TEXT,
        fechaCreacion TEXT NOT NULL,
        fechaActualizacion TEXT NOT NULL,
        recordatorio INTEGER DEFAULT 1,
        FOREIGN KEY (animalId) REFERENCES animals (id) ON DELETE CASCADE
      );

      -- Índices para mejorar rendimiento
      CREATE INDEX IF NOT EXISTS idx_animals_sexo ON animals(sexo);
      CREATE INDEX IF NOT EXISTS idx_animals_estado ON animals(estado);
      CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);
      CREATE INDEX IF NOT EXISTS idx_eventos_animal ON eventos(animalId);
      CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);
    `;

    try {
      await this.db.execute(schema);
      console.log("✅ Tablas creadas correctamente");
    } catch (error) {
      console.error("❌ Error al crear tablas:", error);
      throw error;
    }
  }

  private async seedInitialData(): Promise<void> {
    if (!this.db) return;

    try {
      const countResult = await this.db.query("SELECT COUNT(*) as count FROM animals");
      const count = countResult.values?.[0]?.count || 0;
      
      if (count === 0) {
        console.log("🌱 Base de datos vacía, no se insertan datos iniciales");
      } else {
        console.log(`📊 Base de datos ya contiene ${count} animales`);
      }
    } catch (error) {
      console.error("❌ Error verificando datos iniciales:", error);
      throw error;
    }
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  public isReady(): boolean {
    return this.isInitialized && (this.db !== null || this.useMockDatabase);
  }

  async getDatabaseStatus() {
    return {
      platform: Capacitor.getPlatform(),
      isReady: this.isReady(),
      isInitialized: this.isInitialized,
      dbExists: this.db !== null,
      useMock: this.useMockDatabase
    };
  }

  // ==================== CRUD ANIMALES ====================

  async getAllAnimals(): Promise<Animal[]> {
    if (!this.db || !this.isReady()) {
      console.warn("⚠️ Base de datos no disponible");
      return [];
    }

    try {
      const result = await this.db.query("SELECT * FROM animals ORDER BY nombre");
      return result.values || [];
    } catch (error) {
      console.error("❌ Error obteniendo animales:", error);
      return [];
    }
  }

  async insertAnimal(animal: Animal): Promise<boolean> {
    if (!this.db || !this.isReady()) return false;

    try {
      const sql = `
        INSERT INTO animals (
          id, siniga, nombre, madre, padre, fechaNacimiento, edad, sexo, 
          estado, peso, observaciones, fechaCreacion, fechaActualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(sql, [
        animal.id,
        animal.siniga,
        animal.nombre,
        animal.madre,
        animal.padre,
        animal.fechaNacimiento,
        animal.edad,
        animal.sexo,
        animal.estado,
        animal.peso,
        animal.observaciones,
        animal.fechaCreacion,
        animal.fechaActualizacion,
      ]);

      return true;
    } catch (error) {
      console.error("❌ Error insertando animal:", error);
      return false;
    }
  }

  // ==================== CRUD EVENTOS ====================

  async getAllEventos(): Promise<Evento[]> {
    if (!this.db || !this.isReady()) {
      console.warn("⚠️ Base de datos no disponible");
      return [];
    }

    try {
      const result = await this.db.query("SELECT * FROM eventos ORDER BY fecha DESC");
      return result.values || [];
    } catch (error) {
      console.error("❌ Error obteniendo eventos:", error);
      return [];
    }
  }

  async insertEvento(evento: Evento): Promise<boolean> {
    if (!this.db || !this.isReady()) return false;

    try {
      const sql = `
        INSERT INTO eventos (
          id, fecha, animalId, animalNombre, tipo, estado, notas, 
          fechaCreacion, fechaActualizacion, recordatorio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(sql, [
        evento.id,
        evento.fecha,
        evento.animalId,
        evento.animalNombre,
        evento.tipo,
        evento.estado,
        evento.notas,
        evento.fechaCreacion,
        evento.fechaActualizacion,
        evento.recordatorio ? 1 : 0,
      ]);

      return true;
    } catch (error) {
      console.error("❌ Error insertando evento:", error);
      return false;
    }
  }

  // ==================== UTILIDADES ====================

  async getStats(): Promise<{ animals: number; eventos: number }> {
    if (!this.db || !this.isReady()) {
      return { animals: 0, eventos: 0 };
    }

    try {
      const animalsResult = await this.db.query("SELECT COUNT(*) as count FROM animals");
      const eventosResult = await this.db.query("SELECT COUNT(*) as count FROM eventos");

      return {
        animals: animalsResult.values?.[0]?.count || 0,
        eventos: eventosResult.values?.[0]?.count || 0,
      };
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return { animals: 0, eventos: 0 };
    }
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log("🔒 Base de datos cerrada");
    }
  }

  async deleteDatabase(): Promise<void> {
    if (this.db) {
      await this.closeDatabase();
    }
    await this.sqlite.deleteOldDatabases()
    console.log("🗑️ Base de datos eliminada");
  }
}