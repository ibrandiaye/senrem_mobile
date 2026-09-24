import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  region: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'senrm_mobile_token';
  private readonly USER_KEY = 'senrm_mobile_user';
  private readonly OFFLINE_CREDS_KEY = 'senrm_offline_creds';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  public currentUser$: Observable<AuthUser | null> = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Retourne l'utilisateur actuellement connecté
   */
  public get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Vérifie si un utilisateur est authentifié
   */
  public isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUser;
  }

  /**
   * Retourne le token Sanctum stocké
   */
  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Retourne la région d'affectation de l'utilisateur connecté
   */
  public getAssignedRegion(): string {
    return this.currentUser?.region || '';
  }

  /**
   * Récupère l'utilisateur stocké en local
   */
  private getStoredUser(): AuthUser | null {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Connexion de l'agent mobile (supporte le mode en ligne et le mode hors-ligne si déjà connecté précédemment)
   */
  async login(email: string, password: string): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    const isOnline = navigator.onLine;

    // 1. Si en ligne : Authentification auprès de l'API Laravel Sanctum
    if (isOnline) {
      try {
        const response: any = await firstValueFrom(
          this.http.post(`${this.apiUrl}/login`, { email, password })
        );

        if (response && response.token && response.user) {
          const user: AuthUser = response.user;

          // Sauvegarde de la session locale
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));

          // Cache des identifiants pour autoriser les reconnexions hors-ligne dans le bush
          const offlineCache = {
            email: user.email.toLowerCase(),
            passwordHash: btoa(password),
            user: user,
            cachedToken: response.token
          };
          localStorage.setItem(this.OFFLINE_CREDS_KEY, JSON.stringify(offlineCache));

          this.currentUserSubject.next(user);

          return {
            success: true,
            message: `Bienvenue ${user.name} (Région : ${user.region || 'Non assignée'})`,
            user: user
          };
        }

        return {
          success: false,
          message: 'Réponse serveur invalide lors de la connexion.'
        };
      } catch (err: any) {
        console.warn('Échec connexion serveur, tentative vérification cache hors-ligne...', err);
        // Si le serveur est injoignable, on tente le fallback hors-ligne
        const offlineResult = this.tryOfflineLogin(email, password);
        if (offlineResult.success) {
          return offlineResult;
        }

        let errMsg = 'Identifiants incorrects ou serveur injoignable.';
        if (err.error && err.error.message) {
          errMsg = err.error.message;
        } else if (err.error && err.error.errors && err.error.errors.email) {
          errMsg = err.error.errors.email[0];
        }

        return {
          success: false,
          message: errMsg
        };
      }
    }

    // 2. Si hors-ligne : Authentification basée sur le cache de session
    return this.tryOfflineLogin(email, password);
  }

  /**
   * Vérification des identifiants en mode hors-ligne
   */
  private tryOfflineLogin(email: string, password: string): { success: boolean; message: string; user?: AuthUser } {
    try {
      const rawCache = localStorage.getItem(this.OFFLINE_CREDS_KEY);
      if (!rawCache) {
        return {
          success: false,
          message: 'Aucune session enregistrée hors-ligne. Une première connexion avec réseau internet est requise.'
        };
      }

      const cache = JSON.parse(rawCache);
      if (cache.email === email.trim().toLowerCase() && cache.passwordHash === btoa(password)) {
        localStorage.setItem(this.TOKEN_KEY, cache.cachedToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(cache.user));
        this.currentUserSubject.next(cache.user);

        return {
          success: true,
          message: `Connexion hors-ligne réussie. Bienvenue ${cache.user.name} (Région : ${cache.user.region})`,
          user: cache.user
        };
      }

      return {
        success: false,
        message: 'Identifiants hors-ligne non reconnus sur cet appareil.'
      };
    } catch {
      return {
        success: false,
        message: 'Erreur de lecture du cache hors-ligne.'
      };
    }
  }

  /**
   * Déconnexion de l'agent mobile
   */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Met à jour les informations du profil utilisateur connecté
   */
  updateLocalUser(user: AuthUser) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }
}
