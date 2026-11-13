# React Bits components

Source: https://github.com/DavidHDev/react-bits (retrieved 2026-10-17).
Official documentation: https://reactbits.dev/
License and attribution: see LICENSE.md alongside these sources. Components are included as part of this application.

Vendored TypeScript/CSS sources:
- `src/ts-default/TextAnimations/CountUp/CountUp.tsx`
- `src/ts-default/Components/SpotlightCard/SpotlightCard.tsx` and `.css`
- `src/ts-default/Animations/ClickSpark/ClickSpark.tsx`
- `src/ts-default/Micro/GlideSelect/GlideSelect.tsx` and `.css` (retrieved 2026-10-27; adapted, lives in `src/components/ui/Select.tsx` and `Select.css`)

Usage:
- CountUp: parent and administration metrics, 650 ms duration; existing Motion dependency.
- SpotlightCard: school hero, soft golden light, no ambient loop or flare. Decorative layers do not intercept pointer input.
- ClickSpark: metric cards, six small cobalt/gold sparks, 300 ms; disabled for reduced motion. No extra animation package added.
- Glide Select: every select in the app (`Select` component). Menu pops from the trigger corner (180 ms in / 120 ms out), highlight glides between rows (220 ms), press–drag–release picking with mouse/pen, label swap blur, chevron turn.

Local modifications:
- `integration.css` adapts source styling to cobalt/cream tokens, mobile layout and reduced motion.
- ClickSpark checks the current reduced-motion media query before every burst, including after settings change while the page is open.
- Glide Select: lucide-react icons instead of Hugeicons (no new dependency); menu rendered in the top layer with the Popover API so tables, modals and scroll areas never clip it; app colour tokens for light/dark; option descriptions, tags and disabled options; multi-character type-ahead; touch taps select while long lists still scroll; accepts native `<option>` children; a hidden native `<select>` keeps `name`, `required` and `FormData` working; native `<select>` fallback when the Popover API is missing.

No backend, external runtime script or tracking added. Source imports are local and bundled with Vite.
