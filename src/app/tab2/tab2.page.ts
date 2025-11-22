import { IonicModule } from "@ionic/angular"
import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { LoadingController } from '@ionic/angular/standalone'
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonGrid,
  IonRow,
  IonCol,
  IonModal,
  IonButtons,
  IonBadge,
  IonSearchbar,
  AlertController,
  ToastController,
  IonFab,
  IonFabButton,
} from "@ionic/angular/standalone"
import { addIcons } from "ionicons"
import {
  pawOutline,
  addOutline,
  searchOutline,
  femaleOutline,
  maleOutline,
  createOutline,
  trashOutline,
  closeOutline,
  saveOutline,
  arrowBackOutline,
  logOutOutline,
} from "ionicons/icons"
import { Router } from "@angular/router"
import { AuthService } from "../services/auth.service"
import { DatabaseService, Animal } from "../services/database.service"
import { DataShareService } from "../services/data-share.service"

@Component({
  selector: "app-tab2",
  templateUrl: "tab2.page.html",
  styleUrls: ["tab2.page.scss"],
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
    IonSearchbar,
    IonFab,
    IonFabButton,
    IonModal,
    IonButtons,
    IonTextarea,
    IonGrid,
    IonRow,
    IonCol,
    IonicModule,
  ],
})
export class Tab2Page implements OnInit {
  animals: Animal[] = []
  filteredAnimals: Animal[] = []
  searchTerm = ""
  selectedSexFilter = "Todos"
  isModalOpen = false
  isEditMode = false
  currentAnimal: Animal = this.getEmptyAnimalSync()
  totalAnimals = 0
  totalHembras = 0
  totalMachos = 0

  isDeleteModalOpen = false
  animalToDelete: Animal | null = null
  deleteReason = ""
  customDeleteReason = ""
  deleteObservations = ""

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService,
    private databaseService: DatabaseService,
    private dataShareService: DataShareService,
    private loadingController: LoadingController
  ) {
    addIcons({
      pawOutline,
      addOutline,
      searchOutline,
      femaleOutline,
      maleOutline,
      createOutline,
      trashOutline,
      closeOutline,
      saveOutline,
      arrowBackOutline,
      logOutOutline,
    })
  }

  private getEmptyAnimalSync(): Animal {
  return {
    id: "",
    siniga: "",
    nombre: "",
    madre: "",
    padre: "",
    fechaNacimiento: "",
    edad: "",
    sexo: "Hembra",
    estado: "Excelente",
    peso: null,
    observaciones: "",
    fechaCreacion: "",
    fechaActualizacion: "",
    edadMeses: 0,
    activoReproduccion: true,
    
    // CORRECCIÓN: Inicializar con estado por defecto
    estadoReproductivo: "Limpia",
  } as Animal;
}
  async ngOnInit() {
    console.log("🔄 Inicializando Tab2Page...")
    

    try {
      const status = await this.databaseService.getDatabaseStatus()
      console.log("Estado inicial de DB:", status)

      if (!status.isReady) {
        console.log("🔄 Inicializando base de datos...")
        const dbReady = await this.databaseService.initializeDatabase()
        console.log("Base de datos inicializada:", dbReady)
      }

      await this.loadAnimalsFromDatabase()
      await this.actualizarAnimalesExistentes()

      this.setupDataSubscriptions();
    } catch (error) {
      console.error("Error en ngOnInit:", error)
      await this.showToast("Error al inicializar la aplicación", "danger")
    }
  }

  
  async loadAnimalsFromDatabase() {
  try {
    console.log('📥 Tab2: Cargando animales desde base de datos...');
    const dbAnimals = await this.databaseService.getAllAnimals();
    
    const animalesCorregidos = await this.corregirEstadosMachosAutomaticamente(dbAnimals);
    // DEBUG: Mostrar información de cada animal
    dbAnimals.forEach((animal: Animal) => {
      console.log(`🐄 ${animal.nombre} - Estado: ${animal.estadoReproductivo} - Edad: ${animal.edadMeses} meses - Madre: ${animal.madre} - Padre: ${animal.padre}`);
    });
    
    this.animals = dbAnimals;
    this.updateStats();
    this.applyFilters();
    console.log('✅ Tab2: Animales cargados:', this.animals.length);
    
  } catch (error) {
    console.error('❌ Tab2: Error loading animals:', error);
    await this.showToast("Error al cargar animales", "danger");
  }
}

