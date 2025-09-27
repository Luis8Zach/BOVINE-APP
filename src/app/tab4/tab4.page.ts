import { IonicModule } from '@ionic/angular';
import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonBadge,
  IonToggle,
  IonList,
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  IonNote,
  IonAvatar,
  AlertController,
  ToastController,
  LoadingController
} from "@ionic/angular/standalone"
import { addIcons } from "ionicons"
import {
  notificationsOutline,
  settingsOutline,
  informationCircleOutline,
  heartOutline,
  medicalOutline,
  flowerOutline,
  personOutline,
  timeOutline,
  checkmarkCircleOutline,
  warningOutline,
  alertCircleOutline,
  phonePortraitOutline,
  cloudOfflineOutline,
  serverOutline,
  calendarOutline,
  pawOutline,
  logOutOutline,
  trashOutline,
} from "ionicons/icons"
import { AuthService } from "../services/auth.service"
import { Router } from "@angular/router"
import { NotificationService, Notification } from '../services/notification.service';
import { DatabaseService } from '../services/database.service';
import { DataShareService } from '../services/data-share.service';
import { Subscription } from 'rxjs';

interface NotificationSettings {
  celoAlerts: boolean;
  vacunacionReminders: boolean;
  inseminacionTracking: boolean;
  partoAlerts: boolean;
  systemNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

@Component({
  selector: "app-tab4",
  templateUrl: "tab4.page.html",
  styleUrls: ["tab4.page.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonBadge,
    IonToggle,
    IonList,
    IonGrid,
    IonRow,
    IonCol,
    IonSegment,
    IonSegmentButton,
    IonNote,
    IonAvatar,
    IonicModule
  ],
})
export class Tab4Page implements OnInit, OnDestroy {
  currentUser = ""
  activeTab = "notifications"
  notifications: Notification[] = []
  unreadCount = 0
  private dataUpdateSubscription!: Subscription;

  settings: NotificationSettings = {
    celoAlerts: true,
    vacunacionReminders: true,
    inseminacionTracking: true,
    partoAlerts: true,
    systemNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
  }

  appInfo = {
    version: "1.0.0",
    buildDate: "18 Enero 2025",
    database: "SQLite Local",
    totalAnimals: 0,
    totalEvents: 0,
    lastSync: "Modo Offline",
    storageUsed: "0 KB",
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private notificationService: NotificationService,
    private databaseService: DatabaseService,
    private dataShareService: DataShareService
  ) {
    addIcons({
      notificationsOutline,
      settingsOutline,
      informationCircleOutline,
      heartOutline,
      medicalOutline,
      flowerOutline,
      personOutline,
      timeOutline,
      checkmarkCircleOutline,
      warningOutline,
      alertCircleOutline,
      phonePortraitOutline,
      cloudOfflineOutline,
      serverOutline,
      calendarOutline,
      pawOutline,
      logOutOutline,
      trashOutline,
    })
  }

  async ngOnInit() {
    this.currentUser = this.authService.getCurrentUser() || "Usuario";
    await this.loadNotifications();
    await this.loadAppInfo();
    await this.notificationService.initialize();
    this.loadSettings();
    this.updateUnreadCount();

    this.dataUpdateSubscription = this.dataShareService.dataUpdated$.subscribe(() => {
      this.loadNotifications();
      this.loadAppInfo();
      this.generateAutoNotifications();
    });
  }

  ngOnDestroy() {
    if (this.dataUpdateSubscription) {
      this.dataUpdateSubscription.unsubscribe();
    }
  }

 async loadNotifications() {
    try {
        await this.notificationService.createNotificationsTable();
        this.notifications = await this.notificationService.getAllNotifications();
        this.updateUnreadCount();
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
        this.loadExampleNotifications();
    }
}

  private loadExampleNotifications() {
    this.notifications = [
      {
        id: "1",
        tipo: "Celo",
        titulo: "Celo Detectado",
        mensaje: "Paloma (H001) está en celo. Considerar inseminación artificial.",
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        leida: false,
        prioridad: "Alta",
        animalId: "H001",
        animalNombre: "Paloma",
        fechaCreacion: new Date().toISOString()
      },
      {
        id: "2",
        tipo: "Vacunación",
        titulo: "Vacunación Pendiente",
        mensaje: "Estrella (H002) tiene vacunación programada para mañana.",
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        leida: false,
        prioridad: "Media",
        animalId: "H002",
        animalNombre: "Estrella",
        fechaCreacion: new Date().toISOString()
      }
    ];
  }

