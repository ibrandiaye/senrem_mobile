import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast 
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { ReferentielService, FoyerModel, RegionData, DepartementData, CommuneData } from '../../services/referentiel.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-form-ventes',
  templateUrl: './form-ventes.page.html',
  styleUrls: ['./form-ventes.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormVentesPage implements OnInit {
  regions: RegionData[] = [];
  departements: DepartementData[] = [];
  communes: CommuneData[] = [];
  foyers: FoyerModel[] = [];
  isRegionLocked = false;

  // Données du formulaire
  formData: any = {
    uuid: '',
    distributeur_nom: '',
    distributeur_statut: 'Distributeur Agréé',
    distributeur_telephone: '',
    region: '',
    departement: '',
    commune: '',
    village_quartier: '',
    adresse_client: '',
    date_vente: new Date().toISOString().split('T')[0],
    latitude: null,
    longitude: null,
  };

  quantites: { [foyerId: number]: number } = {};

  toastMessage = '';
  isToastOpen = false;
  toastColor: 'success' | 'warning' | 'danger' = 'success';
  isCapturingGps = false;

  constructor(
    private storage: StorageService,
    private referentiel: ReferentielService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.regions = this.referentiel.getRegions();
    this.foyers = this.referentiel.getFoyerTypes();

    for (const f of this.foyers) {
      this.quantites[f.id] = 0;
    }

    const user = this.auth.currentUser;
    if (user && user.region) {
      this.formData.region = user.region;
      this.isRegionLocked = true;
      this.onRegionChange();
    } else if (this.regions.length > 0) {
      this.formData.region = this.regions[0].nom;
      this.onRegionChange();
    }
  }

  onRegionChange() {
    this.departements = this.referentiel.getDepartements(this.formData.region);
    if (this.departements.length > 0) {
      this.formData.departement = this.departements[0].nom;
      this.onDepartementChange();
    } else {
      this.departements = [];
      this.communes = [];
      this.formData.departement = '';
      this.formData.commune = '';
    }
  }

  onDepartementChange() {
    this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
    if (this.communes.length > 0) {
      this.formData.commune = this.communes[0].nom;
    } else {
      this.communes = [];
      this.formData.commune = '';
    }
  }

  increment(foyerId: number) {
    this.quantites[foyerId] = (this.quantites[foyerId] || 0) + 1;
  }

  decrement(foyerId: number) {
    if ((this.quantites[foyerId] || 0) > 0) {
      this.quantites[foyerId]--;
    }
  }

  get totalFoyers(): number {
    let total = 0;
    for (const id of Object.keys(this.quantites)) {
      total += Number(this.quantites[+id] || 0);
    }
    return total;
  }

  captureGps() {
    if ('geolocation' in navigator) {
      this.isCapturingGps = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.formData.latitude = pos.coords.latitude;
          this.formData.longitude = pos.coords.longitude;
          this.isCapturingGps = false;
          this.showToast('Position GPS capturée avec succès !', 'success');
        },
        (err) => {
          this.isCapturingGps = false;
          this.showToast('Impossible de capturer le GPS : ' + err.message, 'warning');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      this.showToast('La géolocalisation n\'est pas supportée par cet appareil.', 'warning');
    }
  }

  save(isDraft: boolean) {
    if (!this.formData.distributeur_nom) {
      this.showToast('Veuillez renseigner le nom du distributeur.', 'danger');
      return;
    }

    if (!isDraft && this.totalFoyers === 0) {
      this.showToast('Veuillez saisir au moins 1 foyer vendu.', 'danger');
      return;
    }

    const items = [];
    for (const f of this.foyers) {
      const q = this.quantites[f.id] || 0;
      if (q > 0) {
        items.push({
          foyer_type_id: f.id,
          nom_foyer: f.nom,
          quantite: q
        });
      }
    }

    const user = this.auth.currentUser;
    const payload = {
      ...this.formData,
      user_id: user?.id || null,
      user_name: user?.name || '',
      user_email: user?.email || '',
      region: user?.region || this.formData.region,
      items: items,
      total_fa_vendus: this.totalFoyers,
      sync_status: isDraft ? 'brouillon' : 'en_attente',
    };

    this.storage.saveItem('ventes', payload);

    const msg = isDraft
      ? 'Fiche enregistrée comme brouillon local.'
      : 'Fiche validée ! Elle sera synchronisée au serveur dès que possible.';

    this.showToast(msg, 'success');

    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 1200);
  }

  showToast(message: string, color: 'success' | 'warning' | 'danger') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }
}