// Nuevo método para corrección automática
private async corregirEstadosMachosAutomaticamente(animales: Animal[]): Promise<Animal[]> {
  let correcciones = 0;
  const animalesCorregidos: Animal[] = [];

  for (const animal of animales) {
    let animalCorregido = { ...animal };

    // Solo corregir machos con estado incorrecto
    if (animal.sexo === 'Macho') {
      const estadoCorrecto = this.corregirEstadoMachos(animal);
      
      if (animal.estadoReproductivo !== estadoCorrecto) {
        console.log(`🔄 Corrección automática: ${animal.nombre} (${animal.estadoReproductivo} -> ${estadoCorrecto})`);
        
        animalCorregido = {
          ...animal,
          estadoReproductivo: estadoCorrecto,
          fechaActualizacion: new Date().toISOString()
        };

        // Actualizar en base de datos
        try {
          await this.databaseService.updateAnimal(animalCorregido);
          correcciones++;
        } catch (error) {
          console.error(`❌ Error actualizando ${animal.nombre}:`, error);
        }
      }
    }
    
    animalesCorregidos.push(animalCorregido);
  }

  if (correcciones > 0) {
    console.log(`✅ ${correcciones} estados de machos corregidos automáticamente`);
  }

  return animalesCorregidos;
}

  updateStats() {
    this.totalAnimals = this.animals.length
    this.totalHembras = this.animals.filter((a) => a.sexo === "Hembra").length
    this.totalMachos = this.animals.filter((a) => a.sexo === "Macho").length
  }

  applyFilters() {
    this.filteredAnimals = this.animals.filter((animal) => {
      const matchesSearch =
        animal.id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        animal.siniga && animal.siniga.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        animal.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())

      const matchesSex = this.selectedSexFilter === "Todos" || animal.sexo === this.selectedSexFilter

      return matchesSearch && matchesSex
    })
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value
    this.applyFilters()
  }

  onSexFilterChange(sex: string) {
    this.selectedSexFilter = sex
    this.applyFilters()
  }

 formatDate(dateString: string | undefined): string {
  if (!dateString) return "--" // Manejar undefined
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

async debugInfo() {
  console.log('🐛 === DEBUG TAB2 ===');
  console.log('📊 Total animales:', this.animals.length);
  
  this.animals.forEach(animal => {
    console.log(`🐄 ${animal.nombre} (${animal.id}):`);
    console.log(`   Estado: ${animal.estadoReproductivo}`);
    console.log(`   Edad: ${animal.edadMeses} meses`);
    console.log(`   Madre: ${animal.madre}`);
    console.log(`   Padre: ${animal.padre}`);
    console.log(`   Activo: ${animal.activoReproduccion}`);
  });
  
  // Verificar base de datos
  const dbStatus = await this.databaseService.getDatabaseStatus();
  console.log('💾 Estado BD:', dbStatus);
  
  await this.showToast('Info de debug en consola', 'primary');
}

// En Tab2Page - método temporal para migrar
// En Tab2Page - reemplazar el método migrateDatabase
async migrateDatabase() {
  const alert = await this.alertController.create({
    header: 'Migrar Base de Datos',
    message: '¿Estás seguro de que quieres migrar la base de datos? Esto puede tomar unos segundos.',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Migrar',
        handler: async () => {
          try {
            const success = await this.databaseService.migrateDatabase();
            
            if (success) {
              await this.showToast('Base de datos migrada exitosamente', 'success');
              await this.loadAnimalsFromDatabase();
            } else {
              await this.showToast('Error en la migración', 'danger');
            }
          } catch (error) {
            await this.showToast('Error migrando BD', 'danger');
          }
        }
      }
    ]
  });

  await alert.present();
}

  async openAddModal() {
  this.isEditMode = false;
  this.currentAnimal = this.getEmptyAnimalSync();
  this.isModalOpen = true;

  console.log(" 🔍 Estado reproductivo inicial:", this.currentAnimal.estadoReproductivo);
  
  setTimeout(async () => {
    const newAnimal = await this.getEmptyAnimal();
    this.currentAnimal = { ...this.currentAnimal, ...newAnimal };
    console.log(" 🔍 Estado reproductivo después de getEmptyAnimal:", this.currentAnimal.estadoReproductivo);
  });
}  

  openEditModal(animal: Animal) {
    this.isEditMode = true
    this.currentAnimal = { ...animal }
    this.isModalOpen = true
  }

  closeModal() {
    this.isModalOpen = false
    this.currentAnimal = this.getEmptyAnimalSync()
  }

  confirmDelete(animal: Animal) {
    this.animalToDelete = animal
    this.isDeleteModalOpen = true
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false
    this.animalToDelete = null
    this.deleteReason = ""
    this.customDeleteReason = ""
    this.deleteObservations = ""
  }

  canDelete(): boolean {
    return !!this.deleteReason && (this.deleteReason !== "Otro" || !!this.customDeleteReason)
  }

  async deleteAnimal() {
    if (!this.animalToDelete || !this.canDelete()) return

    try {
      const success = await this.databaseService.deleteAnimal(this.animalToDelete.id, this.deleteReason)

      if (success) {
        await this.loadAnimalsFromDatabase()
        this.dataShareService.notifyDataUpdate()
        await this.showToast(`${this.animalToDelete.nombre} eliminado correctamente`, "success")
        this.closeDeleteModal()
      } else {
        await this.showToast("Error al eliminar el animal", "danger")
      }
    } catch (error) {
      console.error("Error eliminando animal:", error)
      await this.showToast("Error al eliminar el animal", "danger")
    }
  }



