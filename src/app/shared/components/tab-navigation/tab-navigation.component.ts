import {
    Component,
    ChangeDetectionStrategy,
    input,
    output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/i18n';

export interface TabItem {
    key: string;
    label: string;
    icon?: string;
}

@Component({
    selector: 'app-tab-navigation',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './tab-navigation.component.html',
    styleUrl: './tab-navigation.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabNavigationComponent {
    /** Array of tab items to display */
    tabs = input.required<TabItem[]>();

    /** Currently active tab key */
    activeTab = input.required<string>();

    /** Whether to use translation keys for labels */
    useTranslation = input<boolean>(true);

    /** Emitted when a tab is clicked */
    tabChanged = output<string>();

    onTabClick(tabKey: string): void {
        if (tabKey !== this.activeTab()) {
            this.tabChanged.emit(tabKey);
        }
    }
}
