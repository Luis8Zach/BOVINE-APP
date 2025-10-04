import { IonicModule } from "@ionic/angular";
import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonItem, IonLabel, IonButton, IonIcon, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonGrid, IonRow, IonCol, IonModal, IonButtons, IonBadge,
  IonSearchbar, AlertController, ToastController, IonFab, IonFabButton
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  pawOutline, addOutline, searchOutline, femaleOutline, maleOutline,
  createOutline, trashOutline, closeOutline, saveOutline, arrowBackOutline, logOutOutline
} from "ionicons/icons";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { DatabaseService, Animal } from "../services/database.service";
import { DataShareService } from "../services/data-share.service";

// ELIMINA ESTA INTERFAZ LOCAL - usa solo la importada
// interface Animal {
//   id: string;
//   siniga: string;
//   nombre: string;
//   madre: string;
//   padre: string;
//   fechaNacimiento: string;
//   edad: string;
//   sexo: "Hembra" | "Macho";
//   estado: "Excelente" | "Bueno" | "Regular" | "Enfermo";
//   peso?: number | null;
//   observaciones: string;
//   fechaCreacion: string;
//   fechaActualizacion: string;
//   // NUEVOS CAMPOS PARA REPRODUCCIÓN
//   edadMeses?: number;
//   activoReproduccion?: boolean;
//   estadoReproductivo?: "Limpia" | "Sucia" | "A calor" | "Vacia" | "Preñada" | "Seca" | "Reto";
//   ultimoParto?: string;
//   diasPostParto?: number;
//   ultimaMonta?: string;
//   ultimaInseminacion?: string;
//   raza?: "Angus" | "Holstein" | "Jersey" | "Hereford" | "Charoláis" | "Simental";
// }

@Component({
  selector: "app-tab2",
  templateUrl: "tab2.page.html",
  styleUrls: ["tab2.page.scss"],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonIcon,
    IonSelect, IonSelectOption, IonBadge, IonSearchbar, IonFab, IonFabButton,
    IonModal, IonButtons, IonTextarea, IonGrid, IonRow, IonCol, IonicModule
  ],
})
export class Tab2Page implements OnInit {
  animals: Animal[] = [];
  filteredAnimals: Animal[] = [];
  searchTerm = "";
  selectedSexFilter = "Todos";
  isModalOpen = false;
  isEditMode = false;
  currentAnimal: Animal = this.getEmptyAnimalSync();
  totalAnimals = 0;
  totalHembras = 0;
  totalMachos = 0;

