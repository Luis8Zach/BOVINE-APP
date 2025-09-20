import { Component, OnInit } from '@angular/core';
import { ReportService } from '../services/report.service';
import { DatabaseService } from '../services/database.service'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButton, 
  IonIcon, 
  IonSelect, 
  IonSelectOption, 
  IonBadge, 
  IonModal, 
  IonButtons, 
  IonTextarea, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonItem, 
  IonLabel, 
  IonInput,
  AlertController,
  ToastController,
  LoadingController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
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
  listOutline,
  gridOutline,
  checkmarkOutline,
  logOutOutline,
  todayOutline,
  chevronBackOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DataShareService } from '../services/data-share.service';

interface Evento {
  id: string;
  fecha: string;
  animalId: string;
  animalNombre: string;
  tipo: "Celo" | "Vacunación" | "Inseminación" | "Parto";
  estado: "Programado" | "Realizado" | "Pendiente" | "Alerta";
  notas: string;
  fechaCreacion: string;
  recordatorio?: boolean;
}

interface Animal {
  id: string;
  nombre: string;
  sexo: "Hembra" | "Macho";
  siniga?: string; // Añadido para compatibilidad
  edad?: string;   // Añadido para compatibilidad
}

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Evento[];
  dateString: string;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonModal,
    IonButtons,
    IonTextarea,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonLabel,
    IonInput
  ]
})
export class Tab3Page implements OnInit {
  eventos: Evento[] = [];
  filteredEventos: Evento[] = [];
  animals: Animal[] = [];

  // Filtros
  selectedTipoFilter = "Todos";
  selectedEstadoFilter = "Todos";
  viewMode = "list";

  // Modal para agregar/editar evento
  isModalOpen = false;
  isEditMode = false;
  currentEvento: Evento = this.getEmptyEvento();

  // Estadísticas
  totalEventos = 0;
  eventosPendientes = 0;
  eventosHoy = 0;

  // Propiedades del calendario
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  selectedDay: CalendarDay | null = null;
  calendarDays: CalendarDay[] = [];
  weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService,
    private dataShareService: DataShareService,
    private databaseService: DatabaseService,
    private reportService: ReportService,
  private loadingController: LoadingController // Añade esto
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
      listOutline,
      gridOutline,
      checkmarkOutline,
      logOutOutline,
      todayOutline,
      chevronBackOutline,
      chevronForwardOutline
    });
  }

   //método temporal para debug
