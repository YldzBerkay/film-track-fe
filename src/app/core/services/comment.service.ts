import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from './auth.service'; // Start assuming similar response structure

export interface Comment {
    _id: string;
    text: string;
    userId: {
        _id: string;
        username: string;
        name?: string;
        avatar?: string;
        mastery?: {
            score: number;
            level: number;
            title: string;
        };
    };
    activityId: string;
    parentId: string | null;
    rootId: string | null;
    replyToUser?: {
        _id: string;
        username: string;
        name?: string;
    };
    replyCount: number;
    likes: string[];
    dislikes: string[];
    likesCount: number;
    dislikesCount: number;
    isDeleted?: boolean;
    deletedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CommentListResponse {
    comments: Comment[]; // or replies
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

@Injectable({
    providedIn: 'root'
})
export class CommentService {
    private readonly apiUrl = 'http://localhost:3000/api/comments';

    constructor(private http: HttpClient) { }

    getComments(activityId: string, page: number = 1): Observable<ApiResponse<{ comments: Comment[], pagination: any }>> {
        const params = new HttpParams()
            .set('activityId', activityId)
            .set('page', page.toString());
        return this.http.get<ApiResponse<{ comments: Comment[], pagination: any }>>(`${this.apiUrl}`, { params });
    }

    getReplies(commentId: string, page: number = 1): Observable<ApiResponse<{ replies: Comment[], pagination: any }>> {
        const params = new HttpParams()
            .set('page', page.toString());
        return this.http.get<ApiResponse<{ replies: Comment[], pagination: any }>>(`${this.apiUrl}/${commentId}/replies`, { params });
    }

    createComment(data: { activityId: string, text: string, parentId?: string, replyToUser?: string }): Observable<ApiResponse<Comment>> {
        return this.http.post<ApiResponse<Comment>>(`${this.apiUrl}`, data);
    }
}
