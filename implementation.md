# ByteWave Digital Localhost Website Specification

## 1. Project objective

Create a completely new ByteWave Digital Enterprise website that runs locally during the design and development stage.

The website should introduce ByteWave as a modern Brunei digital company that creates websites, software, automation, data tools, and locally relevant digital products.

This specification covers only the website experience running on localhost.

## 2. Required outcome

Build a polished single-page website with:

- A responsive floating header
- A left-side navigation drawer
- A modern animated hero
- About, Services, Products, Process, Insights, Contact, and Footer sections
- SideQuest.BN and SideQuest Tourism product presentations
- Responsive layouts for desktop, tablet, and mobile
- Natural scrolling on all devices
- Replaying reveal animations
- Accessible menus, carousels, dialogs, and forms
- A local demonstration contact form

The completed website must run locally without requiring external accounts, secret keys, or paid services.

## 3. Recommended local technology

Use a simple modern front-end stack:

- HTML5
- CSS3 with custom properties
- Vanilla JavaScript
- Three.js as an optional progressive enhancement
- Local image assets
- Google Fonts or locally installed fallback fonts

A React and Vite implementation is also acceptable, but only if it remains easy to start locally and does not add unnecessary complexity.

## 4. Local project structure

Recommended static structure:

```text
bytewave-local/
  index.html
  css/
    style.css
  js/
    main.js
  assets/
    bytewave-logo-transparent.png
    sidequest-bn/
    sidequest-tourism/
  implementation.md
  README.md
```

If React and Vite are used:

```text
bytewave-local/
  src/
    components/
    data/
    styles/
    App.jsx
    main.jsx
  public/
    assets/
  implementation.md
  package.json
```

## 5. Brand personality

The website should feel:

- Modern
- Credible
- Brunei-focused
- Friendly
- Clear
- Creative
- Technologically capable
- Premium without feeling expensive or distant

Avoid:

- Generic digital-agency templates
- Dark cyberpunk styling
- Excessive neon effects
- Overly glossy AI-generated visual effects
- Overuse of gradients
- Thin typography
- Large amounts of technical jargon
- Unsupported production claims

## 6. Tone of voice

Use plain, confident, approachable language.

- Speak like a helpful local technology partner.
- Explain services clearly.
- Do not exaggerate company size or product readiness.
- Treat future product screens as concepts.
- Keep paragraphs concise.
- Make the Brunei connection visible but natural.

## 7. Colour system

### ByteWave colours

| Name | Value | Main use |
| --- | --- | --- |
| Navy | `#0B2A43` | Main text, dark panels, primary buttons |
| Navy 2 | `#123A5C` | Supporting text and secondary dark surfaces |
| Cloud | `#F7F5F1` | Main page background and light text |
| Emerald | `#0E7A5C` | Primary accent |
| Emerald dark | `#095C45` | Hover and active states |
| Marigold | `#E8A83C` | Warm highlight and keyboard focus |
| Orchid | `#8467A8` | Tourism accent |
| Orchid dark | `#6B4F8C` | Strong Tourism accent |
| Blush | `#D7A9C4` | Soft atmospheric accent |

### SideQuest.BN artwork colours

- Emerald: `#10B981`
- Dark forest: `#022C22`
- Gold: `#D4AF37`

## 8. Typography

Use:

- Space Grotesk for headings
- Inter for body and interface text
- IBM Plex Mono only for selected technical labels

Typography rules:

- Headings use weight 400 or 500.
- Body copy uses weight 400 or 500.
- Buttons, menu labels, form labels, contact details, footer copy, and product metadata use weight 500.
- Do not use weight 300.
- Do not make everything bold.
- Maintain consistent text weight throughout the website.
- Use clear line height and sufficient letter spacing for small text.

## 9. Global visual direction

Use a warm cloud-coloured background with a subtle digital atmosphere.

Recommended visual details:

- Low-contrast blue-green node pattern
- Very soft emerald, blush, and marigold glows
- Floating glass-like content containers
- Fine borders
- Soft shadows
- Rounded corners between 18px and 40px
- Spacious cards
- Large editorial headings
- Strong text contrast

Animations must support the content rather than distract from it.

## 10. Layout system

- Maximum content width: approximately 1400px
- Desktop width: approximately 92 to 94 percent of the viewport
- Mobile width: approximately 90 to 94 percent of the viewport
- Maintain consistent vertical spacing between sections
- Use grid and flexbox for layout
- Avoid fixed content heights that clip text
- Prevent horizontal overflow at every viewport width

## 11. Scrolling requirements

Use natural browser scrolling on all devices.

Required behavior:

- Do not use full-page scroll snapping.
- Do not intercept mouse-wheel movement.
- Do not intercept vertical touchscreen movement.
- Android users must be able to scroll when touching product artwork.
- Use `touch-action: pan-y` on interactive product surfaces where needed.
- Avoid nested scroll containers unless absolutely necessary.
- Anchor links should scroll smoothly unless reduced motion is enabled.