debugModalState() {
  console.log('Modal state - isOpen:', this.isModalOpen);
  console.log('Modal state - isEditMode:', this.isEditMode);
  console.log('Modal state - currentEvento:', this.currentEvento);
}

  async ngOnInit() {
    await this.loadAnimals();
    this.loadEventsFromStorage();
    this.updateStats();
    this.applyFilters();
    this.generateCalendar();
    this.cargarEventoParaGestionar();
    this.debugModalState();
    this.cargarEventoParaGestionar();
    await this.loadEventsFromDatabase();
  }

  // Cargar eventos desde localStorage
  private loadEventsFromStorage() {
    const eventosGuardados = localStorage.getItem('eventosTab3');
    this.eventos = eventosGuardados ? JSON.parse(eventosGuardados) : [];
  }

  // Guardar eventos en localStorage
 private async saveEventsToStorage() {
  try {
    // 1. Primero guardar en la base de datos
    await this.syncEventsToDatabase();
    
    // 2. Luego actualizar localStorage con los datos de la BD
    // (esto asegura que siempre estén sincronizados)
    const dbEventos = await this.databaseService.getAllEventos();
    if (dbEventos && dbEventos.length > 0) {
      localStorage.setItem('eventosTab3', JSON.stringify(dbEventos));
      this.eventos = dbEventos; // Actualizar el array local
    }
    
    // 3. Notificar a Tab1 que los datos han cambiado
    this.dataShareService.notifyDataUpdate();
    
  } catch (error) {
    console.error('❌ Error guardando eventos:', error);
    // Fallback: guardar solo en localStorage
    localStorage.setItem('eventosTab3', JSON.stringify(this.eventos));
  }
}


  // Método para obtener animales por defecto
  private getDefaultAnimals(): Animal[] {
    return [
      { id: "H001", nombre: "Paloma", sexo: "Hembra" },
      { id: "H002", nombre: "Estrella", sexo: "Hembra" },
      { id: "M001", nombre: "Toro Bravo", sexo: "Macho" },
      { id: "H003", nombre: "Bonita", sexo: "Hembra" },
      { id: "M002", nombre: "Torito", sexo: "Macho" },
      { id: "H004", nombre: "Carmen", sexo: "Hembra" },
      { id: "H005", nombre: "Rosa", sexo: "Hembra" },
      { id: "H006", nombre: "Dulce", sexo: "Hembra" },
      { id: "H007", nombre: "Flor", sexo: "Hembra" },
      { id: "H008", nombre: "Bella", sexo: "Hembra" }
    ];
  }

  // Función auxiliar para crear fechas locales sin problemas de zona horaria
  private createLocalDate(year: number, month: number, day: number): Date {
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  // Función auxiliar para obtener la fecha en formato string local
  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Función auxiliar para comparar fechas sin problemas de zona horaria
  private isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  generateCalendar() {
    // Crear fechas usando hora local para evitar problemas de zona horaria
    const firstDay = this.createLocalDate(this.currentYear, this.currentMonth, 1);
    const lastDay = this.createLocalDate(this.currentYear, this.currentMonth + 1, 0);

    // Calcular el primer día a mostrar (puede ser del mes anterior)
    const startDate = this.createLocalDate(this.currentYear, this.currentMonth, 1);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // Calcular el último día a mostrar (puede ser del mes siguiente)
    const endDate = this.createLocalDate(this.currentYear, this.currentMonth + 1, 0);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    this.calendarDays = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateString = this.getLocalDateString(currentDate);
      
      // Buscar eventos para esta fecha
      const dayEvents = this.eventos.filter((evento) => evento.fecha === dateString);
      
      // Verificar si es hoy
      const today = new Date();
      const isToday = this.isSameDate(currentDate, today);
      
      // Verificar si es del mes actual
      const isCurrentMonth = currentDate.getMonth() === this.currentMonth;

      this.calendarDays.push({
        date: new Date(currentDate),
        day: currentDate.getDate(),
        isCurrentMonth,
        isToday,
        events: dayEvents,
        dateString: dateString,
      });

      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
    this.selectedDay = null;
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
    this.selectedDay = null;
  }

  getMonthName(month: number): string {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return months[month];
  }

  selectDay(day: CalendarDay) {
    this.selectedDay = day;
    this.showToast(`Día seleccionado: ${this.formatSelectedDay(day)}`, "primary");
  }

  formatSelectedDay(day: CalendarDay): string {
    return day.date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  addEventToSelectedDay() {
    if (this.selectedDay) {
      this.isEditMode = false;
      this.currentEvento = this.getEmptyEvento();
      this.currentEvento.fecha = this.selectedDay.dateString;
      this.isModalOpen = true;
    }
  }

  async loadAnimals() {
    try {
      console.log('🔄 Cargando animales desde base de datos...');
      
      // Intentar inicializar la base de datos
      const dbStatus = await this.databaseService.getDatabaseStatus();
      
      if (!dbStatus.isReady) {
        console.log('📋 Base de datos no está lista, inicializando...');
        const initialized = await this.databaseService.initializeDatabase();
        if (!initialized) {
          throw new Error('No se pudo inicializar la base de datos');
        }
      }
      
      // Obtener animales
      const dbAnimals = await this.databaseService.getAllAnimals();
      
      if (dbAnimals && dbAnimals.length > 0) {
        this.animals = dbAnimals;
        console.log(`✅ ${dbAnimals.length} animales cargados desde BD`);
      } else {
        // Si no hay animales en BD, usar datos por defecto
        this.animals = this.getDefaultAnimals();
        console.log('ℹ️ Usando animales por defecto');
      }
      
    } catch (error) {
      console.error('❌ Error cargando animales:', error);
      // Fallback a datos de ejemplo
      this.animals = this.getDefaultAnimals();
      await this.showToast('Error cargando animales. Usando datos de ejemplo.', 'warning');
    }
  }

  updateStats() {
    this.totalEventos = this.eventos.length;
    this.eventosPendientes = this.eventos.filter((e) => 
      e.estado === "Pendiente" || e.estado === "Programado").length;
    
    const today = this.getLocalDateString(new Date());
    this.eventosHoy = this.eventos.filter((e) => e.fecha === today).length;
  }

  applyFilters() {
    this.filteredEventos = this.eventos.filter((evento) => {
      const matchesTipo = this.selectedTipoFilter === "Todos" || evento.tipo === this.selectedTipoFilter;
      const matchesEstado = this.selectedEstadoFilter === "Todos" || evento.estado === this.selectedEstadoFilter;
      return matchesTipo && matchesEstado;
    });

    this.filteredEventos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }

  onTipoFilterChange(event: any) {
    this.selectedTipoFilter = event.detail.value;
    this.applyFilters();
  }

  onEstadoFilterChange(event: any) {
    this.selectedEstadoFilter = event.detail.value;
    this.applyFilters();
  }

  setViewMode(mode: string) {
    if (mode !== this.viewMode) {
      this.viewMode = mode;
      if (mode === "calendar") {
        this.showToast("Vista de calendario seleccionada", "primary");
      } else {
        this.showToast("Vista de lista seleccionada", "primary");
      }
    }
  }

//Metodo para ver la obcion de reporte 
async mostrarOpcionesReporte() {
  const alert = await this.alertController.create({
    header: 'Generar Reporte',
    message: 'Seleccione el tipo de reporte:',
    buttons: [
      {
        text: 'Semana Actual (PDF)',
        handler: () => this.generarReporteSemanal('actual', 'pdf')
      },
      {
        text: 'Semana Actual (Excel)',
        handler: () => this.generarReporteSemanal('actual', 'excel')
      },
      {
        text: 'Semana Pasada (PDF)',
        handler: () => this.generarReporteSemanal('pasada', 'pdf')
      },
      {
        text: 'Semana Pasada (Excel)',
        handler: () => this.generarReporteSemanal('pasada', 'excel')
      },
      {
        text: 'Cancelar',
        role: 'cancel'
      }
    ]
  });

  await alert.present();
}

async generarReporteSemanal(tipo: string, formato: string) {
  let rango: any;
  
  if (tipo === 'actual') {
    rango = this.reportService.getSemanaActual();
  } else {
    rango = this.reportService.getSemanaPasada();
  }

  const loading = await this.showLoading('Generando reporte...');
  
  try {
    const reporte = await this.reportService.generarReporteSemanal(
      rango.inicio, 
      rango.fin
    );

    if (formato === 'pdf') {
      await this.reportService.generarPDF(reporte);
    } else {
      await this.reportService.generarExcel(reporte);
    }

    await loading.dismiss();
    await this.showToast('Reporte generado exitosamente', 'success');
    
  } catch (error) {
    await loading.dismiss();
    console.error('Error generando reporte:', error);
    await this.showToast('Error al generar el reporte', 'danger');
  }
}

private async showLoading(message: string): Promise<HTMLIonLoadingElement> {
  const loading = await this.loadingController.create({ 
    message,
    duration: 30000, // 30 segundos máximo
    spinner: 'crescent'
  });
  await loading.present();
  return loading;
}

  

  async openAddModal() {
    this.isEditMode = false;
    this.currentEvento = this.getEmptyEvento();
    this.isModalOpen = true;
    await this.showToast("Formulario de registro abierto", "primary");
  }

  async openEditModal(evento: Evento) {
    this.isEditMode = true;
    this.currentEvento = { ...evento };
    this.isModalOpen = true;
    await this.showToast(`Editando evento: ${evento.tipo} - ${evento.animalNombre}`, "primary");
  }

async closeModal() {
  console.log('Cerrando modal...');
  this.isModalOpen = false;
  
  // Resetear el evento actual después de cerrar el modal
  setTimeout(() => {
    this.currentEvento = this.getEmptyEvento();
    this.isEditMode = false;
  }, 100);
  
  if (this.isEditMode) {
    await this.showToast("Edición cancelada", "warning");
  } else {
    await this.showToast("Registro cancelado", "warning");
  }
}

  async saveEvento() {
  if (!this.validateEvento()) {
    await this.showToast("Por favor complete todos los campos requeridos", "warning");
    return;
  }

  const animal = this.animals.find((a) => a.id === this.currentEvento.animalId);
  if (animal) {
    this.currentEvento.animalNombre = animal.nombre;
  }

  if (this.isEditMode) {
    const index = this.eventos.findIndex((e) => e.id === this.currentEvento.id);
    if (index !== -1) {
      this.eventos[index] = { ...this.currentEvento };
      await this.showToast("Evento actualizado correctamente", "success");
    }
  } else {
    this.currentEvento.id = Date.now().toString();
    this.currentEvento.fechaCreacion = this.getLocalDateString(new Date());
    this.eventos.push({ ...this.currentEvento });
    await this.showToast("Evento registrado correctamente", "success");
  }

  // Guardar y sincronizar inmediatamente
  await this.saveEventsToStorage();
  
  // Forzar actualización de la vista
  this.updateStats();
  this.applyFilters();
  this.generateCalendar();
  
  this.closeModal();
}

// En tab3.page.ts
async forceReloadEvents() {
  console.log('🔄 Forzando recarga de eventos...');
  await this.loadEventsFromDatabase();
  this.updateStats();
  this.applyFilters();
  this.generateCalendar();
}

// Llama a este método cuando navegues a Tab3
ionViewDidEnter() {
  console.log('📋 Tab3 became visible - refreshing events');
  this.forceReloadEvents();
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
            console.log("Eliminación cancelada");
          },
        },
        {
          text: "Aceptar",
          cssClass: "alert-button-confirm",
          handler: () => {
            this.deleteEvento(evento);
          }
        },
      ],
    });

    await alert.present();
  }

  async deleteEvento(evento: Evento) {
  const index = this.eventos.findIndex((e) => e.id === evento.id);
  if (index !== -1) {
    this.eventos.splice(index, 1);
    this.updateStats();
    this.applyFilters();
    this.generateCalendar();
    
    try {
      // Eliminar de la base de datos
      await this.databaseService.deleteEvento(evento.id);
      console.log('✅ Evento eliminado de la BD');
    } catch (error) {
      console.error('❌ Error eliminando evento de BD:', error);
    }
    
    await this.saveEventsToStorage();
    await this.showToast("Evento eliminado correctamente", "success");
  }
}
// Nuevo método para sincronizar con la base de datos
private async syncEventsToDatabase() {
  try {
    console.log('🔄 Sincronizando eventos con base de datos...');
    
    const dbReady = await this.databaseService.initializeDatabase();
    if (!dbReady) {
      throw new Error('Base de datos no disponible para sincronización');
    }
    
    // Obtener eventos actuales de la BD para comparar
    const eventosBD = await this.databaseService.getAllEventos();
    
    for (const evento of this.eventos) {
      try {
        const eventoExistente = eventosBD.find(e => e.id === evento.id);
        
        if (eventoExistente) {
          // Actualizar solo si hay cambios
          if (this.hasEventChanged(evento, eventoExistente)) {
            await this.databaseService.updateEvento(evento);
            console.log('📝 Evento actualizado en BD:', evento.id);
          }
        } else {
          // Insertar nuevo evento
          await this.databaseService.insertEvento(evento);
          console.log('📝 Nuevo evento insertado en BD:', evento.id);
        }
      } catch (error) {
        console.error(`❌ Error sincronizando evento ${evento.id}:`, error);
      }
    }
    
    console.log('✅ Sincronización completada');
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    throw error;
  }
}

