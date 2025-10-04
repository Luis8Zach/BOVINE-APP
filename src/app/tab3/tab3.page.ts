import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReportService } from '../services/report.service';
import { DatabaseService } from '../services/database.service'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
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
  tipo: "Celo" | "Vacunación" | "Inseminación" | "Parto" | "Secado" | "Reto" | "Test Preñez" | "Revisión";
  estado: "Programado" | "Realizado" | "Pendiente" | "Alerta";
  notas: string;
  fechaCreacion: string;
  recordatorio?: boolean;
  diasPostParto?: number;
  protocoloParto?: boolean;
}

interface Animal {
  id: string;
  nombre: string;
  sexo: "Hembra" | "Macho";
  siniga?: string;
  edad?: string;
  ultimoParto?: string;
  estadoReproductivo?: "Limpia" | "Sucia" | "A calor" | "Vacia" | "Preñada" | "Seca" | "Reto";
  diasPostParto?: number;
  ultimaMonta?: string;
  ultimaInseminacion?: string;
  raza?: "Angus" | "Holstein" | "Jersey" | "Hereford" | "Charoláis" | "Simental";
  edadMeses?: number;
  activoReproduccion?: boolean;
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
    IonInput,
    IonSegment,
    IonSegmentButton
  ]
})
export class Tab3Page implements OnInit, OnDestroy {
  eventos: Evento[] = [];
  filteredEventos: Evento[] = [];
  animals: Animal[] = [];

  // Constantes para edades reproductivas
  private readonly EDADES_REPRODUCTIVAS = {
    HEMBRA: {
      MINIMA: 15,
      MAXIMA: 144
    },
    MACHO: {
      MINIMA: 12,
      MAXIMA: 120
    }
  };

  // Filtros
  selectedTipoFilter = "Todos";
  selectedEstadoFilter = "Todos";
  selectedAnimalFilter = "Todos";
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

  // Nuevas propiedades para el ciclo reproductivo
  animalesEnCiclo = 0;
  generarProtocoloParto = true;

  // Modales para parto y reproducción
  isPartoModalOpen = false;
  isReproduccionModalOpen = false;
  isEstadoModalOpen = false;

  // Datos para el formulario de parto
  partoData = {
    animalId: '',
    fecha: this.getLocalDateString(new Date()),
    raza: 'Angus',
    observaciones: ''
  };

  // Datos para el formulario de reproducción
  reproduccionData = {
    tipo: 'Monta natural',
    animalId: '',
    fecha: this.getLocalDateString(new Date()),
    semental: '',
    observaciones: ''
  };

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService,
    private dataShareService: DataShareService,
    private databaseService: DatabaseService,
    private reportService: ReportService,
    private loadingController: LoadingController
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

  async ngOnInit() {
    console.log('🔄 Tab3 - Inicializando...');
    await this.inicializarDatos();
  }

  async inicializarDatos() {
    try {
      await this.loadAnimals();
      await this.loadEventsFromDatabase();
      this.updateStats();
      this.applyFilters();
      this.generateCalendar();
      
      await this.verificarDatosCriticos();
      
    } catch (error) {
      console.error('❌ Error en inicialización:', error);
      await this.showToast('Error cargando datos', 'danger');
    }
  }

  async verificarDatosCriticos() {
    console.log('🔍 Verificando datos críticos...');
    
    const animalesSinEdad = this.animals.filter(a => !a.edadMeses || a.edadMeses === 0);
    if (animalesSinEdad.length > 0) {
      console.warn('⚠️ Animales sin edad:', animalesSinEdad);
      await this.corregirEdadesAnimales();
    }
    
    await this.debugAnimalData();
  }

  async corregirEdadesAnimales() {
    console.log('🛠️ Corrigiendo edades de animales...');
    
    this.animals = this.animals.map(animal => {
      let edadMeses = animal.edadMeses;
      
      if (!edadMeses || edadMeses === 0) {
        const esHembra = animal.sexo === 'Hembra';
        const esMacho = animal.sexo === 'Macho';
        const ultimoCaracter = animal.id.slice(-1);
        const edadBase = parseInt(ultimoCaracter) || 1;
        
        if (esHembra) {
          edadMeses = 24 + (edadBase * 6);
        } else if (esMacho) {
          edadMeses = 36 + (edadBase * 6);
        } else {
          edadMeses = 24;
        }
        
        console.log(`📅 Corrigiendo edad de ${animal.nombre}: ${edadMeses} meses`);
      }
      
      return {
        ...animal,
        edadMeses: edadMeses,
        activoReproduccion: animal.activoReproduccion ?? true,
        estadoReproductivo: animal.estadoReproductivo ?? (animal.sexo === 'Hembra' ? 'Limpia' : undefined)
      };
    });
    
    await this.guardarCorreccionesEnBD();
  }

