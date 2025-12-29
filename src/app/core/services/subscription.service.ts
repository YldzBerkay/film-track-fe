import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubscriptionTier } from '../models/subscription.types';

export interface RedeemResponse {
    success: boolean;
    message: string;
    data: {
        tier: SubscriptionTier;
        expiresAt: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class SubscriptionService {
    private apiUrl = 'http://localhost:3000/api/subscription';

    constructor(private http: HttpClient) { }

    redeem(code: string): Observable<RedeemResponse> {
        return this.http.post<RedeemResponse>(`${this.apiUrl}/redeem`, { code });
    }
}
