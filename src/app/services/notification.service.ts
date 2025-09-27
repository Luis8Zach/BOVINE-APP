import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { AlertController, ToastController } from '@ionic/angular';

export interface Notification {
  id: string;
  tipo: "Celo" | "Vacunación" | "Inseminación" | "Parto" | "Sistema";
  titulo: string;
  mensaje: string;
  fecha: string;
  hora: string;
  leida: boolean;
  prioridad: "Alta" | "Media" | "Baja";
  animalId?: string;
  animalNombre?: string;
  fechaCreacion: string;
  eventoId?: string; // Para evitar duplicados
  createdDate?: string; // Para control de limpieza
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private lastNotificationCheck: string = '';

  constructor(
    private databaseService: DatabaseService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    console.log('✅ NotificationService inicializado');
  }

  /**
   * Crear tabla de notificaciones con campos para evitar duplicados
   */
  async createNotificationsTable(): Promise<void> {
    const schema = `
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        leida INTEGER DEFAULT 0,
        prioridad TEXT NOT NULL,
        animalId TEXT,
        animalNombre TEXT,
        fechaCreacion TEXT NOT NULL,
        eventoId TEXT UNIQUE,
        createdDate TEXT NOT NULL
      )
    `;

    try {
      const db = this.databaseService.getDatabase();
      if (!db) {
        throw new Error('Base de datos no disponible');
      }
      
      await db.execute(schema);
      console.log('✅ Tabla de notificaciones creada/verificada');
    } catch (error) {
      console.error('❌ Error creando tabla de notificaciones:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las notificaciones
   */
  async getAllNotifications(): Promise<Notification[]> {
    try {
      if (!this.databaseService.isReady()) {
        console.warn('⚠️ Base de datos no disponible');
        return [];
      }

      const db = this.databaseService.getDatabase();
      if (!db) {
        return [];
      }

      const result = await db.query(
        "SELECT * FROM notifications ORDER BY fecha DESC, hora DESC"
      );

      if (result.values) {
        return result.values.map((notif: any) => ({
          ...notif,
          leida: notif.leida === 1
        }));
      }

      return [];

    } catch (error) {
      console.error('❌ Error obteniendo notificaciones:', error);
      return [];
    }
  }

  /**
   * Verificar si ya existe una notificación para un evento
   */
  private async notificationExists(eventoId: string, tipo: string, fecha: string, titulo: string): Promise<boolean> {
    try {
      const db = this.databaseService.getDatabase();
      if (!db) return false;

      // Verificar por eventoId (método más seguro)
      if (eventoId) {
        const result = await db.query(
          "SELECT id FROM notifications WHERE eventoId = ?",
          [eventoId]
        );
        if (result.values && result.values.length > 0) {
          return true;
        }
      }

      // Verificar por tipo, animal, fecha y título (fallback)
      const result = await db.query(
        "SELECT id FROM notifications WHERE tipo = ? AND animalId = ? AND fecha = ? AND titulo = ?",
        [tipo, eventoId, fecha, titulo]
      );

      return !!(result.values && result.values.length > 0);
    } catch (error) {
      console.error('❌ Error verificando notificación existente:', error);
      return false;
    }
  }

  /**
   * Crear nueva notificación (con control de duplicados)
   */
  async createNotification(notification: Omit<Notification, 'id' | 'fechaCreacion'>): Promise<boolean> {
    try {
      if (!this.databaseService.isReady()) {
        console.error('❌ Base de datos no disponible');
        return false;
      }

      const db = this.databaseService.getDatabase();
      if (!db) {
        return false;
      }

      // Verificar si ya existe una notificación similar
      if (notification.eventoId) {
        const exists = await this.notificationExists(
          notification.eventoId,
          notification.tipo,
          notification.fecha,
          notification.titulo
        );

        if (exists) {
          console.log('ℹ️ Notificación ya existe, omitiendo...');
          return true;
        }
      }

      const id = `N-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const sql = `
        INSERT INTO notifications (id, tipo, titulo, mensaje, fecha, hora, prioridad, animalId, animalNombre, fechaCreacion, leida, eventoId, createdDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        notification.tipo,
        notification.titulo,
        notification.mensaje,
        notification.fecha,
        notification.hora,
        notification.prioridad,
        notification.animalId || null,
        notification.animalNombre || null,
        new Date().toISOString(),
        notification.leida ? 1 : 0,
        notification.eventoId || null,
        new Date().toISOString()
      ];

      const result = await db.run(sql, params);
      const changes = result.changes?.changes || 0;

      if (changes > 0) {
        console.log('✅ Notificación creada:', id);
        return true;
      }

      return false;

    } catch (error) {
      // Si es error de constraint UNIQUE, ignorar silenciosamente
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        console.log('ℹ️ Notificación duplicada (constraint), ignorando...');
        return true;
      }
      console.error('❌ Error creando notificación:', error);
      return false;
    }
  }

  /**
   * Generar notificaciones automáticas SIN DUPLICADOS
   */
  async generateEventNotifications(): Promise<number> {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      // Evitar generar notificaciones múltiples veces el mismo día
      if (this.lastNotificationCheck === hoy) {
        console.log('🔔 Notificaciones ya generadas hoy, omitiendo...');
        return 0;
      }

      const eventos = await this.databaseService.getAllEventos();
      console.log(`🔍 Verificando ${eventos.length} eventos para notificaciones`);

      let notificationsCreated = 0;

      for (const evento of eventos) {
        // Notificar eventos atrasados
        if (evento.fecha < hoy && evento.estado !== 'Realizado') {
          const success = await this.createNotification({
            tipo: evento.tipo as any,
            titulo: 'Evento Atrasado',
            mensaje: `${evento.animalNombre} tiene ${evento.tipo.toLowerCase()} pendiente desde ${evento.fecha}`,
            fecha: hoy,
            hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            prioridad: 'Alta',
            animalId: evento.animalId,
            animalNombre: evento.animalNombre,
            leida: false,
            eventoId: `atrasado_${evento.id}` // ID único para este tipo de notificación
          });

          if (success) notificationsCreated++;
        }

        // Notificar eventos para hoy
        if (evento.fecha === hoy && evento.estado !== 'Realizado') {
          const success = await this.createNotification({
            tipo: evento.tipo as any,
            titulo: 'Evento para Hoy',
            mensaje: `${evento.animalNombre} tiene ${evento.tipo.toLowerCase()} programado para hoy`,
            fecha: hoy,
            hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            prioridad: 'Media',
            animalId: evento.animalId,
            animalNombre: evento.animalNombre,
            leida: false,
            eventoId: `hoy_${evento.id}` // ID único para este tipo de notificación
          });

          if (success) notificationsCreated++;
        }
      }

      this.lastNotificationCheck = hoy;
      console.log(`✅ ${notificationsCreated} notificaciones nuevas generadas`);
      return notificationsCreated;

    } catch (error) {
      console.error('❌ Error generando notificaciones automáticas:', error);
      return 0;
    }
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      if (!this.databaseService.isReady()) {
        return false;
      }

      const db = this.databaseService.getDatabase();
      if (!db) {
        return false;
      }

      const sql = "UPDATE notifications SET leida = 1 WHERE id = ?";
      const result = await db.run(sql, [id]);
      
      const changes = result.changes?.changes || 0;
      if (changes > 0) {
        console.log('✅ Notificación marcada como leída:', id);
      }
      return changes > 0;

    } catch (error) {
      console.error('❌ Error marcando notificación como leída:', error);
      return false;
    }
  }