  async guardarCorreccionesEnBD() {
    try {
      console.log('💾 Guardando correcciones en BD...');
      for (const animal of this.animals) {
        // Crear un objeto compatible con la interfaz del DatabaseService
        const animalParaBD = {
          ...animal,
          // Agregar campos requeridos por DatabaseService.Animal
          siniga: animal.siniga || '',
          madre: '',
          padre: '',
          fechaNacimiento: new Date().toISOString().split('T')[0],
          edad: animal.edad || '',
          estado: 'Bueno' as const,
          observaciones: '',
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString()
        };
        await this.databaseService.updateAnimal(animalParaBD);
      }
      console.log('✅ Correcciones guardadas');
    } catch (error) {
      console.error('❌ Error guardando correcciones:', error);
    }
  }

  // Filtros de animales CORREGIDOS
  get animalsHembras(): Animal[] {
    const hembras = this.animals.filter(animal => animal.sexo === 'Hembra');
    console.log('🔍 Hembras encontradas:', hembras.length);
    return hembras;
  }

  get animalsHembrasReproductivas(): Animal[] {
    const hembrasReproductivas = this.animalsHembras.filter(animal => {
      if (!this.tieneDatosReproductivos(animal)) {
        console.log(`❌ Hembra ${animal.nombre} excluida: falta datos reproductivos`);
        return false;
      }
      
      const cond1 = animal.activoReproduccion !== false;
      const cond2 = animal.estadoReproductivo !== "Seca";
      const cond3 = animal.estadoReproductivo !== "Reto";
      
      const edadMeses = animal.edadMeses || 0;
      const cond4 = edadMeses >= this.EDADES_REPRODUCTIVAS.HEMBRA.MINIMA && 
                   edadMeses <= this.EDADES_REPRODUCTIVAS.HEMBRA.MAXIMA;
      
      const esValida = cond1 && cond2 && cond3 && cond4;
      
      console.log(`🔍 Hembra ${animal.nombre}: ${edadMeses} meses, válida=${esValida}`);
      
      return esValida;
    });
    
    console.log('✅ Hembras reproductivas finales:', hembrasReproductivas.length);
    return hembrasReproductivas;
  }

 // TEMPORAL: Getter menos restrictivo para debug
get animalsMachosReproductivos(): Animal[] {
  const machosReproductivos = this.animals.filter(animal => {
    if (animal.sexo !== "Macho") return false;
    
    // Verificación básica sin filtros estrictos temporalmente
    const cond1 = animal.activoReproduccion !== false;
    const edadMeses = animal.edadMeses || 0;
    const cond2 = edadMeses >= 12; // Mínimo 1 mes temporalmente para debug
    
    console.log(`🔍 Macho ${animal.nombre}: activo=${cond1}, edadOk=${cond2} (${edadMeses} meses)`);
    
    return cond1 && cond2;
  });
  
  console.log('✅ Machos reproductivos (debug):', machosReproductivos.length, machosReproductivos);
  return machosReproductivos;
}
  get animalsMachos(): Animal[] {
    const machos = this.animals.filter(animal => animal.sexo === "Macho");
    console.log('🔍 Todos los machos:', machos.length);
    return machos;
  }

  private tieneDatosReproductivos(animal: Animal): boolean {
    return !!(animal.edadMeses && animal.edadMeses > 0 && animal.estadoReproductivo);
  }

  // Métodos del ciclo de vida
  ionViewWillEnter() {
    console.log('🔄 Tab3 - Recargando datos...');
    this.inicializarDatos();
  }

  ngOnDestroy() {
    console.log('🧹 Tab3 - Limpiando...');
  }

