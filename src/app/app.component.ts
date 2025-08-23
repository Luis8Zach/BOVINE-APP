import { Component, OnInit } from "@angular/core"
import { DatabaseService } from "./services/database.service"
import { AuthService } from "./services/auth.service"
import { IonicModule } from '@ionic/angular'
import { RouterOutlet } from '@angular/router'
import { CommonModule } from '@angular/common'; 

@Component({
  selector: "app-root",
  standalone: true, // ✅ FALTA ESTO
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
  imports: [IonicModule, RouterOutlet,CommonModule],
})
export class AppComponent implements OnInit {
  constructor(
    private databaseService: DatabaseService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    const isLogged = this.authService.isLoggedIn()

    if (isLogged) {
      const dbReady = await this.databaseService.initializeDatabase()
      console.log("📦 DB Ready?", dbReady)
    }
  }
}
