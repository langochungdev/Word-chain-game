# UI Clone Spec 1:1 - Chatbox Game (frontend)

## 1) Muc tieu
Tai lieu nay la source of truth de clone giao dien chatbox game giong 100% ve bo cuc, mau, hieu ung, responsive, va hanh vi UI.

Neu can lam task UI tiep theo, PHAI bam sat tai lieu nay. Khong duoc tu y "lam dep hon", "toi uu hoa" hoac doi class/DOM neu chua xac minh pixel parity.

## 2) Nguon goc can copy
- DOM tham chieu: [src/App.vue](src/App.vue)
- CSS tham chieu: [src/style.css](src/style.css)
- Bootstrap mount: [src/main.js](src/main.js)
- Head script confetti + viewport: [index.html](index.html)
- Asset bat buoc:
  - [src/assets/bg.png](src/assets/bg.png)
  - [src/assets/foo515.cur](src/assets/foo515.cur)

## 3) Quy tac clone bat buoc
1. GIU NGUYEN class names, thu tu block, va cau truc panel nhu file goc.
2. GIU NGUYEN breakpoints responsive (`max-width: 767.98px`).
3. GIU NGUYEN dark mode branch (`@media (prefers-color-scheme: dark)`) theo style Win2K.
4. GIU NGUYEN cac id/selector dac thu:
   - `#chat-scroll`
   - `#composer-input`
   - `#playersOffcanvas`
   - `#showwiner` (chu y typo nay la co y, khong sua ten)
5. Khong doi text label UI neu muc tieu la clone 1:1.
6. Khong thay doi gia tri spacing/chieu cao quan trong trong chat/composer.

## 4) Bo cuc 1:1 (layout map)
1. Root shell
   - Wrapper: `.container-fluid.h-100dvh.app-shell`
   - Chia 2 tang:
     - Header: `.chat-header`
     - Main content: `.row.g-0.main-row`

2. Header (`.chat-header.border-bottom`)
   - Trai:
     - Nut mobile players: `.btn.btn-outline-secondary.btn-sm.d-inline-flex.d-md-none`
     - PIN room badge: `.badge.bg-dark.text-white` (an tren mobile qua `.hide-on-mobile`)
   - Giua:
     - Target badge clickable: `.badge.bg-primary.text-white.rounded-pill.px-3.py-2`
     - Inline style bat buoc: `font-size: 1rem; cursor: pointer; user-select: none;`
   - Phai:
     - Suggest switch Bootstrap: `.form-check.form-switch`

3. Main row
   - Desktop sidebar: `aside.col-md-4.d-none.d-md-flex.flex-column.border-end.players-panel`
   - Mobile sidebar: `.offcanvas.offcanvas-start.d-md-none`
   - Chat panel: `section.col-12.col-md-8.chat-panel.d-flex.flex-column.p-0`

4. Chat panel ben phai
   - Subheader diem: `.chat-subheader`
   - Scroll zone: `.chat-scroll.flex-grow-1.chat-scroll-reverse#chat-scroll`
   - Message row:
     - `.msg-row.other` (nguoi khac)
     - `.msg-row.me` (chinh minh)
   - Composer day panel: `.composer.border-top.shadow-top`
   - Suggest popup noi: `.suggest-box` (absolute, noi tren input)

5. Modal
   - Winner modal: `#showwiner.modal.d-block.text-center` + backdrop `.modal-backdrop.show`
   - Name modal join room: `.modal.d-block` + `.modal-backdrop.show`

## 5) Visual language va token can giu
1. Neon username
   - Ban than: `.neon-name`
     - Mau: `#00e0e1`
     - Multi-layer glow text-shadow
   - Nguoi khac: `.neon-name-orange`
     - Mau: `#ff7000`
     - Multi-layer glow text-shadow

2. Bong bong chat
   - Nguoi khac:
     - Nen: `#fff`
     - Border: `1px solid #edf0f3`
     - Goc duoi trai: `6px`
   - Ban than:
     - Nen: `#4da3ff`
     - Chu: `#fff`
     - Goc duoi phai: `6px`
   - Duoi bong bong dung pseudo element `::after` cho ca 2 ben.

