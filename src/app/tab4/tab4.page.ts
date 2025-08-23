import { Component, type OnInit } from "@angular/core"
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

interface Notification {
  id: string
  tipo: "Celo" | "Vacunación" | "Inseminación" | "Parto" | "Sistema"
  titulo: string
  mensaje: string
  fecha: string
  hora: string
  leida: boolean
  prioridad: "Alta" | "Media" | "Baja"
  animalId?: string
  animalNombre?: string
}

interface NotificationSettings {
  celoAlerts: boolean
  vacunacionReminders: boolean
  inseminacionTracking: boolean
  partoAlerts: boolean
  systemNotifications: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
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
  ],
})
export class Tab4Page implements OnInit {
  currentUser = ""
  activeTab = "notifications" // 'notifications', 'settings', 'info'

  notifications: Notification[] = []
  unreadCount = 0

  settings: NotificationSettings = {
    celoAlerts: true,
    vacunacionReminders: true,
    inseminacionTracking: true,
    partoAlerts: true,
    systemNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
  }

  // Información del sistema
  appInfo = {
    version: "1.0.0",
    buildDate: "18 Enero 2025",
    database: "SQLite Local",
    totalAnimals: 44,
    totalEvents: 12,
    lastSync: "Modo Offline",
    storageUsed: "2.3 MB",
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
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

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser() || "Usuario"
    this.loadNotifications()
    this.loadSettings()
    this.updateUnreadCount()
  }

  loadNotifications() {
    // Cargar notificaciones de ejemplo (en producción desde SQLite)
    this.notifications = [
      {
        id: "1",
        tipo: "Celo",
        titulo: "Celo Detectado",
        mensaje: "Paloma (H001) está en celo. Considerar inseminación artificial.",
        fecha: "2025-01-18",
        hora: "14:30",
        leida: false,
        prioridad: "Alta",
        animalId: "H001",
        animalNombre: "Paloma",
      },
      {
        id: "2",
        tipo: "Vacunación",
        titulo: "Vacunación Pendiente",
        mensaje: "Estrella (H002) tiene vacunación programada para mañana.",
        fecha: "2025-01-18",
        hora: "09:15",
        leida: false,
        prioridad: "Media",
        animalId: "H002",
        animalNombre: "Estrella",
      },
      {
        id: "3",
        tipo: "Parto",
        titulo: "Alerta de Parto",
        mensaje: "Carmen (H004) tiene fecha probable de parto en 3 días.",
        fecha: "2025-01-17",
        hora: "16:45",
        leida: true,
        prioridad: "Alta",
        animalId: "H004",
        animalNombre: "Carmen",
      },
      {
        id: "4",
        tipo: "Sistema",
        titulo: "Respaldo Recomendado",
        mensaje: "Se recomienda hacer respaldo de la base de datos.",
        fecha: "2025-01-17",
        hora: "08:00",
        leida: true,
        prioridad: "Baja",
      },
      {
        id: "5",
        tipo: "Inseminación",
        titulo: "IA Programada",
        mensaje: "Bonita (H003) tiene inseminación artificial programada.",
        fecha: "2025-01-16",
        hora: "11:20",
        leida: false,
        prioridad: "Media",
        animalId: "H003",
        animalNombre: "Bonita",
      },
    ]
  }

  loadSettings() {
    // Cargar configuraciones guardadas (en producción desde localStorage o SQLite)
    const savedSettings = localStorage.getItem("bovine_app_settings")
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) }
    }
  }

  saveSettings() {
    localStorage.setItem("bovine_app_settings", JSON.stringify(this.settings))
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter((n) => !n.leida).length
  }

  onTabChange(event: any) {
    this.activeTab = event.detail.value
  }

  markAsRead(notification: Notification) {
    const index = this.notifications.findIndex((n) => n.id === notification.id)
    if (index !== -1) {
      this.notifications[index].leida = true
      this.updateUnreadCount()
    }
  }

  markAllAsRead() {
    this.notifications.forEach((n) => (n.leida = true))
    this.updateUnreadCount()
    this.showToast("Todas las notificaciones marcadas como leídas", "success")
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
          handler: () => {
            const index = this.notifications.findIndex((n) => n.id === notification.id)
            if (index !== -1) {
              this.notifications.splice(index, 1)
              this.updateUnreadCount()
              this.showToast("Notificación eliminada", "success")
            }
          },
        },
      ],
    })

    await alert.present()
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
          handler: () => {
            this.notifications = []
            this.updateUnreadCount()
            this.showToast("Todas las notificaciones eliminadas", "success")
          },
        },
      ],
    })

    await alert.present()
  }

  onSettingChange(setting: keyof NotificationSettings) {
    this.saveSettings()
    this.showToast("Configuración actualizada", "success")
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
            }
            this.saveSettings()
            this.showToast("Configuración restablecida", "success")
          },
        },
      ],
    })

    await alert.present()
  }

  async exportData() {
    const alert = await this.alertController.create({
      header: "Exportar Datos",
      message: "Esta función exportará todos los datos de la aplicación.",
      cssClass: "custom-alert",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "alert-button-cancel",
        },
        {
          text: "Exportar",
          cssClass: "alert-button-confirm",
          handler: () => {
            // Aquí implementarías la lógica de exportación
            this.showToast("Función de exportación en desarrollo", "warning")
          },
        },
      ],
    })

    await alert.present()
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
            this.authService.logout()
            this.router.navigate(["/login"], { replaceUrl: true })
          },
        },
      ],
    })

    await alert.present()
  }

  getNotificationIcon(tipo: string): string {
    switch (tipo) {
      case "Celo":
        return "heart-outline"
      case "Vacunación":
        return "medical-outline"
      case "Inseminación":
        return "flower-outline"
      case "Parto":
        return "person-outline"
      case "Sistema":
        return "settings-outline"
      default:
        return "notifications-outline"
    }
  }

  getNotificationColor(tipo: string): string {
    switch (tipo) {
      case "Celo":
        return "#eb445a"
      case "Vacunación":
        return "#3880ff"
      case "Inseminación":
        return "#2dd36f"
      case "Parto":
        return "#ffc409"
      case "Sistema":
        return "#92949c"
      default:
        return "#92949c"
    }
  }

  getPriorityColor(prioridad: string): string {
    switch (prioridad) {
      case "Alta":
        return "danger"
      case "Media":
        return "warning"
      case "Baja":
        return "medium"
      default:
        return "medium"
    }
  }

  formatNotificationTime(fecha: string, hora: string): string {
    const notificationDate = new Date(`${fecha}T${hora}`)
    const now = new Date()
    const diffMs = now.getTime() - notificationDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`
    } else if (diffHours > 0) {
      return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`
    } else {
      return "Hace unos minutos"
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: "top",
    })
    await toast.present()
  }
}

export default Tab4Page
