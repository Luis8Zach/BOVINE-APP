import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonFab,
  IonFabButton,
  IonModal,
  IonButtons,
  IonTextarea,
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  AlertController,
  ToastController,
} from "@ionic/angular/standalone"
import { addIcons } from "ionicons"
import {
  calendarOutline,
  addOutline,
  timeOutline,
  heartOutline,
  medicalOutline,
  flowerOutline,
  personOutline,
  createOutline,
  trashOutline,
  closeOutline,
  saveOutline,
  filterOutline,
  listOutline,
  gridOutline,
  checkmarkOutline,
  logOutOutline,
  todayOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from "ionicons/icons"
import  { Router } from "@angular/router"
import  { AuthService } from "../services/auth.service"

interface Evento {
  id: string
  fecha: string
  animalId: string
  animalNombre: string
  tipo: "Celo" | "Vacunación" | "Inseminación" | "Parto"
  estado: "Programado" | "Realizado" | "Pendiente" | "Alerta"
  notas: string
  fechaCreacion: string
  recordatorio?: boolean
}

interface Animal {
  id: string
  nombre: string
  sexo: "Hembra" | "Macho"
}

interface CalendarDay {
  date: Date
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  events: Evento[]
  dateString: string // Agregar esta propiedad para mejor manejo
}

@Component({
  selector: "app-tab3",
  templateUrl: "tab3.page.html",
  styleUrls: ["tab3.page.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonFab,
    IonFabButton,
    IonModal,
    IonButtons,
    IonTextarea,
    IonGrid,
    IonRow,
    IonCol,
    IonSegment,
    IonSegmentButton,
  ],
})
export class Tab3Page implements OnInit {
  eventos: Evento[] = []
  filteredEventos: Evento[] = []
  animals: Animal[] = []

  // Filtros
  selectedTipoFilter = "Todos"
  selectedEstadoFilter = "Todos"
  viewMode = "list"

  // Modal para agregar/editar evento
  isModalOpen = false
  isEditMode = false
  currentEvento: Evento = this.getEmptyEvento()

  // Estadísticas
  totalEventos = 0
  eventosPendientes = 0
  eventosHoy = 0

  // Propiedades del calendario
  currentMonth = new Date().getMonth()
  currentYear = new Date().getFullYear()
  selectedDay: CalendarDay | null = null
  calendarDays: CalendarDay[] = []
  weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService,
  ) {
    addIcons({
      calendarOutline,
      addOutline,
      timeOutline,
      heartOutline,
      medicalOutline,
      flowerOutline,
      personOutline,
      createOutline,
      trashOutline,
      closeOutline,
      saveOutline,
      filterOutline,
      listOutline,
      gridOutline,
      checkmarkOutline,
      logOutOutline,
      todayOutline,
      chevronBackOutline,
      chevronForwardOutline,
    })
  }

  ngOnInit() {
    this.loadAnimals()
    this.loadSampleEvents()
    this.updateStats()
    this.applyFilters()
    this.generateCalendar()
  }

  // Función auxiliar para crear fechas locales sin problemas de zona horaria
  private createLocalDate(year: number, month: number, day: number): Date {
    return new Date(year, month, day, 12, 0, 0, 0) // Usar mediodía para evitar problemas de zona horaria
  }

  // Función auxiliar para obtener la fecha en formato string local
  private getLocalDateString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Función auxiliar para comparar fechas sin problemas de zona horaria
  private isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  generateCalendar() {
    // Crear fechas usando hora local para evitar problemas de zona horaria
    const firstDay = this.createLocalDate(this.currentYear, this.currentMonth, 1)
    const lastDay = this.createLocalDate(this.currentYear, this.currentMonth + 1, 0)

    // Calcular el primer día a mostrar (puede ser del mes anterior)
    const startDate = this.createLocalDate(this.currentYear, this.currentMonth, 1)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    // Calcular el último día a mostrar (puede ser del mes siguiente)
    const endDate = this.createLocalDate(this.currentYear, this.currentMonth + 1, 0)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    this.calendarDays = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateString = this.getLocalDateString(currentDate)

      // Buscar eventos para esta fecha
      const dayEvents = this.eventos.filter((evento) => evento.fecha === dateString)

      // Verificar si es hoy
      const today = new Date()
      const isToday = this.isSameDate(currentDate, today)

      // Verificar si es del mes actual
      const isCurrentMonth = currentDate.getMonth() === this.currentMonth

      this.calendarDays.push({
        date: new Date(currentDate), // Crear una nueva instancia de la fecha
        day: currentDate.getDate(),
        isCurrentMonth,
        isToday,
        events: dayEvents,
        dateString: dateString,
      })

      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11
      this.currentYear--
    } else {
      this.currentMonth--
    }
    this.generateCalendar()
    this.selectedDay = null
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0
      this.currentYear++
    } else {
      this.currentMonth++
    }
    this.generateCalendar()
    this.selectedDay = null
  }

  getMonthName(month: number): string {
    const months = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]
    return months[month]
  }

  selectDay(day: CalendarDay) {
    this.selectedDay = day
    console.log("Día seleccionado:", {
      fecha: day.date,
      dateString: day.dateString,
      day: day.day,
      eventos: day.events.length,
    })
    this.showToast(`Día seleccionado: ${this.formatSelectedDay(day)}`, "primary")
  }

  formatSelectedDay(day: CalendarDay): string {
    // Usar la fecha local directamente
    return day.date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  addEventToSelectedDay() {
    if (this.selectedDay) {
      this.isEditMode = false
      this.currentEvento = this.getEmptyEvento()
      // Usar el dateString que ya está en formato correcto
      this.currentEvento.fecha = this.selectedDay.dateString
      this.isModalOpen = true
    }
  }

  loadAnimals() {
    this.animals = [
      { id: "H001", nombre: "Paloma", sexo: "Hembra" },
      { id: "H002", nombre: "Estrella", sexo: "Hembra" },
      { id: "M001", nombre: "Toro Bravo", sexo: "Macho" },
      { id: "H003", nombre: "Bonita", sexo: "Hembra" },
      { id: "M002", nombre: "Torito", sexo: "Macho" },
      { id: "H004", nombre: "Carmen", sexo: "Hembra" },
      { id: "H005", nombre: "Rosa", sexo: "Hembra" },
      { id: "H006", nombre: "Dulce", sexo: "Hembra" },
      { id: "H007", nombre: "Flor", sexo: "Hembra" },
      { id: "H008", nombre: "Bella", sexo: "Hembra" },
    ]
  }

  loadSampleEvents() {
    this.eventos = [
      {
        id: "1",
        fecha: "2025-01-16",
        animalId: "H001",
        animalNombre: "Paloma",
        tipo: "Celo",
        estado: "Realizado",
        notas: "Detectado automáticamente",
        fechaCreacion: "2025-01-16",
        recordatorio: true,
      },
      {
        id: "2",
        fecha: "2025-01-18",
        animalId: "H002",
        animalNombre: "Estrella",
        tipo: "Vacunación",
        estado: "Programado",
        notas: "Vacuna anual contra brucelosis",
        fechaCreacion: "2025-01-15",
        recordatorio: true,
      },
      {
        id: "3",
        fecha: "2025-01-19",
        animalId: "H003",
        animalNombre: "Bonita",
        tipo: "Inseminación",
        estado: "Pendiente",
        notas: "Primera IA programada",
        fechaCreacion: "2025-01-14",
        recordatorio: true,
      },
      {
        id: "4",
        fecha: "2025-01-22",
        animalId: "H004",
        animalNombre: "Carmen",
        tipo: "Parto",
        estado: "Alerta",
        notas: "Fecha probable de parto",
        fechaCreacion: "2025-01-10",
        recordatorio: true,
      },
      {
        id: "5",
        fecha: "2025-01-20",
        animalId: "H005",
        animalNombre: "Rosa",
        tipo: "Celo",
        estado: "Programado",
        notas: "Seguimiento de ciclo",
        fechaCreacion: "2025-01-15",
        recordatorio: false,
      },
      {
        id: "6",
        fecha: "2025-01-25",
        animalId: "H006",
        animalNombre: "Dulce",
        tipo: "Vacunación",
        estado: "Pendiente",
        notas: "Vacuna de refuerzo",
        fechaCreacion: "2025-01-12",
        recordatorio: true,
      },
      {
        id: "7",
        fecha: "2025-01-28",
        animalId: "H007",
        animalNombre: "Flor",
        tipo: "Parto",
        estado: "Programado",
        notas: "Segundo parto esperado",
        fechaCreacion: "2025-01-08",
        recordatorio: true,
      },
      // Agregar evento para julio para testing
      {
        id: "8",
        fecha: "2025-07-13",
        animalId: "H002",
        animalNombre: "Estrella",
        tipo: "Parto",
        estado: "Pendiente",
        notas: "se programa el parto",
        fechaCreacion: "2025-07-01",
        recordatorio: true,
      },
    ]
  }

  updateStats() {
    this.totalEventos = this.eventos.length
    this.eventosPendientes = this.eventos.filter((e) => e.estado === "Pendiente" || e.estado === "Programado").length

    const today = this.getLocalDateString(new Date())
    this.eventosHoy = this.eventos.filter((e) => e.fecha === today).length
  }

  applyFilters() {
    this.filteredEventos = this.eventos.filter((evento) => {
      const matchesTipo = this.selectedTipoFilter === "Todos" || evento.tipo === this.selectedTipoFilter
      const matchesEstado = this.selectedEstadoFilter === "Todos" || evento.estado === this.selectedEstadoFilter
      return matchesTipo && matchesEstado
    })

    this.filteredEventos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  }

  onTipoFilterChange(event: any) {
    this.selectedTipoFilter = event.detail.value
    this.applyFilters()
  }

  onEstadoFilterChange(event: any) {
    this.selectedEstadoFilter = event.detail.value
    this.applyFilters()
  }

  onViewModeChange(event: any) {
    this.viewMode = event.detail.value
  }

  setViewMode(mode: string) {
    if (mode !== this.viewMode) {
      this.viewMode = mode
      if (mode === "calendar") {
        this.showToast("Vista de calendario seleccionada", "primary")
      } else {
        this.showToast("Vista de lista seleccionada", "primary")
      }
    }
  }

  async openAddModal() {
    this.isEditMode = false
    this.currentEvento = this.getEmptyEvento()
    this.isModalOpen = true
    await this.showToast("Formulario de registro abierto", "primary")
  }

  async openEditModal(evento: Evento) {
    this.isEditMode = true
    this.currentEvento = { ...evento }
    this.isModalOpen = true
    await this.showToast(`Editando evento: ${evento.tipo} - ${evento.animalNombre}`, "primary")
  }

  async closeModal() {
    this.isModalOpen = false
    this.currentEvento = this.getEmptyEvento()
    if (this.isEditMode) {
      await this.showToast("Edición cancelada", "warning")
    } else {
      await this.showToast("Registro cancelado", "warning")
    }
  }

  async saveEvento() {
    if (!this.validateEvento()) {
      await this.showToast("Por favor complete todos los campos requeridos", "warning")
      return
    }

    const animal = this.animals.find((a) => a.id === this.currentEvento.animalId)
    if (animal) {
      this.currentEvento.animalNombre = animal.nombre
    }

    if (this.isEditMode) {
      const index = this.eventos.findIndex((e) => e.id === this.currentEvento.id)
      if (index !== -1) {
        this.eventos[index] = { ...this.currentEvento }
        await this.showToast("Evento actualizado correctamente", "success")
      }
    } else {
      this.currentEvento.id = Date.now().toString()
      this.currentEvento.fechaCreacion = this.getLocalDateString(new Date())
      this.eventos.push({ ...this.currentEvento })
      await this.showToast("Evento registrado correctamente", "success")
    }

    this.updateStats()
    this.applyFilters()
    this.generateCalendar() // Regenerar calendario
    this.closeModal()
  }

  async confirmDelete(evento: Evento) {
    const alert = await this.alertController.create({
      header: "Confirmar Eliminación",
      message: `¿Estás seguro de que deseas eliminar el evento de <strong>${evento.tipo}</strong> para <strong>${evento.animalNombre}</strong>?<br><br>Esta acción no se puede deshacer.`,
      cssClass: "custom-alert",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "alert-button-cancel",
          handler: () => {
            console.log("Eliminación cancelada")
          },
        },
        {
          text: "Aceptar",
          cssClass: "alert-button-confirm",
          handler: () => {
            this.deleteEvento(evento)
          },
        },
      ],
    })

    await alert.present()
  }

  async deleteEvento(evento: Evento) {
    const index = this.eventos.findIndex((e) => e.id === evento.id)
    if (index !== -1) {
      this.eventos.splice(index, 1)
      this.updateStats()
      this.applyFilters()
      this.generateCalendar() // Regenerar calendario
      await this.showToast("Evento eliminado correctamente", "success")
    }
  }

  async markAsCompleted(evento: Evento) {
    const index = this.eventos.findIndex((e) => e.id === evento.id)
    if (index !== -1) {
      this.eventos[index].estado = "Realizado"
      this.updateStats()
      this.applyFilters()
      this.generateCalendar() // Regenerar calendario
      await this.showToast(`${evento.tipo} marcado como realizado`, "success")
    }
  }

  validateEvento(): boolean {
    return !!(
      this.currentEvento.fecha &&
      this.currentEvento.animalId &&
      this.currentEvento.tipo &&
      this.currentEvento.estado
    )
  }

  getEmptyEvento(): Evento {
    return {
      id: "",
      fecha: "",
      animalId: "",
      animalNombre: "",
      tipo: "Celo",
      estado: "Programado",
      notas: "",
      fechaCreacion: "",
      recordatorio: true,
    }
  }

  getEventColor(tipo: string): string {
    switch (tipo) {
      case "Celo":
        return "#eb445a"
      case "Vacunación":
        return "#3880ff"
      case "Inseminación":
        return "#2dd36f"
      case "Parto":
        return "#ffc409"
      default:
        return "#92949c"
    }
  }

  getEventIcon(tipo: string): string {
    switch (tipo) {
      case "Celo":
        return "heart-outline"
      case "Vacunación":
        return "medical-outline"
      case "Inseminación":
        return "flower-outline"
      case "Parto":
        return "person-outline"
      default:
        return "time-outline"
    }
  }

  getStatusColor(estado: string): string {
    switch (estado) {
      case "Realizado":
        return "success"
      case "Programado":
        return "primary"
      case "Pendiente":
        return "warning"
      case "Alerta":
        return "danger"
      default:
        return "medium"
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString + "T12:00:00") // Agregar hora para evitar problemas de zona horaria
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (this.isSameDate(date, today)) {
      return "Hoy"
    } else if (this.isSameDate(date, tomorrow)) {
      return "Mañana"
    } else {
      return date.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    }
  }

  isEventOverdue(evento: Evento): boolean {
    const today = new Date()
    const eventDate = new Date(evento.fecha + "T12:00:00") // Agregar hora para evitar problemas de zona horaria
    return eventDate < today && evento.estado !== "Realizado"
  }

  async logout() {
    const alert = await this.alertController.create({
      header: "Cerrar Sesión",
      message: "¿Estás seguro de que deseas cerrar sesión?<br><br>Se perderán los datos no guardados.",
      cssClass: "custom-alert",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "alert-button-cancel",
          handler: () => {
            console.log("Logout cancelado")
          },
        },
        {
          text: "Aceptar",
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

export default Tab3Page
