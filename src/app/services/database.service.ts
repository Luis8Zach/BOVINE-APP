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
  peso?: number | null;
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

private async executeQuery(sql: string, params: any[] = []): Promise<any> {
  console.log('🔍 Ejecutando query:', sql);
  console.log('📋 Parámetros:', params);
  
  if (!this.db || !this.isReady()) {
    console.error('❌ BD no disponible en executeQuery');
    throw new Error('Base de datos no disponible');
  }
  
  try {
    const result = await this.db.run(sql, params);
    console.log('✅ Query ejecutado, resultado completo:', JSON.stringify(result));
    
    // CORRECCIÓN: Usar las propiedades correctas
    console.log('Cambios:', result.changes?.changes || 0);
    console.log('LastID:', result.changes?.lastId || 0);
    console.log('¿Éxito?', (result.changes?.changes || 0) > 0);
    
    return result;
  } catch (error) {
    console.error('❌ Error en executeQuery:', error);
    console.error('Consulta fallida:', sql);
    console.error('Parámetros:', params);
    throw error;
  }
}
//metodo para generar id aotomatico 
// En database.service.ts - agregar este método
async generateSequentialId(): Promise<string> {
    try {
        if (!this.db || !this.isReady()) {
            return `A-001`; // Fallback
        }

        // Obtener el último ID de la base de datos
        const result = await this.db.query(
            "SELECT id FROM animals ORDER BY fechaCreacion DESC LIMIT 1"
        );

        if (result.values && result.values.length > 0) {
            const lastId = result.values[0].id;
            
            // Extraer el número del último ID (ejemplo: "A-001" -> 1)
            const match = lastId.match(/A-(\d+)/);
            if (match && match[1]) {
                const lastNumber = parseInt(match[1]);
                const newNumber = lastNumber + 1;
                return `A-${newNumber.toString().padStart(3, '0')}`;
            }
        }

        // Si no hay animales, empezar desde 001
        return `A-001`;

    } catch (error) {
        console.error('Error generando ID secuencial:', error);
        // Fallback: usar timestamp
        return `A-${Date.now().toString().slice(-3)}`;
    }
}


//Metodod para hacer publico 
async executePublicQuery(sql: string, params: any[] = []): Promise<any> {
    return await this.executeQuery(sql, params);
}
  // ==================== INICIALIZACIÓN ====================

 async initializeDatabase(): Promise<boolean> {
  console.log('🏗️ INICIALIZANDO BASE DE DATOS - Platform: ' + Capacitor.getPlatform());
  
  if (this.initializationPromise) {
    console.log('📦 Promise de inicialización ya existe');
    return this.initializationPromise;
  }

  if (this.isInitialized && this.db) {
    console.log('✅ BD ya está inicializada');
    return true;
  }

  console.log('🔄 Creando nueva promise de inicialización');
  this.initializationPromise = this.performInitialization();
  const result = await this.initializationPromise;
  this.initializationPromise = null;
  return result;
}

