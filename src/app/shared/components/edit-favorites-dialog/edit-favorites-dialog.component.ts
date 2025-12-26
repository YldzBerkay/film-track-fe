import { Component, ChangeDetectionStrategy, input, output, signal, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FavoriteMovie, FavoriteTvShow } from '../../../core/services/favorites.service';
import { TMDBService } from '../../../core/services/tmdb.service';
import { TranslatePipe } from '../../../core/i18n';

@Component({
    selector: 'app-edit-favorites-dialog',
    standalone: true,
    imports: [CommonModule, DragDropModule, TranslatePipe],
    templateUrl: './edit-favorites-dialog.component.html',
    styleUrl: './edit-favorites-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditFavoritesDialogComponent implements OnInit, OnChanges {
    // Inputs
    isOpen = input<boolean>(false);
    initialMovies = input<FavoriteMovie[]>([]);
    initialTvShows = input<FavoriteTvShow[]>([]);
    initialTab = input<'movies' | 'tv'>('movies');

    // Outputs
    close = output<void>();
    save = output<{ movies: FavoriteMovie[], tvShows: FavoriteTvShow[] }>();

    // State (we copy initial to local state for editing)
    movies = signal<FavoriteMovie[]>([]);
    tvShows = signal<FavoriteTvShow[]>([]);

    activeTab = signal<'movies' | 'tv'>('movies');
    isSaving = signal(false);

    constructor(public tmdbService: TMDBService) { }

    ngOnInit() {
        // Initialize local state from inputs
        this.movies.set([...this.initialMovies()]);
        this.tvShows.set([...this.initialTvShows()]);
        this.activeTab.set(this.initialTab());
    }

    // Update local state if inputs change (though dialog is usually recreated, good practice)
    ngOnChanges() {
        if (this.isOpen()) {
            this.movies.set([...this.initialMovies()]);
            this.tvShows.set([...this.initialTvShows()]);
        }
    }

    closeDialog(e?: Event) {
        if (e) e.stopPropagation();
        this.close.emit();
    }

    saveChanges() {
        this.isSaving.set(true);
        this.save.emit({
            movies: this.movies(),
            tvShows: this.tvShows()
        });
    }

    dropMovie(event: CdkDragDrop<FavoriteMovie[]>) {
        const currentMovies = [...this.movies()];
        moveItemInArray(currentMovies, event.previousIndex, event.currentIndex);
        this.movies.set(currentMovies);
    }

    dropTvShow(event: CdkDragDrop<FavoriteTvShow[]>) {
        const currentTvShows = [...this.tvShows()];
        moveItemInArray(currentTvShows, event.previousIndex, event.currentIndex);
        this.tvShows.set(currentTvShows);
    }

    removeMovie(id: number) {
        this.movies.update(list => list.filter(m => m.tmdbId !== id));
    }

    removeTvShow(id: number) {
        this.tvShows.update(list => list.filter(s => s.tmdbId !== id));
    }
}