  // Métodos para cargar datos
  async loadAnimals() {
    try {
      console.log('🐄 Cargando animales desde base de datos...');
      
      const dbStatus = await this.databaseService.getDatabaseStatus();
      if (!dbStatus.isReady) {
        console.log('🔄 Base de datos no está lista, inicializando...');
        const initialized = await this.databaseService.initializeDatabase();
        if (!initialized) {
          throw new Error('No se pudo inicializar la base de datos');
        }
      }

      const dbAnimals = await this.databaseService.getAllAnimals();
      if (dbAnimals && dbAnimals.length > 0) {
        this.animals = dbAnimals;
        console.log(`✅ ${dbAnimals.length} animales cargados desde BD`);
      } else {
        console.log('⚠️ Usando animales por defecto');
        this.animals = this.getDefaultAnimals();
      }
      
    } catch (error) {
      console.error('❌ Error cargando animales:', error);
      this.animals = this.getDefaultAnimals();
    }
  }

  private getDefaultAnimals(): Animal[] {
    return [
      { 
        id: "H001", 
        nombre: "Paloma", 
        sexo: "Hembra", 
        edadMeses: 36, 
        activoReproduccion: true, 
        estadoReproductivo: "Limpia" 
      },
      { 
        id: "H002", 
        nombre: "Estrella", 
        sexo: "Hembra", 
        edadMeses: 24, 
        activoReproduccion: true, 
        estadoReproductivo: "Limpia" 
      },
      { 
        id: "M001", 
        nombre: "Toro Bravo", 
        sexo: "Macho", 
        edadMeses: 48, 
        activoReproduccion: true, 
        estadoReproductivo: "Limpia" 
      },
      { 
        id: "H003", 
        nombre: "Bonita", 
        sexo: "Hembra", 
        edadMeses: 18, 
        activoReproduccion: true, 
        estadoReproductivo: "Limpia" 
      },
      { 
        id: "M002", 
        nombre: "Torito", 
        sexo: "Macho", 
        edadMeses: 60, 
        activoReproduccion: true, 
        estadoReproductivo: "Limpia" 
      }
    ];
  }

  // ========== MÉTODOS FALTANTES AGREGADOS ==========

  // Métodos para reportes
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
      duration: 30000,
      spinner: 'crescent'
    });
    await loading.present();
    return loading;
  }

  // Métodos para logout
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

  // Métodos para eventos
  async markAsCompleted(evento: Evento) {
    const index = this.eventos.findIndex((e) => e.id === evento.id);
    if (index !== -1) {
      this.eventos[index].estado = "Realizado";
      
      await this.saveEventsToDatabase();
      
      this.updateStats();
      this.applyFilters();
      this.generateCalendar();
      await this.showToast(`${evento.tipo} marcado como realizado`, "success");
    }
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
      
      try {
        await this.databaseService.deleteEvento(evento.id);
        console.log('✅ Evento eliminado de la BD');
      } catch (error) {
        console.error('❌ Error eliminando evento de BD:', error);
      }
      
      await this.saveEventsToDatabase();
      
      this.updateStats();
      this.applyFilters();
      this.generateCalendar();
      await this.showToast("Evento eliminado correctamente", "success");
    }
  }

  // Métodos para modales
  openEstadoModal() {
    this.showToast('Función de cambio de estado en desarrollo', 'warning');
  }

// Métodos para abrir modales
// Métodos para abrir/cerrar modales
// Métodos para abrir modales - AGREGAR ESTOS
openPartoModal() {
  this.partoData = {
    animalId: '',
    fecha: this.getLocalDateString(new Date()),
    raza: 'Angus',
    observaciones: ''
  };
  
  console.log('📋 Abriendo modal de parto...');
  console.log('Hembras reproductivas disponibles:', this.animalsHembrasReproductivas);
  
  if (this.animalsHembrasReproductivas.length === 0) {
    this.showToast('No hay hembras en edad reproductiva disponibles', 'warning');
  }
  
  this.isPartoModalOpen = true;
}

openReproduccionModal() {
  this.reproduccionData = {
    tipo: 'Monta natural',
    animalId: '',
    fecha: this.getLocalDateString(new Date()),
    semental: '',
    observaciones: ''
  };
  
  console.log('💕 Abriendo modal de reproducción...');
  
  // DEBUG: Verificar machos
  this.debugMachos();
  
  console.log('Hembras disponibles:', this.animalsHembras.length);
  console.log('Machos reproductivos disponibles:', this.animalsMachosReproductivos.length);
  
  if (this.animalsHembras.length === 0) {
    this.showToast('No hay hembras disponibles', 'warning');
  }
  if (this.animalsMachosReproductivos.length === 0) {
    this.showToast('No hay sementales en edad reproductiva disponibles', 'warning');
  }
  
  this.isReproduccionModalOpen = true;
}

