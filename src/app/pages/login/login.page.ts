import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonSpinner, IonToast 
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonToast
  ]
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  returnUrl = '/home';

  isToastOpen = false;
  toastMessage = '';
  toastColor: 'success' | 'danger' | 'warning' = 'success';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';

    // Si déjà authentifié, redirection vers l'accueil
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez saisir votre email et votre mot de passe.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const res = await this.auth.login(this.email.trim(), this.password);

      if (res.success) {
        this.toastMessage = res.message;
        this.toastColor = 'success';
        this.isToastOpen = true;

        setTimeout(() => {
          this.router.navigateByUrl(this.returnUrl);
        }, 500);
      } else {
        this.errorMessage = res.message;
      }
    } catch (err: any) {
      this.errorMessage = 'Une erreur inattendue est survenue.';
    } finally {
      this.isLoading = false;
    }
  }
}
