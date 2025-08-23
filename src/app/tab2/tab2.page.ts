import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonItem, IonLabel, IonButton, IonIcon, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonGrid, IonRow, IonCol, IonModal, IonButtons, IonBadge,
  IonSearchbar, AlertController, ToastController, IonFab, IonFabButton
} from "@ionic/angular/standalone"

import {
  pawOutline, addOutline, searchOutline, femaleOutline, maleOutline,
  createOutline, trashOutline, closeOutline, saveOutline, arrowBackOutline, logOutOutline
} from "ionicons/icons"

import { Router } from "@angular/router"
import { AuthService } from "../services/auth.service"
import { DatabaseService, type Animal } from "../services/database.service"
import { addIcons } from "ionicons"

@Component({
  selector: "app-tab2",
  templateUrl: "tab2.page.html",
  styleUrls: ["tab2.page.scss"],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonIcon,
    IonSelect, IonSelectOption, IonBadge, IonSearchbar, IonFab, IonFabButton,
    IonModal, IonButtons, IonTextarea, IonGrid, IonRow, IonCol,
  ],
})
export class Tab2Page implements OnInit {
  animals: Animal[] = []
  filteredAnimals: Animal[] = []
  searchTerm = ""
  selectedSexFilter = "Todos"

  isModalOpen = false
  isEditMode = false
  currentAnimal: Animal = this.getEmptyAnimal()

  totalAnimals = 0
  totalHembras = 0
  totalMachos = 0

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService,
    private databaseService: DatabaseService,
  ) {
    addIcons({
      pawOutline, addOutline, searchOutline, femaleOutline, maleOutline,
      createOutline, trashOutline, closeOutline, saveOutline,
      arrowBackOutline, logOutOutline,
    })
  }

  async ngOnInit() {
    await this.databaseService.initializeDatabase()
    await this.loadAnimalsFromDatabase()
  }

  async loadAnimalsFromDatabase() {
    const dbAnimals = await this.databaseService.getAllAnimals()
    this.animals = dbAnimals
    this.updateStats()
    this.applyFilters()
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
        animal.siniga.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
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

  formatDate(dateString: string): string {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  openAddModal() {
    this.isEditMode = false
    this.currentAnimal = this.getEmptyAnimal()
    this.isModalOpen = true
  }

  openEditModal(animal: Animal) {
    this.isEditMode = true
    this.currentAnimal = { ...animal }
    this.isModalOpen = true
  }

  closeModal() {
    this.isModalOpen = false
    this.currentAnimal = this.getEmptyAnimal()
  }

  generateId(): string {
    return `A-${Date.now()}`
  }

  async saveAnimal() {
    if (!this.validateAnimal()) {
      await this.showToast("Por favor complete todos los campos requeridos", "warning")
      return
    }

    if (this.currentAnimal.fechaNacimiento) {
      this.currentAnimal.edad = this.calculateAge(this.currentAnimal.fechaNacimiento)
    }

    const now = new Date().toISOString()

    if (!this.currentAnimal.id) {
      this.currentAnimal.id = this.generateId()
    }

    const animalToSave: Animal = {
      ...this.currentAnimal,
      fechaCreacion: now,
      fechaActualizacion: now,
    }

    const success = await this.databaseService.insertAnimal(animalToSave)

    if (success) {
      this.animals.push(animalToSave)
      this.updateStats()
      this.applyFilters()
      await this.showToast(`${animalToSave.nombre} registrado correctamente`, "success")
      this.closeModal()
    } else {
      await this.showToast("❌ Error al guardar en base de datos", "danger")
    }
  }

  validateAnimal(): boolean {
    return !!(
      this.currentAnimal.nombre &&
      this.currentAnimal.siniga &&
      this.currentAnimal.fechaNacimiento &&
      this.currentAnimal.sexo
    )
  }

  getEmptyAnimal(): Animal {
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
      peso: 0,
      observaciones: "",
      fechaCreacion: "",
      fechaActualizacion: "",
    }
  }

  calculateAge(birthDate: string): string {
    if (!birthDate) return ""

    const birth = new Date(birthDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - birth.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)

    return `${years}a ${months}m`
  }

  onBirthDateChange() {
    if (this.currentAnimal.fechaNacimiento) {
      this.currentAnimal.edad = this.calculateAge(this.currentAnimal.fechaNacimiento)
    }
  }

  getStatusColor(estado: string): string {
    switch (estado) {
      case "Excelente": return "success"
      case "Bueno": return "primary"
      case "Regular": return "warning"
      case "Enfermo": return "danger"
      default: return "medium"
    }
  }

  getSexColor(sexo: string): string {
    return sexo === "Hembra" ? "#e91e63" : "#9c27b0"
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: "top",
    })
    await toast.present()
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
}

export default Tab2Page