## 12. Animation requirements

### Reveal animations

- Content begins slightly lower with reduced opacity.
- Content animates into view when entering the viewport.
- Content returns to its hidden state after leaving the viewport.
- The animation replays when the user scrolls back to the content.
- Use IntersectionObserver.

### Reduced motion

When `prefers-reduced-motion: reduce` is enabled:

- Disable reveal movement.
- Disable smooth scrolling.
- Disable rotating text and ambient looping animation.
- Show all content immediately.

### Performance

- Reduce animation complexity on mobile.
- Reduce animation complexity for save-data connections and lower-performance devices.
- Stop animation when the browser tab is hidden.
- Provide a static visual fallback when WebGL is unavailable.

## 13. Header

Create a floating fixed header near the top of the viewport.

Desktop layout:

- Menu control on the left
- ByteWave brand in the centre
- Start a Project action on the right

Mobile layout:

- Menu icon on the left
- ByteWave logo in the centre
- Compact project action on the right
- Hide the long brand name if space is limited

Header styling:

- Cloud-coloured translucent panel
- Fine navy border
- Rounded corners
- Soft shadow
- Approximately 60px to 64px high
- Minimum 44px controls

## 14. Menu

### Trigger

- Use a clean three-line icon on mobile.
- Desktop may display the word "Menu" beside the icon.
- Centre the icon precisely.
- Update `aria-expanded` when opened.
- Use an accessible label that changes between open and close.

### Drawer

- Open from the left.
- Use the same responsive menu concept on desktop and mobile.
- Desktop drawer maximum width: approximately 420px.
- Do not make the desktop drawer cover the entire screen.
- Mobile drawer may use the full available width when required.
- Add a translucent dark backdrop over the remaining page.
- Ensure the fixed header does not block the top of the drawer.
- Animate the drawer smoothly from left to right.
- Lightly stagger the navigation-link entrances.

Links:

- Home
- About
- Services
- Products
- Insights
- Contact

Also include:

- `Aziq.bytewavedigital@gmail.com`

Close the drawer when:

- A navigation link is selected
- The backdrop is selected
- Escape is pressed
- The close control is selected

Lock background page scrolling while the menu is open.

## 15. Hero section

### Content

Eyebrow:

"A digital company from Brunei"

Heading:

"We turn ideas into digital products."

Introduction:

"Got an idea that deserves to exist? We can help you shape it, build it, and get it into the hands of real people. We make websites, software, and digital products here in Brunei."

Buttons:

- Start a Project
- Explore Our Work

### Layout

- Two columns on desktop
- Copy on the left
- ByteWave visual on the right
- Stack vertically on mobile
- Put hero copy inside a light translucent panel
- Keep button text centred

### Hero visual

Use the ByteWave transparent logo as the main visual.

Optional enhancement:

- Circular text orbit around the logo
- Subtle Three.js wave surface
- Small floating digital particles
- Gentle pointer response on desktop

The animation must remain subtle and must not reduce text readability.

## 16. About section

Heading:

"About us"

Tagline:

"Made in Brunei. Built for real life."

Description:

"ByteWave Digital Enterprise is a small Brunei team with a genuine interest in how technology can make work and everyday life better. We take time to understand the problem, speak plainly, and make things people will actually want to use."

### Business pillars

1. Product platforms
2. IT consulting
3. Software solutions
4. CSR and community

Display the pillars as an accessible one-card-at-a-time carousel.

Requirements:

- Previous and next controls
- Keyboard navigation
- Pause automatic movement during hover, focus, and manual interaction
- Disable automatic movement under reduced motion
- Do not block vertical touch scrolling

## 17. Services section

Heading:

"What we do"

Tagline:

"Ways we can help you build."

Description:

"You might have a sketch, a frustrating process, or an existing product that needs attention. Wherever you are starting from, we will meet you there."

### Service cards

1. Web development
2. Software development
3. UI/UX design
4. AI and automation
5. Data and analytics
6. Digital transformation
7. Cloud and deployment
8. Product strategy and consulting

Requirements:

- Centre all card headings and descriptions.
- Use consistent medium-weight typography.
- Use generous padding.
- Add a light hover lift on devices that support hover.
- Provide accessible previous and next controls if displayed as a carousel.
- Keep vertical page scrolling available on touch devices.

## 18. Products section

Heading:

"Our products"

Tagline:

"Ideas shaped by life in Brunei."

Create an accessible two-product carousel.

Required controls:

- Previous and next buttons
- Product selection dots
- Left and right keyboard navigation
- Home and End keyboard navigation
- Accessible live product status
- Smooth transitions
- Immediate transitions under reduced motion