  /**
   * Marcar todas como leídas
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      if (!this.databaseService.isReady()) {
        return false;
      }

      const db = this.databaseService.getDatabase();
      if (!db) {
        return false;
      }

      const sql = "UPDATE notifications SET leida = 1 WHERE leida = 0";
      const result = await db.run(sql);
      
      const changes = result.changes?.changes || 0;
      if (changes > 0) {
        console.log(`✅ ${changes} notificaciones marcadas como leídas`);
      }
      return changes > 0;

    } catch (error) {
      console.error('❌ Error marcando todas como leídas:', error);
      return false;
    }
  }

  /**
   * Eliminar notificación
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      if (!this.databaseService.isReady()) {
        return false;
      }

      const db = this.databaseService.getDatabase();
      if (!db) {
        return false;
      }

      const sql = "DELETE FROM notifications WHERE id = ?";
      const result = await db.run(sql, [id]);
      
      const changes = result.changes?.changes || 0;
      if (changes > 0) {
        console.log('✅ Notificación eliminada:', id);
      }
      return changes > 0;

    } catch (error) {
      console.error('❌ Error eliminando notificación:', error);
      return false;
    }
  }

  /**
   * Eliminar todas las notificaciones
   */
  async clearAllNotifications(): Promise<boolean> {
    try {
      if (!this.databaseService.isReady()) {
        return false;
      }

      const db = this.databaseService.getDatabase();
      if (!db) {
        return false;
      }

      const sql = "DELETE FROM notifications";
      const result = await db.run(sql);
      
      console.log('✅ Todas las notificaciones eliminadas');
      return true;

    } catch (error) {
      console.error('❌ Error eliminando todas las notificaciones:', error);
      return false;
    }
  }

