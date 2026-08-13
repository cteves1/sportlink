import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UserRole } from '../../auth/auth.service';
import { DashboardData } from '../models/dashboard.model';
import { getMockDashboardData } from './dashboard.mocks';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  getDashboardData(role: UserRole): Observable<DashboardData> {
    const data = getMockDashboardData(role);
    return of(data).pipe(delay(200));
  }
}
