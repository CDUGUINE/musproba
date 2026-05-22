import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Simul1Request, Simul1Response, MusRequest, SimCondBetDoubleRequest, SimFauxJeuRequest, SimCondBetDoubleResponse, SimFauxJeuResponse, SimCondBetDoubleFilteredRequest, SimFauxJeuFilteredRequest, SimFauxJeuFilteredResponse } from '../../shared/models/simulation.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly timeoutMs = 15000;

  constructor(private http: HttpClient) {}

  simulateSimul1(payload: Simul1Request): Observable<Simul1Response> {
    const url = `${this.baseUrl}/simulate_simul1`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<Simul1Response>(url, payload, { headers }).pipe(
      timeout(this.timeoutMs),
      catchError((err) => this.mapError(err))
    );
  }

  simulateMus(payload: MusRequest) {
  const url = `${this.baseUrl}/simulate_complete_hand`; // ⚠️ adapte si ton endpoint s'appelle autrement
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });


  
  return this.http.post<Simul1Response>(url, payload, { headers }).pipe(
    timeout(this.timeoutMs),
    catchError((err) => this.mapError(err))
  );
}

  private mapError(err: unknown) {
    if (typeof err === 'object' && err && (err as any).name === 'TimeoutError') {
      return throwError(() => new Error('Délai dépassé (timeout).'));
    }

    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return throwError(() => new Error('Erreur réseau (offline, DNS, SSL, serveur injoignable).'));
      }

      if (err.status === 422 && err.error && typeof err.error === 'object' && 'detail' in err.error) {
        const detail = (err.error as any).detail;
        const msg = Array.isArray(detail)
          ? detail.map((d: any) => `- ${d.loc?.join('.') ?? 'champ'}: ${d.msg ?? 'invalide'}`).join('\n')
          : 'Requête invalide (422).';
        return throwError(() => new Error(`Validation FastAPI (422) :\n${msg}`));
      }

      const simpleDetail =
        err.error && typeof err.error === 'object' && 'detail' in err.error && typeof (err.error as any).detail === 'string'
          ? (err.error as any).detail
          : null;

      const msg =
        simpleDetail ??
        (typeof err.error === 'string' ? err.error : null) ??
        err.statusText ??
        'Réponse invalide';

      return throwError(() => new Error(`Erreur API (${err.status}) : ${msg}`));
    }

    return throwError(() => new Error('Erreur inconnue.'));
  }

  simulateCondBetDouble(body: SimCondBetDoubleRequest) {
    return this.http.post<SimCondBetDoubleResponse>(`${this.baseUrl}/simulate_cond_bet_double`, body);
  }

  simulateFauxJeu(body: SimFauxJeuRequest) {
    return this.http.post<SimFauxJeuResponse>(`${this.baseUrl}/simulate_faux_jeu`, body);
  }

  simulateCondBetDoubleFiltered(body: SimCondBetDoubleFilteredRequest) {
    return this.http.post<any>(
      `${this.baseUrl}/simulateCondBetDoubleFiltered`,
      body
    );
  }

  simulateFauxJeuFiltered(body: SimFauxJeuFilteredRequest) {
    return this.http.post<SimFauxJeuFilteredResponse>(`${this.baseUrl}/simulatefauxjeufiltered`, body);
  }
}