private async initializeAndroid(): Promise<boolean> {
  console.log('🤖 Inicializando SQLite en Android...');
  
  try {
    // PASO 1: Cerrar y eliminar conexiones existentes
    console.log('🧹 Limpiando conexiones existentes...');
    await this.cleanupConnections();

    // PASO 2: Crear nueva conexión
    console.log('🔗 Creando nueva conexión: ' + this.DB_NAME);
    this.db = await this.sqlite.createConnection(
      this.DB_NAME,
      false,
      'no-encryption',
      this.DB_VERSION,
      false
    );

    // PASO 3: Abrir base de datos
    console.log('🔓 Abriendo base de datos...');
    await this.db.open();

    // PASO 4: Configurar tablas (esto creará las tablas si no existen)
    console.log('🏗️ Configurando tablas...');
    await this.setupDatabase();

    // PASO 5: Verificar que las columnas existen
    console.log('🔍 Verificando estructura de tablas...');
    await this.debugTableStructure();

    this.isInitialized = true;
    console.log('✅ SQLite en Android lista - Inicialización exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error en Android:', error);
    this.isInitialized = false;
    this.db = null;
    throw error;
  }
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

async debugEventosTable() {
  try {
    if (!this.db || !this.isReady()) {
      console.log('❌ BD no disponible para debug');
      return;
    }
    
    // Verificar estructura de la tabla eventos
    const structure = await this.db.query("PRAGMA table_info(eventos)");
    console.log('🏗️ Estructura de tabla eventos:', structure.values);
    
    // Verificar si existen eventos
    const countResult = await this.db.query("SELECT COUNT(*) as count FROM eventos");
    console.log('📊 Total de eventos en BD:', countResult.values?.[0]?.count || 0);
    
  } catch (error) {
    console.error('❌ Error en debug de tabla eventos:', error);
  }
}

 private async setupDatabase(): Promise<void> {
  if (!this.db) throw new Error('Base de datos no inicializada');
  
  await this.createTables();
  await this.seedInitialData();
  
  // Debug de tablas
  await this.debugEventosTable();
  await this.debugTableStructure();
  
  const stats = await this.getStats();
  console.log(`📊 Estadísticas iniciales: ${stats.animals} animales, ${stats.eventos} eventos`);
}
  // ==================== OPERACIONES DE BASE DE DATOS ====================

  // CORREGIR en database.service.ts - método createTables
private async createTables(): Promise<void> {
  if (!this.db) throw new Error('Base de datos no inicializada');
  
  const schema = `
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
        fechaActualizacion TEXT NOT NULL,
        eliminado INTEGER DEFAULT 0,
        razonEliminacion TEXT,
        fechaEliminacion TEXT
    );
    
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
  `;
  
  try {
    await this.db.execute(schema);
    console.log("✅ Tablas creadas correctamente");
  } catch (error) {
    console.error("❌ Error al crear tablas:", error);
    throw error;
  }
}

async debugTableStructure(): Promise<void> {
  if (!this.db || !this.isReady()) {
    console.log('❌ BD no disponible para debug');
    return;
  }

  try {
    // Verificar estructura de la tabla animals
    const structure = await this.db.query("PRAGMA table_info(animals)");
    console.log('🏗️ Estructura de tabla animals:', structure.values);
    
    // Verificar si existe la columna eliminado
    const hasEliminado = structure.values?.some((col: any) => col.name === 'eliminado');
    console.log('📋 Columna eliminado existe:', hasEliminado);
    
    if (!hasEliminado) {
      console.log('❌ FALTAN COLUMNAS - necesitas recrear la BD');
    }
  } catch (error) {
    console.error('❌ Error en debug:', error);
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

async getAllAnimals(includeDeleted: boolean = false): Promise<Animal[]> {
  if (!this.db || !this.isReady()) {
    console.warn("⚠️ Base de datos no disponible");
    return [];
  }

  try {
    // TEMPORAL: Usar consulta sin la columna eliminado hasta que se cree la tabla correctamente
    let sql = "SELECT * FROM animals";
    // if (!includeDeleted) {
    //   sql += " WHERE eliminado = 0";  // <-- Comentado temporalmente
    // }
    sql += " ORDER BY nombre";

    const result = await this.db.query(sql);
    console.log(`📊 Animales obtenidos: ${result.values?.length || 0}`);
    return result.values || [];
  } catch (error) {
    console.error("❌ Error obteniendo animales:", error);
    
    // Si falla, intentar recrear las tablas
    try {
      console.log('🔄 Intentando recrear tablas...');
      await this.setupDatabase();
      
      // Intentar nuevamente
      const result = await this.db.query("SELECT * FROM animals ORDER BY nombre");
      return result.values || [];
    } catch (retryError) {
      console.error('❌ Error en segundo intento:', retryError);
      return [];
    }
  }
}

//Metodo para identificar tablas 
async checkTableExists(tableName: string): Promise<boolean> {
  if (!this.db || !this.isReady()) {
    console.log('❌ BD no disponible para verificar tabla');
    return false;
  }
  
  try {
    const result = await this.db.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    const exists = !!(result.values && result.values.length > 0);
    console.log(`📋 Tabla ${tableName} existe:`, exists);
    return exists;
  } catch (error) {
    console.error(`❌ Error verificando tabla ${tableName}:`, error);
    return false;
  }
}
//NUEVO METODO 
async getAllTables(): Promise<string[]> {
  if (!this.db || !this.isReady()) return [];
  
  try {
    const result = await this.db.query(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    return result.values ? result.values.map((row: any) => row.name) : [];
  } catch (error) {
    console.error('❌ Error obteniendo tablas:', error);
    return [];
  }
}

async getTableStructure(tableName: string): Promise<any[]> {
  if (!this.db || !this.isReady()) return [];
  
  try {
    const result = await this.db.query(`PRAGMA table_info(${tableName})`);
    return result.values || [];
  } catch (error) {
    console.error(`❌ Error obteniendo estructura de ${tableName}:`, error);
    return [];
  }
}


// En DatabaseService
private async debugQuery(sql: string, params: any[] = []): Promise<void> {
  console.log('🔍 SQL Debug:');
  console.log('Query:', sql);
  console.log('Params:', params);
  
  try {
    const result = await this.db?.query('EXPLAIN QUERY PLAN ' + sql, params);
    console.log('Query Plan:', result?.values);
  } catch (error) {
    console.log('No se pudo obtener el plan de consulta');
  }
}

// Reconstrir la base 
async recreateDatabase(): Promise<boolean> {
  console.log('🔄 RECREANDO BASE DE DATOS COMPLETAMENTE...');
  
  try {
    // 1. Cerrar conexión existente
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    
    // 2. Eliminar la base de datos vieja
    try {
      await this.sqlite.deleteOldDatabases();
      console.log('🗑️ Base de datos antigua eliminada');
    } catch (error) {
      console.log('ℹ️ No se pudo eliminar BD vieja:', error);
    }
    
    // 3. Limpiar conexiones
    await this.cleanupConnections();
    
    // 4. Crear nueva conexión
    this.db = await this.sqlite.createConnection(
      this.DB_NAME,
      false,
      'no-encryption',
      this.DB_VERSION,
      false
    );
    
    // 5. Abrir y configurar
    await this.db.open();
    await this.setupDatabase();
    
    this.isInitialized = true;
    console.log('✅ Base de datos recreada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error recreando BD:', error);
    this.isInitialized = false;
    this.db = null;
    return false;
  }
}


// Añade este método para debug
async debugDatabase(): Promise<void> {
  if (!this.db || !this.isReady()) {
    console.log('❌ Base de datos no disponible para debug');
    return;
  }
  
  try {
    // Verificar si la tabla existe
    const tableCheck = await this.db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='animals'"
    );
    
    // Manejo seguro de values
    const values = tableCheck.values || [];
    console.log('📋 Tabla animals existe:', values.length > 0);
    
    // Contar registros
    const countResult = await this.db.query("SELECT COUNT(*) as count FROM animals");
    const countValues = countResult.values || [];
    const animalCount = countValues.length > 0 ? countValues[0].count : 0;
    console.log('🔢 Total de animales:', animalCount);
    
    // Mostrar algunos registros
    const sampleResult = await this.db.query("SELECT id, nombre, siniga FROM animals LIMIT 5");
    console.log('📝 Primeros animales:', sampleResult.values || []);
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
    
    // Si hay error, puede ser que la tabla no exista, intentar crearla
    console.log('🔄 Intentando crear tablas...');
    try {
      await this.createTables();
      console.log('✅ Tablas creadas exitosamente');
    } catch (createError) {
      console.error('❌ Error creando tablas:', createError);
    }
  }
}

// CORREGIR en database.service.ts - método generateAnimalId
 generateAnimalId(): string {
    return `A-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

// CORREGIR el método insertAnimal - ELIMINAR el comentario dentro del string SQL
// En database.service.ts - modificar insertAnimal
async insertAnimal(animal: Animal): Promise<boolean> {
    console.log('🔴 DatabaseService.insertAnimal llamado con:', JSON.stringify(animal));

    if (!this.isReady()) {
        console.log('❌ Base de datos no disponible');
        return false;
    }

    try {
        // VERIFICAR QUE SINIGA NO ESTÉ VACÍO
        if (!animal.siniga || animal.siniga.trim() === '') {
            console.log('❌ SINIGA es requerido');
            return false;
        }

        console.log('🔴 Verificando SINIGA único:', animal.siniga);
        const existing = await this.db!.query( // CORREGIDO: this.db en lugar de this.db1
            "SELECT id FROM animals WHERE siniga = ?",
            [animal.siniga]
        );

        if (existing.values && existing.values.length > 0) {
            console.log('❌ Ya existe un animal con SINIGA:', animal.siniga);
            return false;
        }

        const finalId = animal.id || await this.generateSequentialId(); // Usar ID secuencial
        
        const sql = `
            INSERT INTO animals (
                id, siniga, nombre, madre, padre, fechaNacimiento, edad, sexo,
                estado, peso, observaciones, fechaCreacion, fechaActualizacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            finalId,
            animal.siniga,
            animal.nombre,
            animal.madre || null,
            animal.padre || null,
            animal.fechaNacimiento,
            animal.edad || "",
            animal.sexo,
            animal.estado,
            animal.peso,
            animal.observaciones || "",
            animal.fechaCreacion || new Date().toISOString(),
            animal.fechaActualizacion || new Date().toISOString(),
        ];

        console.log('🟢 Ejecutando inserción...');
        const result = await this.executeQuery(sql, params);
        const changes = result.changes?.changes || 0;

        if (changes > 0) {
            console.log(`✅ Animal insertado: ${animal.nombre} (ID: ${finalId}, SINIGA: ${animal.siniga})`);
            return true;
        } else {
            console.log('⚠️ No se insertó ningún registro. Resultado:', result);
            return false;
        }
    } catch (error) {
        console.error("❌ Error insertando animal:", error);
        return false;
    }
}

//generar Ziniga 
async generateUniqueSiniga(): Promise<string> {
  const prefix = 'EJ:H';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const potentialSiniga = `${prefix}${randomNum}`;
    
    // Verificar si ya existe
    const exists = await this.checkSinigaExists(potentialSiniga);
    
    if (!exists) {
      return potentialSiniga;
    }
    
    attempts++;
  }
  
  // Fallback: usar timestamp si no encuentra único después de intentos
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

async checkSinigaExists(siniga: string): Promise<boolean> {
  if (!this.db || !this.isReady()) return false;
  
  try {
    const result = await this.db.query(
      "SELECT id FROM animals WHERE siniga = ?",
      [siniga]
    );
    // CORRECCIÓN: Asegurar retorno booleano
    return !!(result.values && result.values.length > 0);
  } catch (error) {
    console.error('Error verificando SINIGA:', error);
    return false;
  }
}



// métodos completos para eventos en database.service.ts

async insertEvento(evento: any): Promise<boolean> {
  try {
    if (!this.db || !this.isReady()) {
      console.error('❌ BD no disponible para insertar evento');
      return false;
    }

    console.log('📝 Insertando evento en BD:', evento);
    
    const sql = `
      INSERT INTO eventos (
        id, fecha, animalId, animalNombre, tipo, estado, notas, 
        fechaCreacion, fechaActualizacion, recordatorio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      evento.id,
      evento.fecha,
      evento.animalId,
      evento.animalNombre,
      evento.tipo,
      evento.estado,
      evento.notas || '',
      evento.fechaCreacion || new Date().toISOString(),
      new Date().toISOString(), // fechaActualizacion
      evento.recordatorio ? 1 : 0
    ];

    const result = await this.db.run(sql, values);
    const changes = result.changes?.changes || 0;
    
    if (changes > 0) {
      console.log('✅ Evento insertado correctamente en BD');
      return true;
    } else {
      console.log('❌ No se insertó el evento en BD');
      return false;
    }
  } catch (error) {
    console.error('❌ Error insertando evento en BD:', error);
    return false;
  }
}

async updateEvento(evento: any): Promise<boolean> {
  try {
    if (!this.db || !this.isReady()) {
      console.error('❌ BD no disponible para actualizar evento');
      return false;
    }

    console.log('📝 Actualizando evento en BD:', evento);
    
    const sql = `
      UPDATE eventos SET
        fecha = ?, animalId = ?, animalNombre = ?, tipo = ?, 
        estado = ?, notas = ?, fechaActualizacion = ?, recordatorio = ?
      WHERE id = ?
    `;

    const values = [
      evento.fecha,
      evento.animalId,
      evento.animalNombre,
      evento.tipo,
      evento.estado,
      evento.notas || '',
      new Date().toISOString(), // fechaActualizacion
      evento.recordatorio ? 1 : 0,
      evento.id
    ];

    const result = await this.db.run(sql, values);
    const changes = result.changes?.changes || 0;
    
    return changes > 0;
  } catch (error) {
    console.error('❌ Error actualizando evento en BD:', error);
    return false;
  }
}

async deleteEvento(id: string): Promise<boolean> {
  try {
    if (!this.db || !this.isReady()) {
      console.error('❌ BD no disponible para eliminar evento');
      return false;
    }

    console.log('🗑️ Eliminando evento de BD:', id);
    
    const sql = `DELETE FROM eventos WHERE id = ?`;
    const result = await this.db.run(sql, [id]);
    const changes = result.changes?.changes || 0;
    
    return changes > 0;
  } catch (error) {
    console.error('❌ Error eliminando evento de BD:', error);
    return false;
  }
}

async getEventoById(id: string): Promise<any> {
  try {
    if (!this.db || !this.isReady()) {
      console.error('❌ BD no disponible para obtener evento');
      return null;
    }

    const sql = `SELECT * FROM eventos WHERE id = ?`;
    const result = await this.db.query(sql, [id]);
    
    if (result.values && result.values.length > 0) {
      const evento = result.values[0];
      // Convertir recordatorio de número a booleano
      return {
        ...evento,
        recordatorio: evento.recordatorio === 1
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo evento por ID:', error);
    return null;
  }
}

async getAllEventos(): Promise<any[]> {
  try {
    if (!this.db || !this.isReady()) {
      console.warn("⚠️ Base de datos no disponible");
      return [];
    }

    const result = await this.db.query("SELECT * FROM eventos ORDER BY fecha DESC");
    
    if (result.values) {
      return result.values.map(evento => ({
        ...evento,
        recordatorio: evento.recordatorio === 1
      }));
    }
    
    return [];
  } catch (error) {
    console.error("❌ Error obteniendo eventos:", error);
    return [];
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

// En database.service.ts - Modifica estos métodos:

async deleteAnimal(id: string, razonEliminacion: string): Promise<boolean> {
  if (!this.db || !this.isReady()) {
    console.warn("⚠️ Base de datos no disponible");
    return false;
  }

  try {
    // TEMPORAL: Usar DELETE permanente hasta que se creen las columnas
    console.log('🗑️ Eliminando permanentemente (temporal) animal:', id);
    
    const sql = "DELETE FROM animals WHERE id = ?";
    const result = await this.db.run(sql, [id]);
    
    const changes = (result as any).changes?.changes || 0;
    
    if (changes > 0) {
      console.log(`✅ Animal ${id} eliminado permanentemente`);
      return true;
    } else {
      console.warn(`⚠️ No se encontró el animal ${id} para eliminar`);
      return false;
    }
  } catch (error) {
    console.error("❌ Error eliminando animal:", error);
    
    // Si falla por columnas faltantes, intentar recrear la BD
    try {
      console.log('🔄 Intentando recrear BD por error de columnas...');
      this.isInitialized = false;
      await this.initializeDatabase();
      return await this.deleteAnimal(id, razonEliminacion);
    } catch (retryError) {
      console.error('❌ Error en reintento:', retryError);
      return false;
    }
  }
}
//metodo para comunicacion notification.database.service
getDatabase(): SQLiteDBConnection | null {
    return this.db;
}

async restoreAnimal(id: string): Promise<boolean> {
  if (!this.db || !this.isReady()) return false;

  try {
    const fechaActualizacion = new Date().toISOString();
    
    const sql = `
      UPDATE animals 
      SET eliminado = 0, 
          razonEliminacion = NULL, 
          fechaEliminacion = NULL,
          fechaActualizacion = ?
      WHERE id = ?
    `;

    const result = await this.db.run(sql, [fechaActualizacion, id]);
    
    // Corrección: Verificar cambios
    const changes = (result as any).changes?.changes || 0;
    return changes > 0;
  } catch (error) {
    console.error("❌ Error restaurando animal:", error);
    return false;
  }
}

async updateAnimal(animal: Animal): Promise<boolean> {
  if (!this.db || !this.isReady()) return false;

  try {
    // Primero obtener el animal actual para verificar si el SINIGA cambió
    const currentAnimal = await this.db.query(
      "SELECT siniga FROM animals WHERE id = ?",
      [animal.id]
    );

    const currentSiniga = currentAnimal.values?.[0]?.siniga;
    const sinigaChanged = currentSiniga !== animal.siniga;

    // Si el SINIGA cambió, verificar que no exista otro con el nuevo SINIGA
    if (sinigaChanged) {
      const existing = await this.db.query(
        "SELECT id FROM animals WHERE siniga = ? AND id != ?",
        [animal.siniga, animal.id]
      );
      
      if (existing.values && existing.values.length > 0) {
        console.log('❌ Ya existe otro animal con SINIGA:', animal.siniga);
        return false;
      }
    }

    const fechaActualizacion = new Date().toISOString();
    
    const sql = `
      UPDATE animals SET
        siniga = ?, nombre = ?, madre = ?, padre = ?,
        fechaNacimiento = ?, edad = ?, sexo = ?, estado = ?,
        peso = ?, observaciones = ?, fechaActualizacion = ?
      WHERE id = ?
    `;

    const result = await this.db.run(sql, [
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
      fechaActualizacion,
      animal.id
    ]);

    const changes = (result as any).changes?.changes || 0;
    return changes > 0;
  } catch (error) {
    console.error("❌ Error actualizando animal:", error);
    return false;
  }
}

async permanentDeleteAnimal(id: string): Promise<boolean> {
  if (!this.db || !this.isReady()) return false;

  try {
    const result = await this.db.run("DELETE FROM animals WHERE id = ?", [id]);
    
    // Corrección: Verificar cambios
    const changes = (result as any).changes?.changes || 0;
    return changes > 0;
  } catch (error) {
    console.error("❌ Error eliminando permanentemente animal:", error);
    return false;
  }
}


// Método para obtener animales eliminados
async getDeletedAnimals(): Promise<Animal[]> {
  if (!this.db || !this.isReady()) return [];

  try {
    const result = await this.db.query(
      "SELECT * FROM animals WHERE eliminado = 1 ORDER BY fechaEliminacion DESC"
    );
    return result.values || [];
  } catch (error) {
    console.error("❌ Error obteniendo animales eliminados:", error);
    return [];
  }

  

  
}






// En database.service.ts


}