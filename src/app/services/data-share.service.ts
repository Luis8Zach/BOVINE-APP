import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Animal } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class DataShareService {
  private dataUpdated = new Subject<void>();
  private animalUpdated = new Subject<Animal>();
  
  dataUpdated$ = this.dataUpdated.asObservable();
  animalUpdated$ = this.animalUpdated.asObservable();

  constructor() {}

  notifyDataUpdate() {
    this.dataUpdated.next();
  }

  notifyAnimalUpdate(animal: Animal) {
    this.animalUpdated.next(animal);
  }
}