Do not use touch dragging for the product carousel if it interferes with vertical scrolling.

### Product 1: SideQuest.BN

Status:

"Early Access"

Kicker:

"A ByteWave-owned digital platform"

Description:

"SideQuest.BN began with a simple question: what interesting things are happening nearby that people never hear about? We are building a place to make those opportunities easier to find."

Chips:

- Local platform
- Early access

Use the supplied SideQuest.BN future master overview as the main visual.

The visual should communicate:

- Geofenced quest radar
- Task or quest posting
- Applicants and matching
- Active quest tracking
- Wallet or escrow concept

Treat these screens as future concepts. Do not claim that every feature is already operational.

Use SideQuest.BN emerald, dark forest, and gold within its product artwork.

### Product 2: SideQuest Tourism

Description:

"We are exploring a more personal way to discover Brunei: through the places, people, food, and stories that give each area its character."

Chip:

- Tourism technology

Use the supplied SideQuest Tourism master product overview as the main visual.

Add smaller supporting Brunei experience images, including:

- Kampong Ayer
- Ambuyat
- Ulu Temburong when space allows

Requirements:

- Keep the product interface central.
- Avoid excessive cropping.
- Do not make the interface too wide on desktop.
- Do not make it too thin on mobile.
- Use a creative asymmetric composition.
- Do not add fake device frames that make the product unreadable.

## 19. Process section

Heading:

"How we work"

Tagline:

"We build it with you."

Description:

"No disappearing into a black box. We share the work as it develops, explain the choices in plain language, and make the important decisions together."

Steps:

1. Discover
2. Define
3. Design
4. Deliver

Display four cards on desktop and a single-column stack on mobile.

## 20. Insights section

Heading:

"From our notebook"

Tagline:

"A few things on our minds."

Required insights:

1. Why Brunei-first digital products matter
2. What MSMEs need from a software partner
3. How tourism technology can lift local experiences

Each Read insight control should open an accessible native dialog.

Dialog requirements:

- Clearly labelled title
- Visible close button
- Escape support
- Backdrop closing
- Keyboard focus support
- Background scroll lock

## 21. Contact section

Heading:

"Let's talk"

Tagline:

"Got something in mind?"

Description:

"It does not need to be a finished brief. Tell us what you are trying to do, what is getting in the way, or simply what you have been thinking about. We will take it from there with you."

Contact details:

- Email: `Aziq.bytewavedigital@gmail.com`
- Telephone: `+673 819 4908`
- Location: `Bandar Seri Begawan, Brunei`

### Local demonstration form

Fields:

- Name, required
- Email, required
- Organisation, optional
- Service
- Timeline
- Message, required

Service choices:

- Web development
- Software development
- UI/UX design
- AI and automation
- Data and analytics
- Digital transformation
- Cloud and deployment
- Product strategy and consulting

Local behavior:

- Validate the form in the browser.
- Focus the first invalid field.
- Apply `aria-invalid` to invalid fields.
- Require at least 20 characters for the message.
- Disable the button briefly during the local demonstration submission.
- Display a clear demonstration message such as: "Local preview only. Your inquiry has not been sent. Please email us directly."
- Do not claim that an email was delivered.
- Keep the direct email link visible.
- Do not require a local database or mail server.

## 22. Footer

Include:

- ByteWave Digital Enterprise brand
- "Ideas into Digital Reality."
- Dynamic current year
- "Bandar Seri Begawan, Brunei"
- Back to top link

## 23. Responsive requirements

### Desktop, 1101px and above

- Two-column hero
- Partial-width menu drawer
- Wide product cards
- Four process cards
- Side-by-side contact layout

### Tablet, 821px to 1100px

- Reduce heading sizes and gaps gradually
- Preserve comfortable card padding
- Keep product artwork readable
- Avoid horizontal overflow

### Mobile, 820px and below

- Stack major layouts vertically
- Use one-column content layouts
- Keep controls at least 44px
- Keep product artwork large enough to understand
- Ensure product artwork does not block scrolling
- Change form rows to a single column
- Wrap footer content naturally

### Small mobile, 560px and below

- Hide non-essential header text if required
- Use full-width hero buttons
- Reduce padding carefully
- Preserve readable headings and body text
- Avoid clipping at 320px width

## 24. Accessibility requirements

- Use semantic header, nav, main, section, dialog, form, and footer elements.
- Add a skip link to the main content.
- Give every section an accessible heading.
- Maintain WCAG AA text contrast.
- Use a visible marigold keyboard focus indicator.
- Use meaningful alternative text for product images.
- Use empty alternative text for decorative images.
- Give all controls accessible names.
- Support keyboard operation for carousels and menu controls.
- Use `aria-live` for carousel and form status.
- Use `aria-expanded` and `aria-hidden` correctly in the menu.
- Respect reduced motion.
- Never remove focus outlines without providing an accessible replacement.

