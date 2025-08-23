import { Component, OnInit } from '@angular/core';
import { DatabaseService, Animal } from '../services/database.service';
import { AlertController, ToastController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router'; // ← Necesario para logout

@Component({
  standalone: true,
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    IonicModule, CommonModule
  ]
})
export class Tab1Page implements OnInit {
  // Cambia los valores iniciales a 0
  totalAnimales = 0;
  totalHembras = 0;
  totalMachos = 0;
  reproductores = 0;
  cargandoDatos = true;
  modoMock = false;

  // Próximos eventos (ahora vendrán de la base de datos)
  proximosEventos: any[] = [];

  constructor(
    private databaseService: DatabaseService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router // ← Inyecta Router para logout
  ) {}

  async ngOnInit() {
    await this.loadDashboardData();
  }

  // MÉTODO LOGOUT (debe ser público)
  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar sesión',
          handler: () => {
            // Aquí va tu lógica de logout
            // Por ejemplo, limpiar storage y redirigir al login
            localStorage.clear();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  async loadDashboardData() {
    this.cargandoDatos = true;
    
    try {
      // 1. Inicializar base de datos
      const dbReady = await this.databaseService.initializeDatabase();
      
      if (!dbReady) {
        throw new Error('La base de datos no se pudo inicializar');
      }

      // 2. Obtener datos reales
      const animals = await this.databaseService.getAllAnimals();
      const eventos = await this.databaseService.getAllEventos();

      // 3. Calcular estadísticas
      this.totalAnimales = animals.length;
      this.totalHembras = animals.filter(a => a.sexo === 'Hembra').length;
      this.totalMachos = animals.filter(a => a.sexo === 'Macho').length;
      this.reproductores = animals.filter(a => 
        a.sexo === 'Macho' || (a.sexo === 'Hembra' && this.calculateAge(a.fechaNacimiento) >= 2)
      ).length;

      // 4. Procesar próximos eventos
      this.proximosEventos = this.processEventos(eventos);

      await this.showToast('Datos actualizados', 'success');
    } catch (error) {
      console.error('Error:', error);
      this.modoMock = true; // ← Activar modo mock en caso de error
      await this.showToast('Error cargando datos. Usando modo simulación.', 'danger');
      
      // Valores por defecto para modo mock
      this.setDefaultStats();
    } finally {
      this.cargandoDatos = false;
    }
  }

  private setDefaultStats() {
    this.totalAnimales = 24;
    this.totalHembras = 18;
    this.totalMachos = 6;
    this.reproductores = 8;
    
    // Eventos de ejemplo para modo mock
    this.proximosEventos = [
      {
        id: 1,
        animalNombre: 'Vaca 01',
        animalId: 'B001',
        tipo: 'Celo',
        notas: 'En periodo de celo',
        fecha: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        estado: 'Pendiente'
      },
      {
        id: 2,
        animalNombre: 'Vaca 05',
        animalId: 'B005',
        tipo: 'Vacunación',
        notas: 'Vacuna anual',
        fecha: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        estado: 'Programado'
      }
    ];
  }

  private processEventos(eventos: any[]): any[] {
    return eventos
      .filter(e => e.estado !== 'Realizado')
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .slice(0, 4) // Mostrar solo los próximos 4 eventos
      .map(evento => ({
        ...evento,
        fechaCorta: this.formatShortDate(evento.fecha),
        icono: this.getEventIcon(evento.tipo),
        color: this.getEventColor(evento.tipo)
      }));
  }

  private calculateAge(fechaNacimiento: string): number {
    const birth = new Date(fechaNacimiento);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birth.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365)); // Edad en años
  }

  // ESTOS MÉTODOS DEBEN SER PÚBLICOS PORQUE SE USAN EN EL TEMPLATE
  public formatShortDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  public getEventColor(tipo: string): string {
    const colors: {[key: string]: string} = {
      'Celo': '#eb445a',
      'Vacunación': '#3880ff',
      'Inseminación': '#2dd36f',
      'Parto': '#ffc409'
    };
    return colors[tipo] || '#92949c';
  }

  public getEventIcon(tipo: string): string {
    const icons: {[key: string]: string} = {
      'Celo': 'heart-outline',
      'Vacunación': 'medical-outline',
      'Inseminación': 'flower-outline',
      'Parto': 'person-outline'
    };
    return icons[tipo] || 'time-outline';
  }

  // MÉTODO getEstadoColor (faltaba)
  public getEstadoColor(estado: string): string {
    const colors: {[key: string]: string} = {
      'Pendiente': 'warning',
      'Programado': 'primary',
      'Realizado': 'success',
      'Cancelado': 'danger'
    };
    return colors[estado] || 'medium';
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}