3. Nen va blur
   - App shell co background image `bg.png` full cover.
   - `.chat-scroll`, `.composer`, `.chat-header` dung nen trong suot + `bg.png` + `backdrop-filter: blur(2px)`.
   - Player card body dung frosted glass blur (`blur(12px) saturate(160%)`).

4. Cursor custom
   - `input`, `textarea`, `html`, `body` dung cursor `foo515.cur`.

5. Error float
   - `.error-float` la text do, absolute, noi tren input (`top: -26px`), co blur nen.

## 6) Kich thuoc va spacing quan trong
1. Shell
   - `.h-100dvh { height: 100dvh; }`
   - `html, body { overflow: hidden; }`

2. Chat scroll
   - `padding-bottom: 88px` (desktop)
   - Mobile: `padding: 8px 4px 72px 4px`

3. Composer/input
   - `.composer`: `position: relative`, khong sticky
   - `.chat-input` desktop:
     - `font-size: 1.06rem`
     - `height: 3.1rem`
   - `.chat-input` mobile:
     - `font-size: 1.08rem`
     - `height: 2.8rem`

4. Message density
   - `.msg-row { margin-bottom: 10px; max-width: 80%; }`
   - Mobile `.msg-row { max-width: 98%; }`
   - `.msg-text { font-size: 1.05rem; line-height: 1.4; }`

## 7) Responsive clone rules
1. Breakpoint duy nhat clone: `@media (max-width: 767.98px)`
2. Mobile phai:
   - An PIN qua `.hide-on-mobile`
   - Hien nut mo players offcanvas
   - Chat panel full width viewport
   - Composer gon lai (padding nho hon)
3. Khong them breakpoint moi neu muc tieu la 1:1.

## 8) Dark mode clone rules (Win2K Classic)
1. Bat buoc giu branch `@media (prefers-color-scheme: dark)`.
2. Font family bat buoc: `MS Sans Serif, Tahoma, Geneva, Verdana, sans-serif`.
3. Header dark:
   - Nen `#0a246a`
   - Chu trang
4. Bubble, button, chip, badge theo kieu 3D Win2K (box-shadow 2 lop, border xam).
5. Khong thay branch dark mode bang theme hien dai neu muc tieu clone 1:1.

## 9) Motion/overlay states can giong
1. Winner modal luon top:
   - `.modal.d-block { z-index: 2000 }`
   - `.modal-backdrop.show { z-index: 1999 }`
2. Winner panel trong suot blur:
   - `#showwiner .modal-content` dung blur manh + bo goc 20px.
3. Suggest box noi tren composer voi `z-index: 1000`.

## 10) Chuoi text va icon can giu nguyen
- `👥 Người chơi`
- `PIN phòng:`
- `🎯 Target:`
- `Gợi ý`
- `🏁 Người chiến thắng!`
- `Nhập tên để tham gia`
- `Vào phòng`
- `Nhập tin...`
- `Gửi`
- Huy hieu score: `🏆`

## 11) Cach clone de dam bao 1:1
1. Copy nguyen block template chat tu [src/App.vue](src/App.vue) (phan UI).
2. Copy nguyen file [src/style.css](src/style.css) khong doi selector.
3. Dam bao import Bootstrap nhu [src/main.js](src/main.js).
4. Dam bao script confetti trong [index.html](index.html).
5. Dam bao co 2 assets `bg.png` va `foo515.cur` dung duong dan tuong doi nhu file goc.

## 12) Checklist nghiem thu 1:1
1. Desktop >= 768px
   - Sidebar trai hien, offcanvas an.
   - Header co 3 cum trai-giua-phai dung vi tri.
   - Chat bubble me/oher mau dung, duoi bubble dung huong.
2. Mobile < 768px
   - Nut `👥 Người chơi` hien.
   - Offcanvas mo/close dung.
   - Input va button khong tran viewport.
3. Dark mode
   - Chuyen giao dien Win2K day du.
4. Modal
   - Name modal va winner modal overlap dung, backdrop dung do mo.
5. Asset
   - Nen `bg.png` hien.
   - Cursor custom hien tren input/textarea/body.

## 13) Dinh nghia "clone 100%" cho team sau
Clone 100% = giong class, giong CSS value, giong breakpoints, giong state (normal/mobile/dark/modal), giong text/icon. Bat ky thay doi nao ve spacing, color, border radius, box-shadow, font-size, positioning deu phai xem la sai khac so voi ban goc.
