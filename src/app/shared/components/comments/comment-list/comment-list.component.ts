import { Component, Input, OnInit, signal, OnChanges, SimpleChanges, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService, Comment } from '../../../../core/services/comment.service';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TimeAgoPipe } from '../../../pipes/time-ago.pipe';

// Helper interface for rendering
interface CommentNode extends Comment {
    level: number;
    replies: CommentNode[]; // For rendering structure if needed, or just flattened
    isExpanded: boolean;
    isLoadingReplies: boolean;
    showReplyInput: boolean;
    replyText: string;
}

@Component({
    selector: 'app-comment-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TimeAgoPipe],
    templateUrl: './comment-list.component.html',
    styleUrls: ['./comment-list.component.scss']
})
export class CommentListComponent implements OnChanges {
    @Input() activityId!: string;
    @Input() initialCount: number = 0;

    comments = signal<CommentNode[]>([]);
    isLoading = signal(false);
    hasMore = signal(false);
    page = 1;

    currentUser!: Signal<User | null | undefined>;

    // New Comment Input
    newCommentText = signal('');
    isSubmitting = signal(false);

    constructor(
        private commentService: CommentService,
        private authService: AuthService
    ) {
        this.currentUser = this.authService.user;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['activityId'] && this.activityId) {
            this.loadComments();
        }
    }

    loadComments() {
        this.isLoading.set(true);
        this.commentService.getComments(this.activityId, 1).subscribe({
            next: (res) => {
                if (res.success) {
                    const nodes = res.data.comments.map(c => this.mapToNode(c, 0));
                    this.comments.set(nodes);
                    this.hasMore.set(res.data.pagination.hasMore);
                    this.page = 1;
                }
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    mapToNode(comment: Comment, level: number): CommentNode {
        return {
            ...comment,
            level,
            replies: [],
            isExpanded: false,
            isLoadingReplies: false,
            showReplyInput: false,
            replyText: ''
        };
    }

    toggleReplies(node: CommentNode) {
        if (node.isExpanded) {
            node.isExpanded = false;
            // We could hide replies, but usually we just keep them and toggle visibility?
            // For flattening strategy: 
            // If we expand, we fetch replies and INSERT them into the list after the parent.
            // If we collapse, we remove them? Or just hide?

            // Let's implement fetch and insert for "Instagram style flattening".
            // We need to remove the replies from the list if collapsing?
            // Actually Instagram doesn't really "collapse" much, but let's allow it.

            this.removeReplies(node._id);
        } else {
            node.isExpanded = true;
            this.loadReplies(node);
        }
    }

    loadReplies(node: CommentNode) {
        if (node.isLoadingReplies) return;

        node.isLoadingReplies = true;
        // Replies to a node are effectively level 1 (or level + 1 if we supported deep nesting, but requirement is max 1 indentation)
        // Visual Level: If node.level == 0 -> replies are Level 1.
        // If node.level == 1 -> replies are Level 1 (aligned) but visually tagged.

        const nextLevel = node.level === 0 ? 1 : 1;

        // We fetch replies where rootId is this node (if level 0)
        // Or if this is level 1, typically we shouldn't be fetching replies OF replies via API if we already fetched thread?
        // The API `getReplies` fetches by `rootId`.
        // If `node` is Level 0, it IS the root.

        // The requirement says: "GET /comments/:id/replies: Fetches all descendants... flattened"
        // So if I click "View replies" on a Top Level comment, I should get ALL replies.

        this.commentService.getReplies(node._id).subscribe({
            next: (res) => {
                if (res.success) {
                    const newReplies = res.data.replies.map(r => this.mapToNode(r, nextLevel));

                    // Insert into array after the parent
                    this.comments.update(current => {
                        const index = current.findIndex(c => c._id === node._id);
                        if (index === -1) return current;

                        // Insert
                        const before = current.slice(0, index + 1);
                        const after = current.slice(index + 1);
                        return [...before, ...newReplies, ...after];
                    });

                    // node.replyCount = 0; // Removed: We need to keep this positive to show "View X replies" again if collapsed
                }
                node.isLoadingReplies = false;
            },
            error: () => node.isLoadingReplies = false
        });
    }

    removeReplies(rootId: string) {
        // Remove all comments where rootId === rootId (except the root itself)
        // But in our flat list, we don't strictly know which ones belong unless we check `rootId` property.
        this.comments.update(current => current.filter(c => c.rootId !== rootId && c._id !== rootId || c._id === rootId));
        // Wait, the root comment doesn't have rootId set (it's null). Replies have rootId set to the root's ID.
        // So filter: keep if (rootId !== id OR id === id) ? 
        // Simplify: keep if c.rootId !== rootId. 
    }

    toggleReplyInput(node: CommentNode) {
        node.showReplyInput = !node.showReplyInput;
        if (node.showReplyInput) {
            // Reset others? Maybe not.
            node.replyText = '';
            if (node.level > 0 && node.replyToUser) {
                // Maybe prefill @username? Or just let the UI handle "Replying to @User" label.
            }
        }
    }

    submitComment(e?: Event) {
        e?.preventDefault();
        const text = this.newCommentText().trim();
        if (!text || this.isSubmitting()) return;

        this.isSubmitting.set(true);
        this.commentService.createComment({
            activityId: this.activityId,
            text
        }).subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    // Add to top of list (Level 0)
                    const newNode = this.mapToNode(res.data as Comment, 0);
                    this.comments.update(c => [newNode, ...c]);
                    this.newCommentText.set('');
                }
                this.isSubmitting.set(false);
            },
            error: () => this.isSubmitting.set(false)
        });
    }

    submitReply(node: CommentNode) {
        const text = node.replyText.trim();
        if (!text) return;

        // effective parentId is the node._id
        // But if node is already a reply (Level 1), the parentId is node._id, but visual is flat.
        // Logic: reply to the specific comment. Backend handles rootId.

        this.commentService.createComment({
            activityId: this.activityId,
            text,
            parentId: node._id,
            replyToUser: node.userId._id // Who we are replying to
        }).subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    const newNode = this.mapToNode(res.data as Comment, 1);
                    // Insert after the node we replied to
                    this.comments.update(current => {
                        const index = current.findIndex(c => c._id === node._id);
                        const before = current.slice(0, index + 1);
                        const after = current.slice(index + 1);
                        return [...before, newNode, ...after];
                    });
                    node.replyText = '';
                    node.showReplyInput = false;
                    // If we replied to a root node that wasn't expanded, maybe we should auto-expand or set expanded?
                    if (node.level === 0 && !node.isExpanded) {
                        node.isExpanded = true;
                    }
                }
            }
        });
    }
}