closePartoModal() {
  this.isPartoModalOpen = false;
}


  closeReproduccionModal() {
    this.isReproduccionModalOpen = false;
  }

  onAnimalFilterChange(event: any) {
    this.selectedAnimalFilter = event.detail.value;
    this.applyFilters();
  }

  // Métodos para parto y reproducción
  async confirmarParto() {
    if (!this.partoData.animalId || !this.partoData.fecha) {
      await this.showToast('Complete todos los campos', 'warning');
      return;
    }

    const duplicado = await this.validarPartoDuplicado(this.partoData.animalId, this.partoData.fecha);
    if (duplicado) {
      await this.showToast('Ya existe un parto registrado para este animal en la misma fecha', 'warning');
      return;
    }

    const animal = this.animals.find(a => a.id === this.partoData.animalId);
    if (!animal) {
      await this.showToast('Animal no encontrado', 'danger');
      return;
    }

    await this.registrarParto(animal, this.partoData.fecha, this.partoData.observaciones);
    this.isPartoModalOpen = false;
  }

  async confirmarReproduccion() {
    if (!this.reproduccionData.animalId || !this.reproduccionData.fecha) {
      await this.showToast('Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    const duplicado = await this.validarReproduccionDuplicada(
      this.reproduccionData.animalId, 
      this.reproduccionData.fecha
    );
    if (duplicado) {
      await this.showToast('Ya existe un registro de reproducción para este animal en la misma fecha', 'warning');
      return;
    }

    const animal = this.animals.find(a => a.id === this.reproduccionData.animalId);
    if (!animal) {
      await this.showToast('Animal no encontrado', 'danger');
      return;
    }

    await this.registrarReproduccion(
      animal, 
      this.reproduccionData.tipo as "Monta natural" | "Inseminación", 
      this.reproduccionData.fecha, 
      this.reproduccionData.semental
    );
    this.isReproduccionModalOpen = false;
  }

  // Métodos de validación
  async validarPartoDuplicado(animalId: string, fecha: string): Promise<boolean> {
    const partosExistentes = this.eventos.filter(evento => 
      evento.animalId === animalId && 
      evento.tipo === "Parto" && 
      evento.fecha === fecha
    );
    return partosExistentes.length > 0;
  }

  async validarReproduccionDuplicada(animalId: string, fecha: string): Promise<boolean> {
    const reproduccionesExistentes = this.eventos.filter(evento => 
      evento.animalId === animalId && 
      (evento.tipo === "Celo" || evento.tipo === "Inseminación") && 
      evento.fecha === fecha
    );
    return reproduccionesExistentes.length > 0;
  }

  // Métodos para base de datos
  private async loadEventsFromDatabase() {
    try {
      this.eventos = await this.databaseService.getAllEventos();
      console.log(`✅ ${this.eventos.length} eventos cargados desde BD`);
    } catch (error) {
      console.error('❌ Error cargando eventos:', error);
      this.eventos = [];
    }
  }

  private async saveEventsToDatabase() {
    try {
      console.log('💾 Guardando eventos en base de datos...');
      
      const dbReady = await this.databaseService.initializeDatabase();
      if (!dbReady) {
        throw new Error('Base de datos no disponible');
      }
      
      for (const evento of this.eventos) {
        const eventoExistente = await this.databaseService.getEventoById(evento.id);
        
        if (eventoExistente) {
          await this.databaseService.updateEvento(evento);
        } else {
          await this.databaseService.insertEvento(evento);
        }
      }
      
      console.log('✅ Eventos guardados en BD');
      this.dataShareService.notifyDataUpdate();
      
    } catch (error) {
      console.error('❌ Error guardando eventos en BD:', error);
      throw error;
    }
  }

  // Métodos para parto y reproducción
  async registrarParto(animal: Animal, fechaParto: string, observaciones?: string) {
    const eventoParto: Evento = {
      id: `parto-${Date.now()}`,
      fecha: fechaParto,
      animalId: animal.id,
      animalNombre: animal.nombre,
      tipo: "Parto",
      estado: "Realizado",
      notas: observaciones || 'Parto registrado',
      fechaCreacion: this.getLocalDateString(new Date()),
      protocoloParto: true,
      diasPostParto: 0
    };

    this.eventos.push(eventoParto);

    animal.ultimoParto = fechaParto;
    animal.diasPostParto = 0;
    animal.estadoReproductivo = "Limpia";

    await this.generarEventosProtocoloParto(animal, fechaParto);
    await this.saveEventsToDatabase();
    this.updateStats();
    this.applyFilters();
    this.generateCalendar();
  }

  async registrarReproduccion(animal: Animal, tipo: "Monta natural" | "Inseminación", fecha: string, semental?: string) {
    const evento: Evento = {
      id: `repro-${tipo.toLowerCase()}-${Date.now()}`,
      fecha: fecha,
      animalId: animal.id,
      animalNombre: animal.nombre,
      tipo: tipo === "Monta natural" ? "Celo" : "Inseminación",
      estado: "Realizado",
      notas: `${tipo} ${semental ? 'con ' + semental : ''}`,
      fechaCreacion: this.getLocalDateString(new Date()),
      protocoloParto: true
    };

    this.eventos.push(evento);

    if (tipo === "Monta natural") {
      animal.ultimaMonta = fecha;
    } else {
      animal.ultimaInseminacion = fecha;
    }

    await this.generarEventosPostReproduccion(animal, fecha);
    await this.saveEventsToDatabase();
    this.updateStats();
    this.applyFilters();
    this.generateCalendar();
  }



  // ========== MÉTODOS EXISTENTES ==========

// En Tab3Page - Agrega este método para debug
debugMachos() {
  console.log('=== 🐂 DEBUG MACHOS ===');
  
  // Todos los animales
  console.log('📊 Total animales:', this.animals.length);
  console.log('📋 Todos los animales:', this.animals);
  
  // Machos
  console.log('🐂 Total machos:', this.animalsMachos.length);
  console.log('📋 Todos los machos:', this.animalsMachos);
  
  // Machos reproductivos
  console.log('🔍 Machos reproductivos:', this.animalsMachosReproductivos.length);
  console.log('📋 Detalle machos reproductivos:', this.animalsMachosReproductivos);
  
  // Verificar cada macho individualmente
  this.animalsMachos.forEach(macho => {
    const edadMeses = macho.edadMeses || 0;
    const activo = macho.activoReproduccion !== false;
    const edadMinima = 12;
    const edadMaxima = 120;
    const edadOk = edadMeses >= edadMinima && edadMeses <= edadMaxima;
    const esReproductivo = activo && edadOk;
    
    console.log(`🔍 ${macho.nombre} (${macho.id}):`, {
      edadMeses,
      activoReproduccion: macho.activoReproduccion,
      estadoReproductivo: macho.estadoReproductivo,
      edadOk,
      esReproductivo,
      categoria: this.getCategoriaEdad(macho)
    });
  });
}

  // Métodos de utilidad
  getCategoriaEdad(animal: Animal): string {
    if (!animal.edadMeses) return 'Edad desconocida';
    
    const edad = animal.edadMeses;
    const años = Math.floor(edad / 12);
    const meses = edad % 12;
    
    if (animal.sexo === 'Hembra') {
      if (edad < 15) return `📅 ${años}a ${meses}m (Muy joven)`;
      if (edad <= 24) return `👶 ${años}a ${meses}m (Primera monta)`;
      if (edad <= 96) return `🐄 ${años}a ${meses}m (Plena producción)`;
      if (edad <= 144) return `👵 ${años}a ${meses}m (Adulto mayor)`;
      return `🛑 ${años}a ${meses}m (Edad avanzada)`;
    } else {
      if (edad < 12) return `📅 ${años}a ${meses}m (Muy joven)`;
      if (edad <= 24) return `👦 ${años}a ${meses}m (Macho joven)`;
      if (edad <= 96) return `🐂 ${años}a ${meses}m (Adulto reproductivo)`;
      if (edad <= 120) return `👴 ${años}a ${meses}m (Semental mayor)`;
      return `🛑 ${años}a ${meses}m (Edad avanzada)`;
    }
  }

  // Debug methods
  async debugAnimalData() {
    console.log('=== 🐄 DEBUG ANIMAL DATA ===');
    console.log('Total animales:', this.animals.length);
    console.log('Hembras reproductivas:', this.animalsHembrasReproductivas.length);
    console.log('Machos reproductivos:', this.animalsMachosReproductivos.length);
    
    this.animals.forEach(animal => {
      console.log(`${animal.sexo === 'Hembra' ? '🐄' : '🐂'} ${animal.nombre}: ${animal.edadMeses} meses - ${this.getCategoriaEdad(animal)}`);
    });
  }

  // El resto de tus métodos existentes (sin cambios)
  private createLocalDate(year: number, month: number, day: number): Date {
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  generateCalendar() {
    const firstDay = this.createLocalDate(this.currentYear, this.currentMonth, 1);
    const lastDay = this.createLocalDate(this.currentYear, this.currentMonth + 1, 0);

    const startDate = this.createLocalDate(this.currentYear, this.currentMonth, 1);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const endDate = this.createLocalDate(this.currentYear, this.currentMonth + 1, 0);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    this.calendarDays = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateString = this.getLocalDateString(currentDate);
      const dayEvents = this.eventos.filter((evento) => evento.fecha === dateString);
      const today = new Date();
      const isToday = this.isSameDate(currentDate, today);
      const isCurrentMonth = currentDate.getMonth() === this.currentMonth;

      this.calendarDays.push({
        date: new Date(currentDate),
        day: currentDate.getDate(),
        isCurrentMonth,
        isToday,
        events: dayEvents,
        dateString: dateString,
      });

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

  updateStats() {
    this.totalEventos = this.eventos.length;
    this.eventosPendientes = this.eventos.filter((e) =>
      e.estado === "Pendiente" || e.estado === "Programado").length;
    
    const today = this.getLocalDateString(new Date());
    this.eventosHoy = this.eventos.filter((e) => e.fecha === today).length;
    
    this.animalesEnCiclo = this.animalsHembras.filter(animal => 
      animal.ultimoParto && 
      animal.diasPostParto && 
      animal.diasPostParto > 0 && 
      animal.diasPostParto < 300
    ).length;
  }

  applyFilters() {
    this.filteredEventos = this.eventos.filter((evento) => {
      const matchesTipo = this.selectedTipoFilter === "Todos" || evento.tipo === this.selectedTipoFilter;
      const matchesEstado = this.selectedEstadoFilter === "Todos" || evento.estado === this.selectedEstadoFilter;
      const matchesAnimal = this.selectedAnimalFilter === "Todos" || evento.animalId === this.selectedAnimalFilter;
      
      return matchesTipo && matchesEstado && matchesAnimal;
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
    }
  }

  async openAddModal() {
    this.isEditMode = false;
    this.currentEvento = this.getEmptyEvento();
    this.isModalOpen = true;
  }

  async openEditModal(evento: Evento) {
    this.isEditMode = true;
    this.currentEvento = { ...evento };
    this.isModalOpen = true;
  }

  async closeModal() {
    this.isModalOpen = false;
    setTimeout(() => {
      this.currentEvento = this.getEmptyEvento();
      this.isEditMode = false;
    }, 100);
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

    await this.saveEventsToDatabase();
    this.updateStats();
    this.applyFilters();
    this.generateCalendar();
    this.closeModal();
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
      case "Celo": return "#eb445a";
      case "Vacunación": return "#3880ff";
      case "Inseminación": return "#2dd36f";
      case "Parto": return "#ffc409";
      case "Secado": return "#ff6b35";
      case "Reto": return "#9c27b0";
      case "Test Preñez": return "#00bcd4";
      case "Revisión": return "#ff9800";
      default: return "#92949c";
    }
  }

  getEventIcon(tipo: string): string {
    switch (tipo) {
      case "Celo": return "heart-outline";
      case "Vacunación": return "medical-outline";
      case "Inseminación": return "flower-outline";
      case "Parto": return "person-outline";
      default: return "time-outline";
    }
  }

  getStatusColor(estado: string): string {
    switch (estado) {
      case "Realizado": return "success";
      case "Programado": return "primary";
      case "Pendiente": return "warning";
      case "Alerta": return "danger";
      default: return "medium";
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

  // Métodos para protocolos (agregar estos también)
  private async generarEventosProtocoloParto(animal: Animal, fechaParto: string) {
    // Implementación del protocolo de parto
    console.log('📋 Generando protocolo de parto para:', animal.nombre);
  }

  private async generarEventosPostReproduccion(animal: Animal, fechaReproduccion: string) {
    // Implementación del protocolo post-reproducción
    console.log('📋 Generando protocolo post-reproducción para:', animal.nombre);
  }

  private crearEventoProtocolo(animal: Animal, diasPostParto: number, tipo: Evento['tipo'], notas: string, estado: Evento['estado'] = "Programado") {
    // Implementación para crear eventos de protocolo
    console.log('📝 Creando evento de protocolo:', tipo, 'para', animal.nombre);
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