// Método auxiliar para detectar cambios
private hasEventChanged(evento1: any, evento2: any): boolean {
  return (
    evento1.fecha !== evento2.fecha ||
    evento1.animalId !== evento2.animalId ||
    evento1.tipo !== evento2.tipo ||
    evento1.estado !== evento2.estado ||
    evento1.notas !== evento2.notas ||
    evento1.recordatorio !== evento2.recordatorio
  );
}



  async markAsCompleted(evento: Evento) {
    const index = this.eventos.findIndex((e) => e.id === evento.id);
    if (index !== -1) {
      this.eventos[index].estado = "Realizado";
      this.updateStats();
      this.applyFilters();
      this.generateCalendar();
      this.saveEventsToStorage(); // Guardar en localStorage y notificar
      await this.showToast(`${evento.tipo} marcado como realizado`, "success");
    }
  }

  validateEvento(): boolean {
    return !!(
      this.currentEvento.fecha &&
      this.currentEvento.animalId &&
      this.currentEvento.tipo &&
      this.currentEvento.estado
    );
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
    };
  }

  getEventColor(tipo: string): string {
    switch (tipo) {
      case "Celo":
        return "#eb445a";
      case "Vacunación":
        return "#3880ff";
      case "Inseminación":
        return "#2dd36f";
      case "Parto":
        return "#ffc409";
      default:
        return "#92949c";
    }
  }

  getEventIcon(tipo: string): string {
    switch (tipo) {
      case "Celo":
        return "heart-outline";
      case "Vacunación":
        return "medical-outline";
      case "Inseminación":
        return "flower-outline";
      case "Parto":
        return "person-outline";
      default:
        return "time-outline";
    }
  }

  getStatusColor(estado: string): string {
    switch (estado) {
      case "Realizado":
        return "success";
      case "Programado":
        return "primary";
      case "Pendiente":
        return "warning";
      case "Alerta":
        return "danger";
      default:
        return "medium";
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString + "T12:00:00");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (this.isSameDate(date, today)) {
      return "Hoy";
    } else if (this.isSameDate(date, tomorrow)) {
      return "Mañana";
    } else {
      return date.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
  }

  isEventOverdue(evento: Evento): boolean {
    const today = new Date();
    const eventDate = new Date(evento.fecha + "T12:00:00");
    return eventDate < today && evento.estado !== "Realizado";
  }

//método cargarEventoParaGestionar para mejor búsqueda:
private cargarEventoParaGestionar() {
  const eventoGuardado = localStorage.getItem('eventoParaGestionar');
  if (eventoGuardado) {
    try {
      const evento = JSON.parse(eventoGuardado);
      console.log('Evento recibido desde Tab1:', evento);
      
      // Esperar a que la UI esté completamente renderizada
      setTimeout(() => {
        // Primero cerrar cualquier modal abierto
        this.isModalOpen = false;
        
        // Esperar un poco más antes de abrir el nuevo modal
        setTimeout(() => {
          let eventoExistente = this.eventos.find(e => e.id === evento.id);
          
          if (!eventoExistente) {
            eventoExistente = this.eventos.find(e => 
              e.fecha === evento.fecha && 
              e.animalId === evento.animalId && 
              e.tipo === evento.tipo
            );
          }
          
          if (eventoExistente) {
            this.openEditModal(eventoExistente);
          } else {
            this.isEditMode = false;
            this.currentEvento = this.getEmptyEvento();
            this.currentEvento.fecha = evento.fecha;
            this.currentEvento.animalId = evento.animalId;
            this.currentEvento.animalNombre = evento.animalNombre;
            this.currentEvento.tipo = evento.tipo;
            this.currentEvento.estado = evento.estado;
            this.currentEvento.notas = evento.notas || '';
            this.isModalOpen = true;
          }
          
          localStorage.removeItem('eventoParaGestionar');
        }, 300);
      }, 800); // Tiempo suficiente para que Tab3 se cargue completamente
      
    } catch (error) {
      console.error('Error al parsear evento desde Tab1:', error);
      localStorage.removeItem('eventoParaGestionar');
    }
  }
}

// Reemplaza el método loadEventsFromDatabase
private async loadEventsFromDatabase() {
  try {
    console.log('🔄 Cargando eventos desde base de datos...');
    
    const dbReady = await this.databaseService.initializeDatabase();
    if (!dbReady) {
      throw new Error('Base de datos no disponible');
    }
    
    const dbEventos = await this.databaseService.getAllEventos();
    
    if (dbEventos && dbEventos.length > 0) {
      // USAR SOLO los eventos de la base de datos
      this.eventos = dbEventos;
      console.log(`✅ ${this.eventos.length} eventos cargados desde BD`);
      
      // Sincronizar localStorage con la BD (para mantener consistencia)
      localStorage.setItem('eventosTab3', JSON.stringify(this.eventos));
    } else {
      // Solo si no hay eventos en BD, cargar desde localStorage
      this.loadEventsFromStorage();
      console.log('ℹ️ No hay eventos en BD, usando localStorage');
      
      // Y luego migrar estos eventos a la BD
      await this.migrateEventsToDatabase();
    }
  } catch (error) {
    console.error('❌ Error cargando eventos desde BD:', error);
    // Fallback a localStorage
    this.loadEventsFromStorage();
  }
}

// En tab3.page.ts
private async migrateEventsToDatabase(): Promise<void> {
  try {
    const eventosStorage = localStorage.getItem('eventosTab3');
    if (eventosStorage) {
      const eventos = JSON.parse(eventosStorage);
      console.log(`🚚 Migrando ${eventos.length} eventos a la base de datos...`);
      
      const dbReady = await this.databaseService.initializeDatabase();
      if (!dbReady) {
        console.log('❌ BD no disponible para migración');
        return;
      }
      
      let migratedCount = 0;
      let skippedCount = 0;
      
      for (const evento of eventos) {
        try {
          // Verificar si ya existe en BD por múltiples criterios
          const eventoExistente = await this.databaseService.getEventoById(evento.id);
          
          // Si no existe por ID, verificar por contenido
          if (!eventoExistente) {
            // Buscar por fecha, animal y tipo para evitar duplicados
            const eventosSimilares = await this.databaseService.getAllEventos();
            const existeSimilar = eventosSimilares.some(e => 
              e.fecha === evento.fecha && 
              e.animalId === evento.animalId && 
              e.tipo === evento.tipo
            );
            
            if (!existeSimilar) {
              await this.databaseService.insertEvento(evento);
              migratedCount++;
            } else {
              skippedCount++;
              console.log('⏭️ Evento similar ya existe, omitiendo:', evento);
            }
          } else {
            skippedCount++;
            console.log('⏭️ Evento ya existe en BD, omitiendo:', evento.id);
          }
        } catch (error) {
          console.error(`❌ Error migrando evento ${evento.id}:`, error);
        }
      }
      
      console.log(`✅ ${migratedCount} eventos migrados, ${skippedCount} omitidos`);
      
      // Una vez migrados, limpiar localStorage para evitar duplicados futuros
      if (migratedCount > 0) {
        localStorage.removeItem('eventosTab3');
        console.log('🧹 localStorage limpiado después de migración');
      }
    }
  } catch (error) {
    console.error('❌ Error en migración de eventos:', error);
  }
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
            console.log("Logout cancelado");
          },
        },
        {
          text: "Aceptar",
          cssClass: "alert-button-confirm",
          handler: () => {
            this.authService.logout();
            this.router.navigate(['/login'], { replaceUrl: true });
          },
        },
      ]
    });

    await alert.present();
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

export default Tab3Page;