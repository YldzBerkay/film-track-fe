# CineTrack Design Guidelines

Comprehensive design rules for creating consistent, premium UI across all pages.

---

## 🎨 Color Palette

### Core Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#0a0d10` | Primary page background |
| `--color-background-alt` | `#14181C` | Alternative/lighter bg |
| `--color-surface` | `#1a1f26` | Card backgrounds |
| `--color-surface-elevated` | `#242b35` | Modals, dropdowns |

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#00E054` | CTAs, highlights, success |
| `--color-secondary` | `#FF8000` | Warnings, secondary actions |
| `--color-accent` | `#7B61FF` | Links, decorative elements |

### Text Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-text-main` | `#F1F1F1` | Headings, primary text |
| `--color-text-secondary` | `rgba(241,241,241,0.6)` | Descriptions |
| `--color-text-muted` | `rgba(241,241,241,0.4)` | Hints, placeholders |

---

## 📝 Typography

Use **Inter** font family. Fall back to system fonts.

### Scale
| Type | Size | Weight | Use |
|------|------|--------|-----|
| H1 | 2.5-4rem | 900 | Page hero titles |
| H2 | 2-2.5rem | 800 | Section headings |
| H3 | 1.25-1.5rem | 700 | Card titles |
| Body | 1rem | 400 | Paragraphs |
| Small | 0.875rem | 500 | Labels, metadata |

### Rules
- Use negative letter-spacing for headings (`-0.03em` to `-0.04em`)
- Line height: 1.15-1.25 for headings, 1.6 for body
- Apply text gradients for hero titles (white to white/80%)

---

## 📐 Spacing

Use the spacing scale defined in CSS variables:

```
--space-1:  4px   --space-6: 24px
--space-2:  8px   --space-8: 32px
--space-3: 12px   --space-10: 40px
--space-4: 16px   --space-12: 48px
--space-5: 20px   --space-16: 64px
```

- Section padding: `4rem 1rem` (mobile) / `5rem 2rem` (desktop)
- Card padding: `1.5rem` to `2rem`
- Element gaps: `0.75rem` to `1.5rem`

---

## 🃏 Component Patterns

### Buttons
```scss
.btn-primary {
  background: linear-gradient(135deg, #00E054, #00b345);
  border-radius: 0.75rem;
  box-shadow: 0 4px 15px rgba(0, 224, 84, 0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 30px rgba(0, 224, 84, 0.5);
  }
}
```

### Cards
```scss
.card {
  background: rgba(26, 31, 38, 0.6);  // Glassmorphism
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  
  &:hover {
    transform: translateY(-8px);
    border-color: rgba(0, 224, 84, 0.4);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 40px rgba(0,224,84,0.1);
  }
}
```

### Inputs
```scss
.input {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  
  &:focus {
    border-color: var(--color-primary);
    outline: none;
  }
}
```

---

## ✨ Animations

### Keyframes Available
- `fadeIn` - Simple opacity fade
- `fadeInUp` - Fade + slide up 20px
- `fadeInScale` - Fade + scale from 0.95
- `float` - Gentle up/down floating
- `glow` - Pulsing glow effect
- `gradientShift` - Moving gradient background
- `orb-float-1/2` - Ambient orb movement

### Timing Functions
| Token | Value | Use |
|-------|-------|-----|
| `--transition-fast` | `0.15s ease` | Micro-interactions |
| `--transition-base` | `0.25s ease` | Standard transitions |
| `--transition-slow` | `0.4s ease` | Large elements |
| `--transition-spring` | `0.5s cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful bounces |

### Best Practices
- Use staggered delays for lists (0.1s increments)
- Apply `opacity: 0` with `animation-fill-mode: forwards`
- Hover transforms: max `translateY(-8px)` and `scale(1.02)`

---

## 🖼️ Visual Effects

### Glassmorphism
```scss
background: rgba(26, 31, 38, 0.6);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
border: 1px solid var(--color-border);
```

### Glow Effects
```scss
// Button glow
box-shadow: 0 0 20px rgba(0, 224, 84, 0.4);

// Card glow on hover
box-shadow: 0 0 40px rgba(0, 224, 84, 0.1);
```

### Gradient Borders
```scss
&::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(0,224,84,0.3), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
```

---

## 📱 Responsive Breakpoints

| Name | Width | Use |
|------|-------|-----|
| Mobile | < 640px | Single column, stacked |
| Tablet | 640-1024px | 2-3 columns |
| Desktop | > 1024px | Full layout, sidebars |

### Media Query Pattern
```scss
// Mobile-first
.element {
  padding: 1rem;
  
  @media (min-width: 768px) {
    padding: 2rem;
  }
  
  @media (min-width: 1024px) {
    padding: 3rem;
  }
}
```

---

## ♿ Accessibility

- Maintain **4.5:1** contrast ratio for text
- All interactive elements must have visible focus states
- Use `focus-visible` for keyboard navigation
- Provide `prefers-reduced-motion` alternatives

```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 📋 Page Creation Checklist

When creating a new page:

1. **Structure**: Use consistent layout wrapper with `min-height: 100vh`
2. **Z-index**: Background effects: 0, Content: 1, Header: 100
3. **Animations**: Apply `fadeInUp` to main content areas
4. **Cards**: Use glassmorphism pattern with hover effects
5. **Buttons**: Apply gradient + glow for primary CTAs
6. **Spacing**: Follow the spacing scale, generous padding
7. **Mobile**: Design mobile-first, enhance for desktop