  // Propiedades para el modal de eliminación
  isDeleteModalOpen = false;
  animalToDelete: Animal | null = null;
  deleteReason = '';
  customDeleteReason = '';
  deleteObservations = '';

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService,
    private databaseService: DatabaseService,
    private dataShareService: DataShareService
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
      logOutOutline
    });
  }

  // Método de sincronización actualizado
  private getEmptyAnimalSync(): Animal {
    return {
      id: '',
      siniga: '',
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
      // NUEVOS CAMPOS REPRODUCTIVOS
      edadMeses: 0,
      activoReproduccion: true,
      estadoReproductivo: "Limpia"
    } as Animal; // Agrega 'as Animal' para asegurar el tipo
  }

  async testInsert() {
    console.log('🧪 TEST INSERT - Iniciando prueba...');
    
    try {
      console.log('📊 Obteniendo estado de BD...');
      const dbStatus = await this.databaseService.getDatabaseStatus();
      console.log('📋 Estado BD:', JSON.stringify(dbStatus));

      if (!dbStatus.isReady) {
        console.log('🔄 BD no ready - inicializando...');
        const initialized = await this.databaseService.initializeDatabase();
        console.log('✅ Resultado inicialización:', initialized);
      }

      console.log('🐄 Creando animal de prueba...');
      const testAnimal: Animal = {
        id: 'TEST-' + Date.now(),
        siniga: 'TEST-' + Date.now(),
        nombre: 'Animal de Prueba',
        madre: '',
        padre: '',
        fechaNacimiento: '2023-01-01',
        edad: '2a 0m',
        sexo: 'Hembra',
        estado: 'Excelente',
        peso: 150,
        observaciones: 'Animal de prueba',
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        // NUEVOS CAMPOS
        edadMeses: 24,
        activoReproduccion: true,
        estadoReproductivo: 'Limpia'
      } as Animal;
      
      console.log('📝 Insertando animal:', JSON.stringify(testAnimal));
      const success = await this.databaseService.insertAnimal(testAnimal);
      console.log('✅ Resultado inserción:', success);
      
      if (success) {
        console.log('🎉 PRUEBA EXITOSA');
        alert('PRUEBA EXITOSA');
      } else {
        console.log('❌ PRUEBA FALLIDA');
        alert('PRUEBA FALLIDA - Revisar Logcat');
      }
      
    } catch (error) {
      console.error('💥 ERROR en testInsert:', error);
      alert('ERROR: ' + error);
    }
  }

  async debugDatabase() {
    console.log('🐛 Iniciando debug de base de datos...');
    
    try {
      const dbStatus = await this.databaseService.getDatabaseStatus();
      console.log('🔧 Estado de BD:', dbStatus);
      
      const tables = await this.databaseService.getAllTables();
      console.log('📋 Tablas en la BD:', tables);
      
      const structure = await this.databaseService.getTableStructure('animals');
      console.log('🏗️ Estructura:', structure);
      
    } catch (error) {
      console.error('❌ Error en debug:', error);
    }
  }

  async ngOnInit() {
    console.log('🔄 Inicializando Tab2Page...');
    
    try {
      const status = await this.databaseService.getDatabaseStatus();
      console.log('Estado inicial de DB:', status);
      
      if (!status.isReady) {
        console.log('🔄 Inicializando base de datos...');
        const dbReady = await this.databaseService.initializeDatabase();
        console.log('Base de datos inicializada:', dbReady);
      }
      
      await this.loadAnimalsFromDatabase();
      
      // Actualizar animales existentes con campos reproductivos
      await this.actualizarAnimalesExistentes();
      
    } catch (error) {
      console.error('Error en ngOnInit:', error);
      await this.showToast("Error al inicializar la aplicación", "danger");
    }
  }

  async loadAnimalsFromDatabase() {
    try {
      const dbAnimals = await this.databaseService.getAllAnimals();
      this.animals = dbAnimals;
      this.updateStats();
      this.applyFilters();
      console.log('Animales cargados:', this.animals.length);
    } catch (error) {
      console.error('Error loading animals:', error);
      await this.showToast("Error al cargar animales", "danger");
    }
  }

  updateStats() {
    this.totalAnimals = this.animals.length;
    this.totalHembras = this.animals.filter((a) => a.sexo === "Hembra").length;
    this.totalMachos = this.animals.filter((a) => a.sexo === "Macho").length;
  }

  applyFilters() {
    this.filteredAnimals = this.animals.filter((animal) => {
      const matchesSearch =
        animal.id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        animal.siniga.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        animal.nombre.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesSex = this.selectedSexFilter === "Todos" || animal.sexo === this.selectedSexFilter;

      return matchesSearch && matchesSex;
    });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.applyFilters();
  }

  onSexFilterChange(sex: string) {
    this.selectedSexFilter = sex;
    this.applyFilters();
  }

  formatDate(dateString: string): string {
    if (!dateString) return "__";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async openAddModal() {
    this.isEditMode = false;
    this.currentAnimal = this.getEmptyAnimalSync();
    this.isModalOpen = true;
    
    setTimeout(async () => {
      const newAnimal = await this.getEmptyAnimal();
      this.currentAnimal = { ...this.currentAnimal, ...newAnimal };
    });
  }

  openEditModal(animal: Animal) {
    this.isEditMode = true;
    this.currentAnimal = { ...animal };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.currentAnimal = this.getEmptyAnimalSync();
  }

  confirmDelete(animal: Animal) {
    this.animalToDelete = animal;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.animalToDelete = null;
    this.deleteReason = '';
    this.customDeleteReason = '';
    this.deleteObservations = '';
  }

  canDelete(): boolean {
    return !!this.deleteReason && (this.deleteReason !== 'Otro' || !!this.customDeleteReason);
  }

  async deleteAnimal() {
    if (!this.animalToDelete || !this.canDelete()) return;

    try {
      const success = await this.databaseService.deleteAnimal(this.animalToDelete.id, this.deleteReason);
      
      if (success) {
        await this.loadAnimalsFromDatabase();
        this.dataShareService.notifyDataUpdate();
        await this.showToast(`${this.animalToDelete.nombre} eliminado correctamente`, "success");
        this.closeDeleteModal();
      } else {
        await this.showToast("Error al eliminar el animal", "danger");
      }
    } catch (error) {
      console.error('Error eliminando animal:', error);
      await this.showToast("Error al eliminar el animal", "danger");
    }
  }

  generateAnimalId(): string {
    return `A-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  async saveAnimal() {
    console.log('🟡 Iniciando saveAnimal...');
    
    if (!this.validateAnimal()) {
      await this.showToast("Complete todos los campos requeridos", "warning");
      return;
    }

    try {
      const dbStatus = await this.databaseService.getDatabaseStatus();
      console.log('📊 Estado de BD:', dbStatus);
      
      if (!dbStatus.isReady) {
        const initialized = await this.databaseService.initializeDatabase();
        if (!initialized) {
          await this.showToast("Error de conexión con la base de datos", "danger");
          return;
        }
      }

      if (this.currentAnimal.fechaNacimiento) {
        this.currentAnimal.edad = this.calculateAge(this.currentAnimal.fechaNacimiento);
      }

      const now = new Date().toISOString();
      
      // CALCULAR edadMeses automáticamente
      let edadMeses = 0;
      if (this.currentAnimal.fechaNacimiento) {
        edadMeses = this.calculateAgeInMonths(this.currentAnimal.fechaNacimiento);
      }
      
      const animalToSave: Animal = {
        id: this.currentAnimal.id,
        siniga: this.currentAnimal.siniga,
        nombre: this.currentAnimal.nombre,
        madre: this.currentAnimal.madre || '',
        padre: this.currentAnimal.padre || '',
        fechaNacimiento: this.currentAnimal.fechaNacimiento,
        edad: this.currentAnimal.edad || '',
        sexo: this.currentAnimal.sexo,
        estado: this.currentAnimal.estado,
        peso: this.currentAnimal.peso ? Number(this.currentAnimal.peso) : null,
        observaciones: this.currentAnimal.observaciones || '',
        fechaCreacion: this.isEditMode ? this.currentAnimal.fechaCreacion : now,
        fechaActualizacion: now,
        // NUEVOS CAMPOS PARA REPRODUCCIÓN
        edadMeses: edadMeses,
        activoReproduccion: true,
        estadoReproductivo: this.currentAnimal.sexo === 'Hembra' ? 'Limpia' : undefined
      } as Animal;
      
      console.log('🐄 Animal a guardar:', JSON.stringify(animalToSave));

      let success: boolean;
      
      if (this.isEditMode) {
        console.log('✏️ Modo edición - actualizando animal');
        success = await this.databaseService.updateAnimal(animalToSave);
      } else {
        console.log('🆕 Modo nuevo - insertando animal');
        success = await this.databaseService.insertAnimal(animalToSave);
      }
      
      if (success) {
        console.log('✅ Operación exitosa');
        await this.loadAnimalsFromDatabase();
        this.dataShareService.notifyDataUpdate();
        
        const message = this.isEditMode ? 
          `${animalToSave.nombre} actualizado correctamente` :
          `${animalToSave.nombre} registrado correctamente`;
        
        await this.showToast(message, "success");
        this.closeModal();
      } else {
        console.log('❌ Error en la operación');
        const message = this.isEditMode ?
          "Error al actualizar el animal" :
          "Error al guardar. Verifique los datos";
        
        await this.showToast(message, "danger");
      }
    } catch (error) {
      console.error('💥 Error en saveAnimal:', error);
      await this.showToast("Error al guardar el animal", "danger");
    }
  }

  // Método para calcular edad en meses
  private calculateAgeInMonths(birthDate: string): number {
    if (!birthDate) return 24; // Default 2 años
    
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      
      if (isNaN(birth.getTime())) {
        console.warn('Fecha de nacimiento inválida:', birthDate);
        return 24;
      }
      
      const birthDateFixed = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
      const todayFixed = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      let months = (todayFixed.getFullYear() - birthDateFixed.getFullYear()) * 12;
      months -= birthDateFixed.getMonth();
      months += todayFixed.getMonth();
      
      return months <= 0 ? 1 : months;
    } catch (error) {
      console.error('Error calculando edad en meses:', error, 'Fecha:', birthDate);
      return 24;
    }
  }

  validateAnimal(): boolean {
    return !!(
      this.currentAnimal.siniga &&
      this.currentAnimal.nombre &&
      this.currentAnimal.fechaNacimiento &&
      this.currentAnimal.sexo
    );
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
      // NUEVOS CAMPOS REPRODUCTIVOS
      edadMeses: 0,
      activoReproduccion: true,
      estadoReproductivo: "Limpia"
    } as Animal;
  }

  calculateAge(birthDate: string): string {
    if (!birthDate) return "";
    
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      
      if (isNaN(birth.getTime())) {
        return "Fecha inválida";
      }
      
      const diffTime = Math.abs(today.getTime() - birth.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      
      return `${years}a ${months}m`;
    } catch (error) {
      console.error('Error calculando edad:', error);
      return "Error";
    }
  }

  onBirthDateChange() {
    if (this.currentAnimal.fechaNacimiento) {
      this.currentAnimal.edad = this.calculateAge(this.currentAnimal.fechaNacimiento);
    }
  }

  getStatusColor(estado: string): string {
    switch (estado) {
      case "Excelente": return "success";
      case "Bueno": return "primary";
      case "Regular": return "warning";
      case "Enfermo": return "danger";
      default: return "medium";
    }
  }

  getSexColor(sexo: string): string {
    return sexo == "Hembra" ? "#e91e63" : "#9c27b0";
  }

  // Método para actualizar animales existentes con campos reproductivos
  async actualizarAnimalesExistentes() {
    console.log('🔄 Actualizando animales existentes con campos reproductivos...');
    
    try {
      const animales = await this.databaseService.getAllAnimals();
      let actualizados = 0;
      
      for (const animal of animales) {
        // Si el animal no tiene los campos reproductivos, actualizarlo
        if ((animal as any).edadMeses === undefined || (animal as any).activoReproduccion === undefined) {
          const animalActualizado: Animal = {
            ...animal,
            edadMeses: (animal as any).edadMeses || this.calculateAgeInMonths(animal.fechaNacimiento),
            activoReproduccion: (animal as any).activoReproduccion ?? true,
            estadoReproductivo: (animal as any).estadoReproductivo || (animal.sexo === 'Hembra' ? 'Limpia' : undefined)
          } as Animal;
          
          await this.databaseService.updateAnimal(animalActualizado);
          actualizados++;
          console.log(`✅ Actualizado: ${animal.nombre}`);
        }
      }
      
      console.log(`🎉 ${actualizados} animales actualizados`);
      if (actualizados > 0) {
        await this.showToast(`${actualizados} animales actualizados con datos reproductivos`, 'success');
        await this.loadAnimalsFromDatabase();
      }
      
    } catch (error) {
      console.error('❌ Error actualizando animales:', error);
      await this.showToast('Error actualizando animales', 'danger');
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: "top",
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
            this.authService.logout();
            this.router.navigate(['/login'], { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }

  async runDatabaseDiagnostic() {
    console.log('🩺 Ejecutando diagnóstico de base de datos...');
    await this.databaseService.debugTableStructure();
    
    const animals = await this.databaseService.getAllAnimals();
    console.log('📊 Animales en BD:', animals.length);
    
    alert(`Diagnóstico completo. Animales: ${animals.length}`);
  }
}

export default Tab2Page;