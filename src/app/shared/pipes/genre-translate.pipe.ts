import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'genreTranslate',
    standalone: true
})
export class GenreTranslatePipe implements PipeTransform {

    transform(englishGenre: string): string {
        if (!englishGenre) return '';

        // Normalize string: Science Fiction -> SCIENCE_FICTION
        const key = englishGenre
            .toUpperCase()           // SCIENCE FICTION
            .replace(/&/g, 'AND')    // ACTION AND ADVENTURE
            .replace(/[^A-Z0-9_]/g, '_') // SCIENCE_FICTION
            .replace(/_+/g, '_')     // Clean up multiple underscores
            .replace(/^_|_$/g, '');  // Trim underscores

        return `genres.${key}`;
    }
}
