import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UserRole } from '../../auth/auth.service';
import { DashboardData, Player } from '../models/dashboard.model';
import { getMockDashboardData, getMockPlayers } from './dashboard.mocks';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  getDashboardData(role: UserRole): Observable<DashboardData> {
    const data = getMockDashboardData(role);
    return of(data).pipe(delay(200));
  }

  getPlayers(): Observable<Player[]> {
    const players = getMockPlayers();
    return of(players).pipe(delay(200));
  }
}
