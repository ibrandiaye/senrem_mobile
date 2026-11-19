import { Injectable } from '@angular/core';
import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  constructor() {}

  /**
   * Vérifie et sollicite explicitement les autorisations de localisation auprès de l'appareil (Android / Web)
   */
  async requestPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const status: PermissionStatus = await Geolocation.checkPermissions();
        if (status.location === 'granted') {
          return true;
        }
        const request = await Geolocation.requestPermissions({ permissions: ['location'] });
        return request.location === 'granted';
      } catch (err) {
        console.warn('Erreur lors de la demande d’autorisation de localisation native:', err);
        return false;
      }
    }

    // Sur le Web / navigateur
    if ('permissions' in navigator && (navigator as any).permissions?.query) {
      try {
        const perm = await (navigator as any).permissions.query({ name: 'geolocation' });
        return perm.state === 'granted' || perm.state === 'prompt';
      } catch {
        return true;
      }
    }
    return true;
  }

  /**
   * Récupère la position géographique actuelle (Latitude & Longitude)
   * Tente d'abord le plugin Capacitor natif avec haute précision, puis bascule sur l'API Web HTML5 en cas de besoin.
   */
  async getCurrentPosition(): Promise<LocationCoordinates> {
    // 1. Essai avec le plugin natif Capacitor Geolocation
    try {
      if (Capacitor.isNativePlatform()) {
        const granted = await this.requestPermission();
        if (!granted) {
          throw new Error('Autorisation d’accès à la localisation refusée. Veuillez activer le GPS et autoriser l’application dans les paramètres.');
        }
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      });

      if (position && position.coords) {
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      }
    } catch (capError: any) {
      console.warn('Capacitor Geolocation non disponible ou échoué, essai fallback navigateur...', capError);
      if (capError?.message && capError.message.includes('refusée')) {
        throw capError;
      }
    }

    // 2. Fallback avec l'API Geolocation standard du navigateur
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('La géolocalisation n’est pas supportée par cet appareil.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => {
          let message = 'Impossible de capturer les coordonnées GPS.';
          switch (err.code) {
            case 1: // PERMISSION_DENIED
              message = 'Autorisation GPS refusée. Veuillez autoriser l’accès à la position dans les paramètres de votre téléphone.';
              break;
            case 2: // POSITION_UNAVAILABLE
              message = 'Position satellite indisponible. Vérifiez que la localisation / GPS de votre appareil est activée.';
              break;
            case 3: // TIMEOUT
              message = 'Délai d’attente satellite dépassé. Assurez-vous d’être dans une zone dégagée et réessayez.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    });
  }
}
