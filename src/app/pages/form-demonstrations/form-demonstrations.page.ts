import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast 
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { ReferentielService, RegionData, DepartementData, CommuneData } from '../../services/referentiel.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-form-demonstrations',
  templateUrl: './form-demonstrations.page.html',
  styleUrls: ['./form-demonstrations.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormDemonstrationsPage implements OnInit {
  regions: RegionData[] = [];
  departements: DepartementData[] = [];
  communes: CommuneData[] = [];
  isRegionLocked = false;

  formData: any = {
    uuid: '',
    region: '',
    departement: '',
    commune: '',
    village_quartier: '',
    date_demonstration: new Date().toISOString().split('T')[0],
    gpf_nom: '',
    activites_principales_gpf: '',
    nb_presents: 0,
    nb_hommes: 0,
    nb_femmes: 0,
    presidente_nom: '',
    presidente_contact: '',
    presidente_age: null,
    consent_photo_video: true,
    consent_interview: true,
    responsable_nom: '',
    latitude: null,
    longitude: null,
  };

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
    }
  }

  onDepartementChange() {
    this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
    if (this.communes.length > 0) {
      this.formData.commune = this.communes[0].nom;
    } else {
      this.communes = [];
    }
  }

  updateTotalPresents() {
    this.formData.nb_presents = (Number(this.formData.nb_hommes) || 0) + (Number(this.formData.nb_femmes) || 0);
  }

  captureGps() {
    if ('geolocation' in navigator) {
      this.isCapturingGps = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.formData.latitude = pos.coords.latitude;
          this.formData.longitude = pos.coords.longitude;
          this.isCapturingGps = false;
          this.showToast('Position GPS capturée !', 'success');
        },
        (err) => {
          this.isCapturingGps = false;
          this.showToast('Erreur GPS : ' + err.message, 'warning');
        }
      );
    }
  }

  save(isDraft: boolean) {
    if (!this.formData.gpf_nom || !this.formData.presidente_nom) {
      this.showToast('Veuillez renseigner le nom du GPF et de la présidente.', 'danger');
      return;
    }

    const user = this.auth.currentUser;
    const payload = {
      ...this.formData,
      user_id: user?.id || null,
      user_name: user?.name || '',
      user_email: user?.email || '',
      region: user?.region || this.formData.region,
      sync_status: isDraft ? 'brouillon' : 'en_attente',
    };

    this.storage.saveItem('demonstrations', payload);

    this.showToast(
      isDraft ? 'Démonstration enregistrée en brouillon.' : 'Fiche Démonstration validée !',
      'success'
    );

    setTimeout(() => this.router.navigate(['/home']), 1200);
  }

  showToast(message: string, color: 'success' | 'warning' | 'danger') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }
}