  /**
   * Obtener notificaciones no leídas
   */
  async getUnreadNotifications(): Promise<Notification[]> {
    try {
      if (!this.databaseService.isReady()) {
        return [];
      }

      const db = this.databaseService.getDatabase();
      if (!db) {
        return [];
      }

      const result = await db.query(
        "SELECT * FROM notifications WHERE leida = 0 ORDER BY fecha DESC, hora DESC"
      );

      if (result.values) {
        return result.values.map((notif: any) => ({
          ...notif,
          leida: notif.leida === 1
        }));
      }

      return [];

    } catch (error) {
      console.error('❌ Error obteniendo notificaciones no leídas:', error);
      return [];
    }
  }

  /**
   * Obtener notificación por ID
   */
  async getNotificationById(id: string): Promise<Notification | null> {
    try {
      if (!this.databaseService.isReady()) {
        return null;
      }

      const db = this.databaseService.getDatabase();
      if (!db) {
        return null;
      }

      const sql = "SELECT * FROM notifications WHERE id = ?";
      const result = await db.query(sql, [id]);

      if (result.values && result.values.length > 0) {
        const notif = result.values[0];
        return {
          ...notif,
          leida: notif.leida === 1
        };
      }

      return null;

    } catch (error) {
      console.error('❌ Error obteniendo notificación por ID:', error);
      return null;
    }
  }

  /**
   * Crear notificación del sistema
   */
  async createSystemNotification(titulo: string, mensaje: string, prioridad: "Alta" | "Media" | "Baja" = "Media"): Promise<boolean> {
    const notification: Omit<Notification, 'id' | 'fechaCreacion'> = {
      tipo: "Sistema",
      titulo,
      mensaje,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      prioridad,
      leida: false,
      eventoId: `sistema_${Date.now()}` // ID único para notificaciones del sistema
    };

    return await this.createNotification(notification);
  }

  /**
   * Limpiar notificaciones antiguas (más de 30 días)
   */
  async cleanupOldNotifications(): Promise<number> {
    try {
      const db = this.databaseService.getDatabase();
      if (!db) return 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await db.run(
        "DELETE FROM notifications WHERE createdDate < ? AND leida = 1",
        [thirtyDaysAgo.toISOString()]
      );

      const deletedCount = result.changes?.changes || 0;
      if (deletedCount > 0) {
        console.log(`🧹 ${deletedCount} notificaciones antiguas eliminadas`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Error limpiando notificaciones antiguas:', error);
      return 0;
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async getNotificationStats(): Promise<{ total: number; unread: number; read: number }> {
    try {
      if (!this.databaseService.isReady()) {
        return { total: 0, unread: 0, read: 0 };
      }

      const db = this.databaseService.getDatabase();
      if (!db) {
        return { total: 0, unread: 0, read: 0 };
      }

      const totalResult = await db.query("SELECT COUNT(*) as count FROM notifications");
      const unreadResult = await db.query("SELECT COUNT(*) as count FROM notifications WHERE leida = 0");

      const total = totalResult.values?.[0]?.count || 0;
      const unread = unreadResult.values?.[0]?.count || 0;
      const read = total - unread;

      return { total, unread, read };

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de notificaciones:', error);
      return { total: 0, unread: 0, read: 0 };
    }
  }

  /**
   * Reiniciar el control de notificaciones (útil para testing)
   */
  resetNotificationCheck(): void {
    this.lastNotificationCheck = '';
    console.log('🔄 Control de notificaciones reiniciado');
  }

  /**
   * Inicializar el servicio de notificaciones
   */
  async initialize(): Promise<boolean> {
    try {
      await this.createNotificationsTable();
      await this.cleanupOldNotifications();
      console.log('✅ NotificationService inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando NotificationService:', error);
      return false;
    }
  }
}