  async loadAppInfo() {
    try {
      const animales = await this.databaseService.getAllAnimals();
      const eventos = await this.databaseService.getAllEventos();
      
      this.appInfo = {
        version: "1.0.0",
        buildDate: "18 Enero 2025",
        database: "SQLite Local",
        totalAnimals: animales.length,
        totalEvents: eventos.length,
        lastSync: new Date().toLocaleDateString('es-ES'),
        storageUsed: await this.calculateStorageUsage()
      };
    } catch (error) {
      console.error('❌ Error cargando info de la app:', error);
    }
  }

  private async calculateStorageUsage(): Promise<string> {
    try {
        const animales = await this.databaseService.getAllAnimals();
        const eventos = await this.databaseService.getAllEventos();
        const notificaciones = await this.notificationService.getAllNotifications(); // <- Cambiado de "notifications"

        const totalKB = (animales.length * 0.5) + (eventos.length * 0.3) + (notificaciones.length * 0.2);
        return totalKB > 1024 ? `${(totalKB / 1024).toFixed(1)} MB` : `${Math.round(totalKB)} KB`;
    } catch (error) {
        return 'N/A';
    }
}
  loadSettings() {
    const savedSettings = localStorage.getItem("bovine_app_settings");
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }
  }

  saveSettings() {
    localStorage.setItem("bovine_app_settings", JSON.stringify(this.settings));
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter((n) => !n.leida).length; // <- Cambiado de "In.leida" a "!n.leida"
}

  onTabChange(event: any) {
    this.activeTab = event.detail.value;
  }

