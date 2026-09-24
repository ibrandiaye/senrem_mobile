import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast, IonSpinner 
} from '@ionic/angular';
import { StorageService, FicheType, BaseFiche } from '../../services/storage.service';
import { SyncService } from '../../services/sync.service';

@Component({
  selector: 'app-mes-fiches',
  templateUrl: './mes-fiches.page.html',
  styleUrls: ['./mes-fiches.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast, IonSpinner
  ]
})
export class MesFichesPage implements OnInit {
  selectedType: string = 'all';
  selectedStatus: string = 'all';

  fiches: (BaseFiche & { typeLabel: string; title: string; subtitle: string })[] = [];

  toastMessage = '';
  isToastOpen = false;
  toastColor: 'success' | 'warning' | 'danger' = 'success';
  isSyncing = false;

  constructor(
    private storage: StorageService,
    public sync: SyncService
  ) {}

  ngOnInit() {
    this.loadFiches();
    this.sync.isSyncing$.subscribe(s => {
      this.isSyncing = s;
      if (!s) {
        this.loadFiches();
      }
    });
  }

  ionViewWillEnter() {
    this.loadFiches();
  }

  loadFiches() {
    const types: FicheType[] = ['ventes', 'animations', 'demonstrations', 'caravanes', 'emissions', 'leaders'];
    const list: any[] = [];

    for (const t of types) {
      const items = this.storage.getItems(t);
      for (const item of items) {
        let title = '';
        let subtitle = '';
        let typeLabel = '';

        switch (t) {
          case 'ventes':
            typeLabel = 'Vente Distributeur';
            title = item['distributeur_nom'] || 'Distributeur inconnu';
            subtitle = `${item['total_fa_vendus'] || 0} FA vendus • ${item['commune'] || ''} (${item['region'] || ''})`;
            break;
          case 'animations':
            typeLabel = 'Animation-Vente';
            title = item['lieu_animation'] || 'Lieu non précisé';
            subtitle = `Animateur: ${item['animateur_nom']} • ${item['nb_fa_vendus']} FA vendus`;
            break;
          case 'demonstrations':
            typeLabel = 'Démo Culinaire';
            title = item['gpf_nom'] || 'GPF';
            subtitle = `Présidente: ${item['presidente_nom']} • ${item['nb_femmes']} femmes présentes`;
            break;
          case 'caravanes':
            typeLabel = 'Caravane';
            title = item['itineraire'] || 'Caravane';
            subtitle = `${item['nb_villages_sillonnes']} village(s) • ${item['nb_fa_vendus']} FA vendus`;
            break;
          case 'emissions':
            typeLabel = 'Émission Radio';
            title = item['radio_nom'] || 'Radio';
            subtitle = `${item['theme']} • ${item['animateur_nom']}`;
            break;
          case 'leaders':
            typeLabel = 'Leader d\'Opinion';
            title = item['prenom_nom'] || 'Leader';
            subtitle = `${item['titre_profession']} • ${item['telephone']}`;
            break;
        }

        list.push({
          ...item,
          type: t,
          typeLabel,
          title,
          subtitle,
        });
      }
    }

    // Tri par date décroissante
    list.sort((a, b) => new Date(b.client_created_at).getTime() - new Date(a.client_created_at).getTime());
    this.fiches = list;
  }

  get filteredFiches() {
    return this.fiches.filter(f => {
      const matchType = this.selectedType === 'all' || f.type === this.selectedType;
      const matchStatus = this.selectedStatus === 'all' || f.sync_status === this.selectedStatus;
      return matchType && matchStatus;
    });
  }

  deleteItem(fiche: any) {
    if (confirm(`Voulez-vous supprimer cette fiche locale "${fiche.title}" ?`)) {
      this.storage.deleteItem(fiche.type, fiche.uuid);
      this.loadFiches();
      this.showToast('Fiche locale supprimée.', 'success');
    }
  }

  async triggerSync() {
    const res = await this.sync.synchronize();
    this.showToast(res.message, res.success ? 'success' : 'danger');
    this.loadFiches();
  }

  showToast(message: string, color: 'success' | 'warning' | 'danger') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }
}