// En Tab2Page - corregir el método setupDataSubscriptions
private setupDataSubscriptions() {
  console.log('🔔 Tab2: Configurando suscripciones...');
  
  // Suscribirse a actualizaciones de datos generales
  const dataSub = this.dataShareService.dataUpdated$.subscribe(() => {
    console.log('🔄 Tab2: Recibida notificación de actualización general');
    this.loadAnimalsFromDatabase();
  });

  // Suscribirse a actualizaciones específicas de animales
  const animalSub = this.dataShareService.animalUpdated$.subscribe((animalActualizado: Animal) => {
    console.log('🔄 Tab2: Recibida actualización específica para:', animalActualizado.nombre);
    console.log('📊 Tab2: Nuevo estado:', animalActualizado.estadoReproductivo);
    console.log('📊 Tab2: Edad en meses:', animalActualizado.edadMeses);
    
    // Forzar recarga completa para asegurar que todos los campos se actualicen
    this.loadAnimalsFromDatabase();
  });

  // Guardar las suscripciones para limpiarlas después
  this.subscriptions.push(dataSub, animalSub);
}

// Agregar esta propiedad a la clase Tab2Page
private subscriptions: any[] = [];

// Agregar ngOnDestroy para limpiar suscripciones
ngOnDestroy() {
  this.subscriptions.forEach(sub => sub.unsubscribe());
  console.log('🧹 Tab2: Suscripciones limpiadas');
}

  validateAnimal(): boolean {
    return !!(
      this.currentAnimal.siniga &&
      this.currentAnimal.nombre &&
      this.currentAnimal.fechaNacimiento &&
      this.currentAnimal.sexo
    )
  }

 private async getEmptyAnimal(): Promise<Animal> {
  const id = await this.databaseService.generateSequentialId();
  
  return {
    id: id,
    siniga: "",
    nombre: "",
    madre: "",
    padre: "",
    fechaNacimiento: "",
    edad: "",
    sexo: "Hembra",
    estado: "Excelente",
    peso: null,
    observaciones: "",
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    edadMeses: 0,
    activoReproduccion: true,
    
    // CORRECCIÓN: Inicializar con estado por defecto según sexo
    estadoReproductivo: "Limpia", // Valor por defecto para hembras
  } as Animal;
}


  
  calculateAge(birthDate: string): string {
    if (!birthDate) return ""

    try {
      const birth = new Date(birthDate)
      const today = new Date()

      if (isNaN(birth.getTime())) {
        return "Fecha inválida"
      }

      const diffTime = Math.abs(today.getTime() - birth.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      const years = Math.floor(diffDays / 365)
      const months = Math.floor((diffDays % 365) / 30)

      return `${years}a ${months}m`
    } catch (error) {
      console.error("Error calculando edad:", error)
      return "Error"
    }
  }
  // En Tab2Page - método mejorado para calcular edad
private calcularEdadMeses(fechaNacimiento: string): number {
  if (!fechaNacimiento) return 24;
  
  try {
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    
    // Asegurar que las fechas sean válidas
    if (isNaN(nacimiento.getTime())) {
      console.warn('Fecha de nacimiento inválida:', fechaNacimiento);
      return 24;
    }
    
    let meses = (hoy.getFullYear() - nacimiento.getFullYear()) * 12;
    meses += hoy.getMonth() - nacimiento.getMonth();
    
    // Ajustar por día del mes
    if (hoy.getDate() < nacimiento.getDate()) {
      meses--;
    }
    
    return Math.max(1, meses); // Mínimo 1 mes
  } catch (error) {
    console.error('Error calculando edad en meses:', error);
    return 24;
  }
}

// Actualiza el método onBirthDateChange:
onBirthDateChange() {
  if (this.currentAnimal.fechaNacimiento) {
    this.currentAnimal.edad = this.calculateAge(this.currentAnimal.fechaNacimiento);
    this.currentAnimal.edadMeses = this.calcularEdadMeses(this.currentAnimal.fechaNacimiento);
  }
}

getStatusColor(estado: string | undefined): string {
  switch (estado) {
    case "Excelente":
      return "success"
    case "Bueno":
      return "primary"
    case "Regular":
      return "warning"
    case "Enfermo":
      return "danger"
    default:
      return "medium" // Valor por defecto para undefined
  }
}

  // En Tab2Page - mejorar getEstadoReproductivoColor para machos:
getEstadoReproductivoColor(estado: string): string {
  if (!estado) return "medium";

  switch (estado) {
    case "Limpia": return "success";
    case "Sucia": return "warning";
    case "A calor": return "danger";
    case "Vacia": return "medium";
    case "Preñada": return "tertiary";
    case "Seca": return "primary";
    case "Reto": return "secondary";
    case "Semental": return "primary";      // 🐂 Estado para machos adultos
    case "Becerro": return "warning";       // 🐂 Estado para machos jóvenes
    default: return "medium";
  }
}

  getSexColor(sexo: string): string {
    return sexo == "Hembra" ? "#e91e63" : "#9c27b0"
  }


  async actualizarAnimalesExistentes() {
    console.log("🔄 Actualizando animales existentes con campos reproductivos...")

    try {
      const animales = await this.databaseService.getAllAnimals()
      let actualizados = 0

      for (const animal of animales) {
        if ((animal as any).edadMeses === undefined || (animal as any).activoReproduccion === undefined) {
          const animalActualizado: Animal = {
            ...animal,
            edadMeses: (animal as any).edadMeses || animal.fechaNacimiento ? this.calculateAgeInMonths(animal.fechaNacimiento) : 24,
            activoReproduccion: (animal as any).activoReproduccion ?? true,
            estadoReproductivo: (animal as any).estadoReproductivo || (animal.sexo === "Hembra" ? "Limpia" : undefined),
          } as Animal

          await this.databaseService.updateAnimal(animalActualizado)
          actualizados++
          console.log(`✅ Actualizado: ${animal.nombre}`)
        }
      }


      console.log(`🎉 ${actualizados} animales actualizados`)
      if (actualizados > 0) {
        await this.showToast(`${actualizados} animales actualizados con datos reproductivos`, "success")
        await this.loadAnimalsFromDatabase()
      }
    } catch (error) {
      console.error("❌ Error actualizando animales:", error)
      await this.showToast("Error actualizando animales", "danger")
    }
  }

async repararBaseDatos() {
  console.log("🔧 Iniciando reparación de base de datos...");
  
  try {
    const success = await this.databaseService.repararBaseDatosCompleta();
    if (success) {
      console.log("✅ Base de datos reparada exitosamente");
      // Recargar todos los datos llamando a ngOnInit
      await this.ngOnInit();
    } else {
      console.log("❌ Error en reparación");
    }
  } catch (error) {
    console.error('❌ Error en reparación:', error);
  }
}
// Si no tienes showLoading y showToast, agrega estos métodos:
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
    position: 'top'
  });
  await toast.present();
}


  async logout() {
    const alert = await this.alertController.create({
      header: "Cerrar Sesión",
      message: "¿Estás seguro de que deseas cerrar sesión?<br><br>Se perderán los datos no guardados.",
      cssClass: "custom-alert-class",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "alert-button-cancel",
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

  async corregirProblemasBaseDatos() {
  console.log("🔧 Corrigiendo problemas de base de datos...");
  
  try {
    // 1. Actualizar tabla eventos
    await this.databaseService.actualizarTablaEventos();
    
    // 2. Forzar migración completa
    await this.databaseService.repararBaseDatosCompleta();
    
    console.log("✅ Problemas corregidos exitosamente");
    
    // Recargar datos
    this.animals = await this.databaseService.getAllAnimals();
    
  } catch (error) {
    console.error("❌ Error corrigiendo problemas:", error);
  }
}

async corregirEstadosMachos() {
  console.log("🔧 Corrigiendo estados de machos...");
  
  const loading = await this.loadingController.create({
    message: 'Corrigiendo estados de machos...'
  });
  await loading.present();

  try {
    let correcciones = 0;
    
    for (const animal of this.animals) {
      if (animal.sexo === 'Macho') {
        const estadoCorrecto = this.corregirEstadoMachos(animal);
        
        // Solo actualizar si el estado es incorrecto
        if (animal.estadoReproductivo !== estadoCorrecto) {
          console.log(`🔄 Corrigiendo ${animal.nombre}: ${animal.estadoReproductivo} -> ${estadoCorrecto}`);
          
          const animalActualizado: Animal = {
            ...animal,
            estadoReproductivo: estadoCorrecto,
            fechaActualizacion: new Date().toISOString()
          };

          const exito = await this.databaseService.updateAnimal(animalActualizado);
          if (exito) {
            correcciones++;
          }
        }
      }
    }

    await loading.dismiss();
    await this.loadAnimalsFromDatabase();
    
    if (correcciones > 0) {
      await this.showToast(`${correcciones} estados de machos corregidos`, 'success');
    } else {
      await this.showToast('Todos los estados de machos están correctos', 'primary');
    }
    
  } catch (error) {
    await loading.dismiss();
    console.error('❌ Error corrigiendo estados de machos:', error);
    await this.showToast('Error corrigiendo estados', 'danger');
  }
}

async actualizarEstadosMachos() {
  console.log("Actualizando estados de machos...");
  
  for (const animal of this.animals) {
    if (animal.sexo === 'Macho' && !animal.estadoReproductivo) {
      const nuevoEstado = (animal.edadMeses || 0) < 12 ? 'Becerro' : 'Semental';
      console.log(`Actualizando ${animal.nombre} a ${nuevoEstado}`);
      
      animal.estadoReproductivo = nuevoEstado;
      await this.databaseService.updateAnimal(animal);
    }
  }
  
  await this.loadAnimalsFromDatabase();
  await this.showToast('Estados de machos actualizados', 'success');
}
private calcularEdadMesesCorregido(fechaNacimiento: string): number {
  if (!fechaNacimiento) return 24;
  
  try {
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    
    if (isNaN(nacimiento.getTime())) {
      console.warn('Fecha inválida:', fechaNacimiento);
      return 24;
    }
    
    // Cálculo más preciso
    let meses = (hoy.getFullYear() - nacimiento.getFullYear()) * 12;
    meses += hoy.getMonth() - nacimiento.getMonth();
    
    // Ajustar por día del mes
    if (hoy.getDate() < nacimiento.getDate()) {
      meses--;
    }
    
    // Asegurar mínimo 1 mes si la fecha es válida
    const edadFinal = Math.max(1, meses);
    console.log(`Edad calculada: ${fechaNacimiento} -> ${edadFinal} meses`);
    
    return edadFinal;
  } catch (error) {
    console.error('Error cálculo edad:', error);
    return 24;
  }
}
async repararProblemasCompletos() {
  const loading = await this.showLoading('Reparando problemas...');
  
  try {
    // 1. Corregir estados de machos
    await this.corregirEstadosMachos();
    
    // 2. Forzar recarga
    await this.loadAnimalsFromDatabase();
    
    // 3. Verificar en consola
    console.log("=== VERIFICACIÓN FINAL ===");
    this.animals.forEach(animal => {
      console.log(`${animal.sexo === 'Hembra' ? '♀' : '♂'} ${animal.nombre}: ${animal.estadoReproductivo} - ${animal.edadMeses} meses`);
    });
    
    await this.showToast('Problemas corregidos', 'success');
  } catch (error) {
    await this.showToast('Error en reparación', 'danger');
  } finally {
    await loading.dismiss();
  }
}

async repararEstadosMachosCompleto() {
  const loading = await this.showLoading('Reparando estados de machos...');
  
  try {
    console.log("🔄 Iniciando reparación completa de estados de machos...");
    
    // 1. Corregir en base de datos
    const bdCorregida = await this.databaseService.corregirEstadosMachosEnBD();
    console.log("BD corregida:", bdCorregida);
    
    // 2. Recargar datos
    await this.loadAnimalsFromDatabase();
    
    // 3. Verificar resultados
    console.log("=== VERIFICACIÓN FINAL DE MACHOS ===");
    const machos = this.animals.filter(a => a.sexo === 'Macho');
    machos.forEach(macho => {
      console.log(`♂ ${macho.nombre}: Estado="${macho.estadoReproductivo}", Edad=${macho.edadMeses} meses`);
    });
    
    if (machos.length > 0) {
      const machosConEstado = machos.filter(m => m.estadoReproductivo && m.estadoReproductivo.trim() !== '').length;
      await this.showToast(`${machosConEstado}/${machos.length} machos con estado correcto`, 'success');
    } else {
      await this.showToast('No hay machos para corregir', 'info');
    }
    
  } catch (error) {
    console.error("❌ Error en reparación:", error);
    await this.showToast('Error reparando estados', 'danger');
  } finally {
    await loading.dismiss();
  }
}

private calculateAgeInMonths(birthDate: string | undefined): number {
  if (!birthDate) {
    console.warn("Fecha de nacimiento no proporcionada");
    return 24; // Valor por defecto
  }
  
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    
    if (isNaN(birth.getTime())) {
      console.warn("Fecha de nacimiento inválida:", birthDate);
      return 24;
    }
    
    // Asegurar que las fechas estén en la misma zona horaria
    const birthUTC = Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate());
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Calcular diferencia en meses
    const diffMonths = (todayUTC - birthUTC) / (1000 * 60 * 60 * 24 * 30.44);
    const edadMeses = Math.max(1, Math.floor(diffMonths)); // Mínimo 1 mes
    
    console.log(`Edad calculada: ${birthDate} -> ${edadMeses} meses`);
    return edadMeses;
    
  } catch (error) {
    console.error("Error calculando edad en meses:", error, "Fecha:", birthDate);
    return 24;
  }
}
// En la clase Tab2Page, agregar estos métodos:

async migrarRazasPendientes(): Promise<boolean> {
  try {
    console.log("🐄 Migrando razas pendientes a la base de datos...");
    
    const animales = await this.databaseService.getAllAnimals(true);
    let actualizados = 0;
    let errores = 0;

    console.log(`📊 Total de animales a procesar: ${animales.length}`);

    for (const animal of animales) {
      try {
        if (!animal.raza || animal.raza.trim() === '') {
          const razaPorDefecto = this.asignarRazaPorDefecto(animal);
          const animalActualizado: Animal = {
            ...animal,
            raza: razaPorDefecto,
            fechaActualizacion: new Date().toISOString()
          };
          
          const exito = await this.databaseService.updateAnimal(animalActualizado);
          if (exito) {
            actualizados++;
            console.log(`✅ ${animal.nombre} (${animal.id}) - Raza asignada: ${razaPorDefecto}`);
          } else {
            errores++;
            console.log(`❌ Error actualizando ${animal.nombre}`);
          }
        }
      } catch (error) {
        errores++;
        console.error(`💥 Error procesando ${animal.nombre}:`, error);
      }
    }

    console.log(`🎉 Migración completada: ${actualizados} animales actualizados, ${errores} errores`);
    
    if (actualizados > 0) {
      await this.loadAnimalsFromDatabase();
      this.dataShareService.notifyDataUpdate();
    }
    
    return actualizados > 0;

  } catch (error) {
    console.error("💥 Error crítico en migración de razas:", error);
    return false;
  }
}

private asignarRazaPorDefecto(animal: Animal): string {
  if (animal.sexo === 'Macho') {
    return this.asignarRazaMachos(animal);
  } else {
    return this.asignarRazaHembras(animal);
  }
}

private asignarRazaMachos(animal: Animal): string {
  const edadMeses = animal.edadMeses || 0;
  
  if (edadMeses < 24) {
    const razasCarne = ['Angus', 'Hereford', 'Charoláis'];
    return razasCarne[Math.floor(Math.random() * razasCarne.length)];
  }
  
  const opciones = [
    { raza: 'Brahman', probabilidad: 0.3 },
    { raza: 'Simental', probabilidad: 0.25 },
    { raza: 'Angus', probabilidad: 0.2 },
    { raza: 'Guzerat', probabilidad: 0.15 },
    { raza: 'Charoláis', probabilidad: 0.1 }
  ];
  
  return this.seleccionarRazaPorProbabilidad(opciones);
}

private asignarRazaHembras(animal: Animal): string {
  const edadMeses = animal.edadMeses || 0;
  const estadoReproductivo = animal.estadoReproductivo || '';
  
  if (edadMeses < 20) {
    const razasJovenes = ['Angus', 'Hereford', 'Simental', 'Brahman'];
    return razasJovenes[Math.floor(Math.random() * razasJovenes.length)];
  }
  
  if (estadoReproductivo.includes('Limpia') || estadoReproductivo.includes('Sucia')) {
    const razasLeche = ['Suizo', 'Holstein', 'Jersey', 'Simental'];
    return razasLeche[Math.floor(Math.random() * razasLeche.length)];
  }
  
  if (estadoReproductivo.includes('Preñada') || animal.ultimoParto) {
    const opciones = [
      { raza: 'Suizo', probabilidad: 0.25 },
      { raza: 'Simental', probabilidad: 0.2 },
      { raza: 'Indubrasil', probabilidad: 0.2 },
      { raza: 'Holstein', probabilidad: 0.15 },
      { raza: 'Brahman', probabilidad: 0.1 },
      { raza: 'Angus', probabilidad: 0.1 }
    ];
    
    return this.seleccionarRazaPorProbabilidad(opciones);
  }
  
  const opcionesDefault = [
    { raza: 'Simental', probabilidad: 0.2 },
    { raza: 'Angus', probabilidad: 0.18 },
    { raza: 'Suizo', probabilidad: 0.16 },
    { raza: 'Brahman', probabilidad: 0.14 },
    { raza: 'Holstein', probabilidad: 0.12 },
    { raza: 'Indubrasil', probabilidad: 0.1 },
    { raza: 'Guzerat', probabilidad: 0.06 },
    { raza: 'Charoláis', probabilidad: 0.04 }
  ];
  
  return this.seleccionarRazaPorProbabilidad(opcionesDefault);
}

private seleccionarRazaPorProbabilidad(opciones: {raza: string, probabilidad: number}[]): string {
  const random = Math.random();
  let acumulado = 0;
  
  for (const opcion of opciones) {
    acumulado += opcion.probabilidad;
    if (random <= acumulado) {
      return opcion.raza;
    }
  }
  
  return opciones[0].raza;
}
// Método para corregir automáticamente estados de machos
private corregirEstadoMachos(animal: Animal): string {
  if (animal.sexo !== 'Macho') {
    return animal.estadoReproductivo || 'Limpia';
  }

  const edadMeses = animal.edadMeses || 0;
  
  // Machos menores de 12 meses = Becerro
  if (edadMeses < 12) {
    return 'Becerro';
  }
  
  // Machos de 12 meses o más = Semental
  return 'Semental';
}

// Actualizar el método saveAnimal para usar esta corrección
async saveAnimal() {
  console.log("❶ Iniciando saveAnimal...");
  if (!this.validateAnimal()) {
    await this.showToast("Complete todos los campos requeridos", "warning");
    return;
  }

  try {
    const dbStatus = await this.databaseService.getDatabaseStatus();
    console.log("❷ Estado de BD:", dbStatus);

    if (!dbStatus.isReady) {
      const initialized = await this.databaseService.initializeDatabase();
      if (!initialized) {
        await this.showToast("Error de conexión con la base de datos", "danger");
        return;
      }
    }

    // Calcular edad
    if (this.currentAnimal.fechaNacimiento) {
      this.currentAnimal.edad = this.calculateAge(this.currentAnimal.fechaNacimiento);
      this.currentAnimal.edadMeses = this.calcularEdadMeses(this.currentAnimal.fechaNacimiento);
    }

    const now = new Date().toISOString();

    // CORRECCIÓN: Asignar estado reproductivo correcto
    let estadoReproductivoFinal: string;

    if (this.currentAnimal.sexo === 'Macho') {
      // Para machos, usar la corrección automática
      estadoReproductivoFinal = this.corregirEstadoMachos(this.currentAnimal);
      console.log(`🔧 Estado corregido para macho ${this.currentAnimal.nombre}: ${estadoReproductivoFinal}`);
    } else {
      // Para hembras, usar el valor seleccionado o por defecto
      estadoReproductivoFinal = this.currentAnimal.estadoReproductivo || 'Limpia';
      console.log(`♀️ Estado para hembra ${this.currentAnimal.nombre}: ${estadoReproductivoFinal}`);
    }

    console.log("😊 Estado reproductivo a guardar:", estadoReproductivoFinal);

    const animalToSave: Animal = {
      id: this.currentAnimal.id,
      siniga: this.currentAnimal.siniga,
      nombre: this.currentAnimal.nombre,
      madre: this.currentAnimal.madre || "",
      padre: this.currentAnimal.padre || "",
      fechaNacimiento: this.currentAnimal.fechaNacimiento,
      edad: this.currentAnimal.edad || "",
      sexo: this.currentAnimal.sexo,
      estado: this.currentAnimal.estado,
      peso: this.currentAnimal.peso ? Number(this.currentAnimal.peso) : null,
      observaciones: this.currentAnimal.observaciones || "",
      fechaCreacion: this.isEditMode ? this.currentAnimal.fechaCreacion : now,
      fechaActualizacion: now,
      edadMeses: this.currentAnimal.edadMeses || 0,
      activoReproduccion: true,
      // CORRECCIÓN: Guardar el estado reproductivo como string
      estadoReproductivo: estadoReproductivoFinal,
      raza: this.currentAnimal.raza || 'Angus'
    } as Animal;

    console.log("😊 Animal a guardar:", JSON.stringify(animalToSave));

    let success: boolean;
    if (this.isEditMode) {
      console.log("😊 Modo edición - actualizando animal");
      success = await this.databaseService.updateAnimal(animalToSave);
    } else {
      console.log("6 Modo nuevo - insertando animal");
      success = await this.databaseService.insertAnimal(animalToSave);
    }

    if (success) {
      console.log("🍟 Operación exitosa");
      await this.loadAnimalsFromDatabase();
      this.dataShareService.notifyDataUpdate();
      const message = this.isEditMode
        ? `${animalToSave.nombre} actualizado correctamente`
        : `${animalToSave.nombre} registrado correctamente`;
      await this.showToast(message, "success");
      this.closeModal();
    } else {
      console.log(" X Error en la operación");
      const message = this.isEditMode ? "Error al actualizar el animal" : "Error al guardar. Verifique los datos";
      await this.showToast(message, "danger");
    }
  } catch (error) {
    console.error(" X Error en saveAnimal:", error);
    await this.showToast("Error al guardar el animal", "danger");
  }
}

// Método para ejecutar desde la UI
async forzarMigracionRazas() {
  const alert = await this.alertController.create({
    header: 'Migrar Razas',
    message: '¿Estás seguro de que quieres migrar las razas pendientes? Esto asignará razas a todos los animales que no tengan una asignada.',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Migrar',
        handler: async () => {
          const loading = await this.loadingController.create({
            message: 'Migrando razas...'
          });
          await loading.present();
          
          try {
            const exito = await this.migrarRazasPendientes();
            await loading.dismiss();
            
            if (exito) {
              await this.showToast('Migración de razas completada', 'success');
            } else {
              await this.showToast('Error en la migración', 'danger');
            }
          } catch (error) {
            await loading.dismiss();
            await this.showToast('Error crítico en migración', 'danger');
          }
        }
      }
    ]
  }
);
  
  await alert.present();
}

}

export default Tab2Page
