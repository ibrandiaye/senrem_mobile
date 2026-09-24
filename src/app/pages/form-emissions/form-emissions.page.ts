import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast 
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { ReferentielService, RegionData } from '../../services/referentiel.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-form-emissions',
  templateUrl: './form-emissions.page.html',
  styleUrls: ['./form-emissions.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormEmissionsPage implements OnInit {
  regions: RegionData[] = [];
  isRegionLocked = false;

  formData: any = {
    uuid: '',
    region: '',
    commune: '',
    radio_nom: '',
    radio_frequence: '',
    date_emission: new Date().toISOString().split('T')[0],
    heure_debut: '10:00',
    heure_fin: '11:30',
    theme: 'Promotion et adoption des foyers améliorés SENRM : économie d\'énergie, santé et préservation forestière',
    format: 'direct',
    lieu: 'studio',
    animateur_nom: '',
    responsable_radio_nom: '',
    latitude: null,
    longitude: null,
  };

  participants: { prenom_nom: string; sexe: 'M' | 'F'; profession: string }[] = [
    { prenom_nom: '', sexe: 'M', profession: '' }
  ];

  toastMessage = '';
  isToastOpen = false;
  toastColor: 'success' | 'warning' | 'danger' = 'success';

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
    } else if (this.regions.length > 0) {
      this.formData.region = this.regions[0].nom;
    }
  }

  addParticipant() {
    this.participants.push({ prenom_nom: '', sexe: 'F', profession: '' });
  }

  removeParticipant(index: number) {
    if (this.participants.length > 1) {
      this.participants.splice(index, 1);
    }
  }

  save(isDraft: boolean) {
    if (!this.formData.radio_nom || !this.formData.theme || !this.formData.animateur_nom) {
      this.showToast('Veuillez renseigner la radio, le thème et l\'animateur.', 'danger');
      return;
    }

    const user = this.auth.currentUser;
    const payload = {
      ...this.formData,
      user_id: user?.id || null,
      user_name: user?.name || '',
      user_email: user?.email || '',
      region: user?.region || this.formData.region,
      participants: this.participants.filter(p => !!p.prenom_nom),
      sync_status: isDraft ? 'brouillon' : 'en_attente',
    };

    this.storage.saveItem('emissions', payload);

    this.showToast(
      isDraft ? 'Émission enregistrée en brouillon.' : 'Fiche Émission Radio validée !',
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
