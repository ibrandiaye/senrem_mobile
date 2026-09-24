import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast 
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { ReferentielService, RegionData, DepartementData } from '../../services/referentiel.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-form-caravanes',
  templateUrl: './form-caravanes.page.html',
  styleUrls: ['./form-caravanes.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormCaravanesPage implements OnInit {
  regions: RegionData[] = [];
  departements: DepartementData[] = [];
  isRegionLocked = false;

  moyensDisponibles = ['Véhicule', 'Sonorisation', 'Audiovisuel', 'Motos', 'Banderoles', 'Mégaphone'];

  formData: any = {
    uuid: '',
    region: '',
    departement: '',
    date_caravane: new Date().toISOString().split('T')[0],
    heure_debut: '09:00',
    heure_fin: '17:00',
    distributeurs_beneficiaires: '',
    distributeurs_contacts: '',
    itineraire: '',
    moyens_logistiques: ['Véhicule', 'Sonorisation'],
    nb_villages_sillonnes: 1,
    supports_affiches: 0,
    supports_depliants: 0,
    supports_autres_libelle: '',
    supports_autres_nb: 0,
    nb_fa_vendus: 0,
    responsable_nom: '',
    latitude: null,
    longitude: null,
  };

  villagesTouches: { nom_village_quartier: string; commune_ou_zone: string }[] = [
    { nom_village_quartier: '', commune_ou_zone: '' }
  ];

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
    } else {
      this.departements = [];
    }
  }

  toggleMoyen(moyen: string) {
    const idx = this.formData.moyens_logistiques.indexOf(moyen);
    if (idx >= 0) {
      this.formData.moyens_logistiques.splice(idx, 1);
    } else {
      this.formData.moyens_logistiques.push(moyen);
    }
  }

  hasMoyen(moyen: string): boolean {
    return this.formData.moyens_logistiques.includes(moyen);
  }

  addVillage() {
    this.villagesTouches.push({ nom_village_quartier: '', commune_ou_zone: '' });
    this.formData.nb_villages_sillonnes = this.villagesTouches.length;
  }

  removeVillage(index: number) {
    if (this.villagesTouches.length > 1) {
      this.villagesTouches.splice(index, 1);
      this.formData.nb_villages_sillonnes = this.villagesTouches.length;
    }
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
        () => {
          this.isCapturingGps = false;
          this.showToast('Erreur lors de la capture GPS', 'warning');
        }
      );
    }
  }

  save(isDraft: boolean) {
    if (!this.formData.itineraire || !this.formData.responsable_nom) {
      this.showToast('Veuillez renseigner l\'itinéraire et le responsable.', 'danger');
      return;
    }

    const user = this.auth.currentUser;
    const payload = {
      ...this.formData,
      user_id: user?.id || null,
      user_name: user?.name || '',
      user_email: user?.email || '',
      region: user?.region || this.formData.region,
      villages_touches: this.villagesTouches.filter(v => !!v.nom_village_quartier),
      sync_status: isDraft ? 'brouillon' : 'en_attente',
    };

    this.storage.saveItem('caravanes', payload);

    this.showToast(
      isDraft ? 'Caravane enregistrée en brouillon.' : 'Fiche Caravane validée !',
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