## 25. Performance requirements

- Lazy-load images below the hero.
- Use WebP for photographs when possible.
- Provide stable image containers to prevent layout shift.
- Limit Three.js pixel ratio and frame rate.
- Reduce particle and geometry counts on mobile.
- Avoid unnecessary libraries.
- Do not block initial page rendering on animation code.
- Stop animation work while the browser tab is hidden.

## 26. Local running instructions

### Static website

Run a local server from the new website folder:

```powershell
python -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000/
```

### Vite website

If the new implementation uses Vite:

```powershell
npm install
npm run dev
```

Open the localhost address shown by Vite.

## 27. Local acceptance checklist

### Content

- [ ] Every required section is present.
- [ ] Contact information is accurate.
- [ ] SideQuest concepts are described honestly.
- [ ] No obsolete "Online" or "Building in Brunei" text appears.
- [ ] No obsolete "Product overview," "Tourism technology concept," or "Concept stage" labels appear.

### Visual quality

- [ ] Text contrast is strong.
- [ ] Interface fonts do not look thin.
- [ ] Buttons are centred.
- [ ] Service-card text is centred.
- [ ] Product interfaces remain readable.
- [ ] The design does not look like a generic template.

### Menu

- [ ] Drawer opens from the left.
- [ ] Desktop drawer does not cover the whole screen.
- [ ] Header does not block the drawer.
- [ ] Menu works with mouse, touch, and keyboard.
- [ ] Escape and backdrop closing work.

### Scrolling and motion

- [ ] Natural scrolling works.
- [ ] Android-style touch scrolling works on product artwork.
- [ ] Full-page snapping is absent.
- [ ] Reveal animations replay.
- [ ] Reduced-motion mode works.

### Responsive behavior

- [ ] No overflow at 320px.
- [ ] No overflow at 375px.
- [ ] Layout works at 768px.
- [ ] Layout works at 1024px.
- [ ] Layout works at 1440px.

### Functionality

- [ ] Menu works.
- [ ] Anchor links work.
- [ ] Carousels work.
- [ ] Insight dialogs work.
- [ ] Local form validation works.
- [ ] Local form clearly states that nothing was sent.
- [ ] No console errors appear during normal use.

## 28. Ready-to-copy AI build prompt

```text
Create a completely new ByteWave Digital Enterprise website for localhost development.

Read `implementation.md` completely before writing code. Treat it as the primary source of truth for the design, content, interactions, responsive behavior, accessibility, assets, and local testing requirements.

This is a new localhost-only website. Do not modify an older website. Create the new website in a separate folder and keep every feature self-contained for local use.

Use semantic HTML, maintainable CSS, and vanilla JavaScript unless there is a clear reason to use React and Vite. The website must start locally with a simple command and must not require external accounts.

Implement the whole website. Do not only provide a plan.

Required sections:
- Floating responsive header
- Partial left-side navigation drawer
- Hero
- About
- Services
- Products
- Process
- Insights
- Contact
- Footer

Use all exact content, colours, typography, product requirements, accessibility rules, and responsive behavior from `implementation.md`.

Important rules:
- Use natural browser scrolling.
- Do not implement full-page scroll snapping.
- Do not intercept wheel or vertical touch input.
- Android-style scrolling must work while touching product artwork.
- Reveal animations must replay when content re-enters the viewport.
- Respect reduced motion.
- Keep interface text medium-weight and consistent.
- Centre button labels and service-card text.
- Keep product interfaces readable on desktop and mobile.
- Use the supplied ByteWave, SideQuest.BN, and SideQuest Tourism assets.
- Do not use placeholder images when a supplied asset exists.
- Treat future SideQuest screens as concepts.
- Do not invent production features.
- Ensure all interactive controls work with keyboard, mouse, and touch.
- Prevent horizontal overflow down to 320px.

The contact form is a local demonstration only. Validate it in the browser, then show: "Local preview only. Your inquiry has not been sent. Please email us directly." Do not claim that an email was delivered.

After implementation:
1. Start the localhost website.
2. Test it at 320px, 375px, 768px, 1024px, and 1440px.
3. Test the menu, anchor links, carousels, dialogs, local form, keyboard controls, reduced motion, and touch scrolling over product images.
4. Check for console errors, missing assets, clipped content, unreadable text, and horizontal overflow.
5. Fix all issues found.
6. Give me the localhost address and a concise summary of the files created, features implemented, and tests completed.
```

## 29. Source-of-truth rule

Use this priority when building the new localhost website:

1. The user's latest instruction
2. This `implementation.md`
3. Supplied image assets
4. The AI's design judgement

Do not copy obsolete code, conflicting historical styles, old scrolling behavior, or previous layout experiments into the new website.
