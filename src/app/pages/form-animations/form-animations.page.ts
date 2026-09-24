import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  selector: 'app-form-animations',
  templateUrl: './form-animations.page.html',
  styleUrls: ['./form-animations.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormAnimationsPage implements OnInit {
  @ViewChild('signatureCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

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
    lieu_animation: '',
    date_animation: new Date().toISOString().split('T')[0],
    distributeur_nom: '',
    distributeur_adresse: '',
    distributeur_contact: '',
    materiel_utilise: 'Mégaphone, banderole SENRM, spécimens de foyers',
    animateur_nom: '',
    animateur_contact: '',
    nb_fa_vendus: 0,
    distributeur_signature: null,
    latitude: null,
    longitude: null,
  };

  toastMessage = '';
  isToastOpen = false;
  toastColor: 'success' | 'warning' | 'danger' = 'success';
  isCapturingGps = false;

  private isDrawing = false;
  private ctx!: CanvasRenderingContext2D | null;

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

  captureGps() {
    if ('geolocation' in navigator) {
      this.isCapturingGps = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.formData.latitude = pos.coords.latitude;
          this.formData.longitude = pos.coords.longitude;
          this.isCapturingGps = false;
          this.showToast('Position GPS acquise !', 'success');
        },
        (err) => {
          this.isCapturingGps = false;
          this.showToast('Erreur GPS : ' + err.message, 'warning');
        },
        { timeout: 10000 }
      );
    }
  }

  // Signature Pad Handlers
  startDrawing(e: MouseEvent | TouchEvent) {
    this.isDrawing = true;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#0f172a';

    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in e ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = 'clientY' in e ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  draw(e: MouseEvent | TouchEvent) {
    if (!this.isDrawing || !this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in e ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = 'clientY' in e ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const canvas = this.canvasRef.nativeElement;
    this.formData.distributeur_signature = canvas.toDataURL();
  }

  clearSignature() {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      this.formData.distributeur_signature = null;
    }
  }

  save(isDraft: boolean) {
    if (!this.formData.lieu_animation || !this.formData.animateur_nom) {
      this.showToast('Veuillez renseigner le lieu et le nom de l\'animateur.', 'danger');
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

    this.storage.saveItem('animations', payload);

    this.showToast(
      isDraft ? 'Animation enregistrée comme brouillon.' : 'Fiche Animation validée pour synchronisation !',
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
