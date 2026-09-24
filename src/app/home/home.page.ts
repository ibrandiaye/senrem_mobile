import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSpinner, IonToast
} from '@ionic/angular';
import { StorageService } from '../services/storage.service';
import { SyncService, SyncResult } from '../services/sync.service';
import { AuthService, AuthUser } from '../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSpinner, IonToast
  ],
})
export class HomePage implements OnInit {
  isOnline = true;
  isSyncing = false;
  pendingCount = 0;
  totalLocalCount = 0;
  lastSyncTime: string | null = null;
  macroStats: any = null;
  currentUser: AuthUser | null = null;

  toastMessage = '';
  isToastOpen = false;
  toastColor: 'success' | 'danger' | 'warning' = 'success';

  constructor(
    public storage: StorageService,
    public sync: SyncService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.currentUser;
    this.refreshCounts();

    this.auth.currentUser$.subscribe((user: AuthUser | null) => {
      this.currentUser = user;
    });

    this.sync.isOnline$.subscribe(online => {
      this.isOnline = online;
    });

    this.sync.isSyncing$.subscribe(syncing => {
      this.isSyncing = syncing;
      if (!syncing) {
        this.refreshCounts();
      }
    });

    this.sync.lastSync$.subscribe(time => {
      this.lastSyncTime = time;
    });
  }

  ionViewWillEnter() {
    this.currentUser = this.auth.currentUser;
    this.refreshCounts();
  }

  logout() {
    if (confirm('Confirmez-vous la déconnexion de l’application ?')) {
      this.auth.logout();
    }
  }

  refreshCounts() {
    this.pendingCount = this.storage.getPendingCount();
    this.totalLocalCount = this.storage.getTotalLocalCount();
    this.macroStats = this.storage.getCache('indicateurs_macro');
  }

  async triggerSync() {
    if (!this.isOnline) {
      this.showToast('Vous êtes actuellement hors-ligne. Les fiches sont conservées localement.', 'warning');
      return;
    }

    this.isSyncing = true;
    const result: SyncResult = await this.sync.synchronize();
    this.isSyncing = false;
    this.refreshCounts();

    if (result.success) {
      this.showToast(result.message, 'success');
    } else {
      this.showToast(result.message, 'danger');
    }
  }

  showToast(message: string, color: 'success' | 'danger' | 'warning') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }
}
