import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataShareService {
  private dataUpdated = new BehaviorSubject<boolean>(false);
  dataUpdated$ = this.dataUpdated.asObservable();

  constructor() {}

  notifyDataUpdate() {
    this.dataUpdated.next(true);
  }

  resetDataUpdate() {
    this.dataUpdated.next(false);
  }
}