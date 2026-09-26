import type { Config } from 'tailwindcss'

/**
 * ArchFacing design tokens — from the ARCHFACING THEME GUIDE.
 *
 * ★ Every value below comes from that sheet. If a colour is not in the guide,
 *   it does not belong here — reach for one of these instead of inventing a
 *   near-match, or the palette drifts a shade at a time.
 *
 *   Theme usage, as specified:  90% white · 8% orange · 2% black.
 *   Orange is for action and highlight only, never for large fills.
 */
const config: Config = {
  /*
   * `src/lib` is scanned too.
   *
   * Not every class lives in a component: `lib/ad-tone.ts` is a table of
   * per-advertisement-type colours that three screens read. Left out of this
   * list, an arbitrary value there — `bg-[#FDF2F8]` — is applied to the
   * element and then has no rule behind it, which renders as no colour at all
   * and gives nothing to show it went wrong.
   */
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      /*
       * `wide` sits at 1440, not at Tailwind's 2xl (1536).
       *
       * A 1536-wide monitor reports about 1520 of CSS viewport once the
       * scrollbar is taken off, so a rule written at 2xl never fires on the
       * most common desktop size — the page keeps its tablet layout until the
       * reader zooms out, which is exactly the bug this replaced. Anything
       * that should change on a full desktop belongs here.
       */
      screens: {
        wide: '1440px',
      },
      colors: {
        // ─── brand ─── #F97316 primary, #FB923C hover/accent
        brand: {
          DEFAULT: '#F97316',
          hover: '#FB923C',
          soft: '#FFF7ED',
          border: '#FED7AA',
        },
        // ─── brand black — header, footer, dark surfaces ───
        navy: {
          DEFAULT: '#111827',
          2: '#1F2937',
          soft: '#F1F5F9',
          deep: '#111827',
        },
        // ─── gold — ArchFacing Club only ───
        //   Kept separate from `brand` so a Club page can never drift orange.
        gold: {
          DEFAULT: '#D4AF37',
          hover: '#B8962F',
          light: '#E8C77E',
          soft: '#FBF7E9',
          border: '#EBDCA9',
        },
        // ─── text ───
        ink: {
          DEFAULT: '#111827', // headings
          2: '#1F2937', // body
          3: '#6B7280', // meta
          4: '#94A3B8', // placeholder
        },
        /*
         * ─── surfaces ───
         *
         * The page is white and the panels sitting on it are the pale grey.
         * That is the opposite way round from how this started, and swapping
         * the two token values here turns the whole app over at once —
         * `bg-paper` is the page everywhere and `bg-paper-2` is every card, so
         * nothing else had to change.
         *
         * A panel that needs to be white instead takes `bg-white` **with a
         * shadow** — `.card` already carries `shadow-card`, so white-on-white
         * still reads as a raised surface rather than as nothing at all.
         */
        paper: {
          DEFAULT: '#FFFFFF', // page background
          2: '#F8FAFC', // cards and panels
          3: '#F1F5F9', // subtle fill inside a panel
        },
        line: {
          DEFAULT: '#E5E7EB',
          soft: '#F1F5F9',
        },
        // ─── status ───
        ok: { DEFAULT: '#16A34A', soft: '#ECFDF3' },
        warn: { DEFAULT: '#F59E0B', soft: '#FFFBEB' },
        danger: { DEFAULT: '#DC2626', soft: '#FEF2F2' },
        info: { DEFAULT: '#2563EB', soft: '#EFF6FF' },
        /** PACT / Active */
        pact: { DEFAULT: '#10B981', soft: '#ECFDF5' },

        // ─── membership tiers ───
        tier: {
          gold: '#D4AF37',
          platinum: '#94A3B8',
          diamond: '#3B82F6',
        },

        // ─── admin dashboard ───
        //   90% dark sidebar and navigation, 10% light content area.
        admin: {
          // Deep navy, a touch darker than the membership banner (#092143) so
          // the sidebar reads solid.
          bg: '#071A36',
          hover: '#122C52',
          active: '#F97316',
          text: '#E5E7EB',
          muted: '#9CA3AF',
          // swapped with `paper` above, and for the same reason
          page: '#FFFFFF',
          card: '#F8FAFC',
          heading: '#1F2937',
          body: '#6B7280',
        },

        // ─── chart series ───
        chart: {
          1: '#F97316', // primary
          2: '#3B82F6', // secondary
          3: '#16A34A', // success
          4: '#F59E0B', // warning
          5: '#DC2626', // danger
          6: '#6366F1', // info
        },
      },

      fontFamily: {
        /** Poppins — headings H1–H6, buttons, navigation, UI components */
        display: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        /** Inter — body text, paragraphs, labels, descriptions */
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },

      /*
       * ─── corners ───
       *
       * 5px everywhere. One radius across the whole site — cards, panels,
       * buttons, inputs, image frames — so nothing reads as belonging to a
       * different kit. `rounded-lg`, `rounded-xl`, `rounded-2xl` and
       * `rounded-card` are all the same 5px, which means existing markup did
       * not have to be rewritten to land on it.
       *
       * Only two shapes are exempt, and both on purpose: `rounded-pill` for
       * chips and badges, and `rounded-full` for avatars.
       */
      borderRadius: {
        card: '8px',
        lg: '8px',
        xl: '8px',
        '2xl': '8px',
        pill: '999px',
      },

      boxShadow: {
        /** The card shadow from the guide */
        card: '0 10px 40px rgba(0,0,0,.06)',
        lift: '0 2px 4px rgba(17,24,39,.04), 0 16px 44px -12px rgba(17,24,39,.16)',
        menu: '0 10px 40px rgba(0,0,0,.10)',
      },

      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #F97316, #FB923C)',
        'gradient-dark': 'linear-gradient(135deg, #111827, #1F2937)',
      },

      spacing: {
        /** The card padding from the guide */
        card: '20px',
      },

      maxWidth: { sheet: '1200px' },
    },
  },
  plugins: [],
}

export default config