  async markAsRead(notification: Notification) {
    try {
      await this.notificationService.markAsRead(notification.id);
      const index = this.notifications.findIndex((n) => n.id === notification.id);
      if (index !== -1) {
        this.notifications[index].leida = true;
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('❌ Error marcando como leída:', error);
    }
  }

  async markAllAsRead() {
    try {
      await this.notificationService.markAllAsRead();
      this.notifications.forEach(n => n.leida = true);
      this.updateUnreadCount();
      this.showToast("Todas las notificaciones marcadas como leídas", "success");
    } catch (error) {
      console.error('❌ Error marcando todas como leídas:', error);
      this.showToast("Error al marcar como leídas", "danger");
    }
  }

  async deleteNotification(notification: Notification) {
    const alert = await this.alertController.create({
      header: "Eliminar Notificación",
      message: `¿Estás seguro de que deseas eliminar esta notificación?`,
      cssClass: "custom-alert",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "alert-button-cancel",
        },
        {
          text: "Eliminar",
          cssClass: "alert-button-confirm",
          handler: async () => {
            try {
              await this.notificationService.deleteNotification(notification.id);
              const index = this.notifications.findIndex((n) => n.id === notification.id);
              if (index !== -1) {
                this.notifications.splice(index, 1);
                this.updateUnreadCount();
                this.showToast("Notificación eliminada", "success");
              }
            } catch (error) {
              console.error('❌ Error eliminando notificación:', error);
              this.showToast("Error al eliminar notificación", "danger");
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async clearAllNotifications() {
    const alert = await this.alertController.create({
      header: "Limpiar Notificaciones",
      message: "¿Estás seguro de que deseas eliminar todas las notificaciones?",
      cssClass: "custom-alert",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "alert-button-cancel",
        },
        {
          text: "Limpiar Todo",
          cssClass: "alert-button-confirm",
          handler: async () => {
            try {
              await this.notificationService.clearAllNotifications();
              this.notifications = [];
              this.updateUnreadCount();
              this.showToast("Todas las notificaciones eliminadas", "success");
            } catch (error) {
              console.error('❌ Error limpiando notificaciones:', error);
              this.showToast("Error al limpiar notificaciones", "danger");
            }
          },
        },
      ],
    });

    await alert.present();
  }

  onSettingChange(setting: keyof NotificationSettings) {
    this.saveSettings();
    this.showToast("Configuración actualizada", "success");
  }

  async resetSettings() {
    const alert = await this.alertController.create({
      header: "Restablecer Configuración",
      message: "¿Estás seguro de que deseas restablecer todas las configuraciones?",
      cssClass: "custom-alert",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "alert-button-cancel",
        },
        {
          text: "Restablecer",
          cssClass: "alert-button-confirm",
          handler: () => {
            this.settings = {
              celoAlerts: true,
              vacunacionReminders: true,
              inseminacionTracking: true,
              partoAlerts: true,
              systemNotifications: true,
              soundEnabled: true,
              vibrationEnabled: true,
            };
            this.saveSettings();
            this.showToast("Configuración restablecida", "success");
          },
        },
      ],
    });

    await alert.present();
  }

  async exportData() {
    const loading = await this.showLoading('Preparando exportación...');
    
    try {
      const animales = await this.databaseService.getAllAnimals();
      const eventos = await this.databaseService.getAllEventos();
      const notificaciones = await this.notificationService.getAllNotifications();
      
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          appVersion: this.appInfo.version,
          totalAnimals: animales.length,
          totalEvents: eventos.length,
          totalNotifications: notificaciones.length
        },
        animales,
        eventos,
        notificaciones,
        settings: this.settings
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `agrodata_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      await loading.dismiss();
      this.showToast('Datos exportados exitosamente', 'success');
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error exportando datos:', error);
      this.showToast('Error al exportar datos', 'danger');
    }
  }

  async logout() {
    const alert = await this.alertController.create({
      header: "Cerrar Sesión",
      message: "¿Estás seguro de que deseas cerrar sesión?",
      cssClass: "custom-alert",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "alert-button-cancel",
        },
        {
          text: "Cerrar Sesión",
          cssClass: "alert-button-confirm",
          handler: () => {
            this.authService.logout();
            this.router.navigate(["/login"], { replaceUrl: true });
          },
        },
      ],
    });

    await alert.present();
  }

  getNotificationIcon(tipo: string): string {
    switch (tipo) {
      case "Celo":
        return "heart-outline";
      case "Vacunación":
        return "medical-outline";
      case "Inseminación":
        return "flower-outline";
      case "Parto":
        return "person-outline";
      case "Sistema":
        return "settings-outline";
      default:
        return "notifications-outline";
    }
  }

  getNotificationColor(tipo: string): string {
    switch (tipo) {
      case "Celo":
        return "#eb445a";
      case "Vacunación":
        return "#3880ff";
      case "Inseminación":
        return "#2dd36f";
      case "Parto":
        return "#ffc409";
      case "Sistema":
        return "#92949c";
      default:
        return "#92949c";
    }
  }

  getPriorityColor(prioridad: string): string {
    switch (prioridad) {
      case "Alta":
        return "danger";
      case "Media":
        return "warning";
      case "Baja":
        return "medium";
      default:
        return "medium";
    }
  }

  formatNotificationTime(fecha: string, hora: string): string {
    const notificationDate = new Date(`${fecha}T${hora}`);
    const now = new Date();
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
    } else if (diffHours > 0) {
      return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    } else {
      return "Hace unos minutos";
    }
  }

  private async generateAutoNotifications() {
    try {
        // Verificar si ya generamos notificaciones hoy
        const today = new Date().toISOString().split('T')[0];
        const lastGeneration = localStorage.getItem('lastNotificationGeneration');
        
        if (lastGeneration !== today) {
            const nuevasNotificaciones = await this.notificationService.generateEventNotifications();
            
            if (nuevasNotificaciones > 0) {
                await this.loadNotifications(); // Recargar solo si hay nuevas
                this.showToast(`${nuevasNotificaciones} nuevas notificaciones`, 'success');
            }
            
            localStorage.setItem('lastNotificationGeneration', today);
        }
    } catch (error) {
        console.error('Error generando notificaciones automáticas:', error);
    }
}


  private async showLoading(message: string): Promise<HTMLIonLoadingElement> {
    const loading = await this.loadingController.create({ 
      message,
      duration: 30000,
      spinner: 'crescent'
    });
    await loading.present();
    return loading;
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: "top",
    });
    await toast.present();
  }
}

export default Tab4Page;