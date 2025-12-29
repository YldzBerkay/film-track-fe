import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from './auth.service';

export interface ReactionResponse {
    likesCount: number;
    dislikesCount: number;
    userVote: 'like' | 'dislike' | null;
}

@Injectable({
    providedIn: 'root'
})
export class InteractionService {
    private readonly apiUrl = 'http://localhost:3000/api/interactions';

    constructor(private http: HttpClient) { }

    toggleReaction(targetId: string, targetType: 'activity' | 'comment', action: 'like' | 'dislike' | 'none'): Observable<ApiResponse<ReactionResponse>> {
        return this.http.post<ApiResponse<ReactionResponse>>(`${this.apiUrl}/reaction`, {
            targetId,
            targetType,
            action
        });
    }
}
