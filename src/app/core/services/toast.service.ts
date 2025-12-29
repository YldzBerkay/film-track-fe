import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
    type: 'success' | 'error' | 'info' | 'warning' | 'like' | 'follow';
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private _toast = signal<ToastMessage | null>(null);

    // Expose read-only signal if needed, but for effect in component we can read directly
    get toast() {
        return this._toast.asReadonly();
    }

    show(message: string, type: 'success' | 'error' | 'info' | 'warning' | 'like' | 'follow' = 'info') {
        this._toast.set({ message, type });
    }

    clear() {
        this._toast.set(null);
    }
}
