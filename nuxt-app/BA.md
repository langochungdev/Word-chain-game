# BA Specification - Word Chain Room System (Nuxt + Firestore)

## 1) Muc tieu nghiep vu
Xay dung co che tao phong va vao phong ngay tren root page, su dung Firestore realtime, khong can backend rieng.

Muc tieu chinh:
- Nguoi dung vao root page / se nhap ten bat buoc truoc.
- Sau khi co ten, nguoi dung co the:
  - Tao phong moi voi slug 4 chu so.
  - Nhap ma de vao phong.
  - Chon phong public dang mo tu danh sach ben phai de vao truc tiep.
- Moi phong co tuy chon:
  - Dat ma 4 so thu cong hoac de he thong cap ma.
  - Public hoac Private.
- He thong uu tien toi uu cho Firestore va kha nang host free tren Vercel.

## 2) Pham vi
Trong pham vi:
- Home page / gom Name Gate + Join/Create + Public Room List.
- Room page /room/[slug].
- Dong bo realtime bang Firestore onSnapshot.
- Quan ly vong doi phong va participant co ban.

Ngoai pham vi (phase sau):
- Dang nhap tai khoan day du (email/social).
- Matchmaking nang cao.
- Moderation nang cao (ban theo IP, anti-cheat phuc tap).

## 3) Dinh nghia vai tro
- Visitor: vua vao app, chua nhap ten.
- Player: da nhap ten, co the tao phong/vao phong.
- Host: player tao phong, co quyen quan tri co ban trong phong.

## 4) Luong nghiep vu chinh
### 4.1 Name Gate bat buoc
1. Nguoi dung truy cap /.
2. Hien form nhap ten full-screen modal/blocking.
3. Neu ten hop le moi cho phep dong form va mo Home.
4. Luu ten vao local storage de tai su dung lan sau.

### 4.2 Home - Join/Create
Sau khi qua Name Gate, Home co 2 vung:
- Ben trai:
  - Form Join Room: nhap ma 4 so va nut Vao phong.
  - Form Create Room:
    - Room code (optional, 4 so).
    - Public toggle.
    - Nut Tao phong.
- Ben phai:
  - Danh sach phong public dang mo.
  - Moi item hien: ma phong, ten host, so nguoi, cap nhat gan nhat.
  - Nut Vao ngay.

### 4.3 Tao phong
1. Player bam Tao phong.
2. Neu co nhap code, validate 4 so.
3. Neu khong nhap code, he thong cap code ngau nhien 4 so chua ton tai.
4. Tao room document thanh cong thi dieu huong den /room/[slug].

### 4.4 Vao phong bang ma
1. Player nhap ma 4 so.
2. Kiem tra phong ton tai va dang mo.
3. Neu phong private van cho phep vao neu biet ma/link.
4. Join thanh cong thi dieu huong den /room/[slug].

### 4.5 Vao phong tu danh sach public
1. Player chon 1 item ben phai.
2. He thong join truc tiep.
3. Dieu huong den room page.

## 5) Quy tac nghiep vu (Business Rules)
- BR-01: Ten nguoi dung bat buoc, trim space, do dai 2-24 ky tu.
- BR-02: Room slug bat buoc dung format 4 chu so (0000-9999).
- BR-03: Slug la duy nhat trong cac phong dang ton tai.
- BR-04: Neu user tu dat code da ton tai thi bao loi va khong tao phong.
- BR-05: Neu auto-generate gap trung ma thi thu lai toi da N lan (de xuat N=20).
- BR-06: Room co 2 che do hien thi:
  - isPublic=true: hien thi o danh sach Home.
  - isPublic=false: khong hien thi danh sach, chi vao bang ma/link.
- BR-07: Room status gom open, playing, closed.
- BR-08: Chi room status=open moi hien ben danh sach phong mo.
- BR-09: Host la nguoi tao phong dau tien.
- BR-10: Khi host roi phong, he thong chuyen host cho member vao som nhat; neu khong con ai thi dong phong.
- BR-11: So nguoi toi da moi phong co cau hinh (de xuat mac dinh 8, max 20).
- BR-12: Neu phong full thi chan join va hien thong bao.
- BR-13: Co che stale room cleanup de giai phong ma (dua vao lastActivityAt).
- BR-14: Moi tac vu ghi Firestore phai co kiem tra quyen qua rules.
- BR-15: Nguoi dung khong duoc doi ten cua nguoi khac va khong duoc sua room khong thuoc quyen.

## 6) Truong hop bien va xu ly
- EC-01: Hai nguoi cung tao cung 1 ma custom cung luc.
  - Xu ly: Firestore transaction/create-if-not-exists de tranh race condition.
- EC-02: User refresh trang trong room.
  - Xu ly: rejoin bang profile name luu local + anonymous identity.
- EC-03: User mat ket noi tam thoi.
  - Xu ly: cap nhat online state theo heartbeat; reconnect tu dong.
- EC-04: Room private bi lo ma.
  - Xu ly phase 2: them optional passcode phong.
- EC-05: Room list qua dai.
  - Xu ly: phan trang + limit 20 item + sap xep theo updatedAt giam dan.
- EC-06: Het ma 4 so trong gio cao diem.
  - Xu ly: thong bao het slot tam thoi + stale cleanup + retry sau.

## 7) Firestore architecture de xuat

Tree map:

firestore
└── rooms (collection)
    └── {slug4} (document)
        ├── slug: string (4 digits)
        ├── hostUid: string
        ├── hostName: string
        ├── isPublic: boolean
        ├── status: string (open|playing|closed)
        ├── maxPlayers: number
        ├── playerCount: number
        ├── createdAt: timestamp
        ├── updatedAt: timestamp
        ├── lastActivityAt: timestamp
        ├── gameState (map)
        │   ├── targetScore: number
        │   ├── currentTurnUid: string
        │   ├── lastWord: string
        │   └── winner (map|null)
        ├── members (subcollection)
        │   └── {uid} (document)
        │       ├── displayName: string
        │       ├── role: string (host|player)
        │       ├── score: number
        │       ├── isOnline: boolean
        │       ├── joinedAt: timestamp
        │       └── lastSeenAt: timestamp
        └── messages (subcollection)
            └── {messageId} (document)
                ├── uid: string
                ├── displayName: string
                ├── text: string
                ├── points: number
                └── createdAt: timestamp

Ghi chu thiet ke:
- Dung slug 4 so lam document id de dam bao uniqueness don gian.
- playerCount duoc cap nhat transaction de query nhanh.
- lastActivityAt phuc vu sort va stale cleanup.
- Khong tao snapshots subcollection neu chua can de giam chi phi.

## 8) Truy van va index can co
Truy van chinh:
- Home public list:
  - where isPublic == true
  - where status == open
  - orderBy updatedAt desc
  - limit 20
- Messages room:
  - orderBy createdAt desc
  - limit 50

Composite index can khai bao:
- rooms: isPublic ASC, status ASC, updatedAt DESC.

## 9) Firestore security policy (muc BA)
Nguyen tac:
- Moi write phai xac dinh identity (anonymous auth cung duoc).
- Chi host duoc sua cac truong quan tri room (isPublic, status, maxPlayers).
- Member chi duoc sua document member cua chinh minh (score theo luat game).
- Message chi duoc tao moi, khong cho update/delete tu client (tranh gian lan).
- Cam client set server time tuy y cho cac truong quan trong neu co API route ho tro.

## 10) Kien truc Nuxt de xuat
Route:
- / : Home + Name Gate + Join/Create + Public Room List
- /room/[slug] : Man hinh phong

Thanh phan frontend:
- plugins/firebase.client
- composables/useProfile
- composables/useRooms
- composables/useRoom
- composables/usePresence

State va luong:
- Name gate state luu local storage + reactive global state.
- Home dang ky 1 listener public rooms.
- Room page dang ky listeners:
  - room document
  - members subcollection
  - messages (limited)

## 11) API route (chi khi can), van tuan thu free Vercel
Mac dinh khong can backend rieng.

Neu can xu ly quyen nang cao, chi dung Nuxt server API route:
- POST /api/rooms/create
  - Muc dich: tao room an toan voi server timestamp, transaction.
- POST /api/rooms/cleanup
  - Muc dich: dong stale rooms theo lich.

Nguyen tac tiet kiem free tier:
- Han che API route, uu tien doc/ghi truc tiep Firestore client.
- Khong chay job lien tuc; chi cleanup theo event hoac lich thap tan suat.

## 12) Huong dan thiet ke UI
### Home page / layout
- Header don gian: ten app + profile mini.
- Main 2 cot desktop:
  - Trai (60-65%): Join/Create card.
  - Phai (35-40%): danh sach phong public dang mo.
- Mobile: chuyen thanh 1 cot, room list dat ben duoi.

### Name Gate
- Blocking modal ngay khi vao app.
- 1 input ten + nut Xac nhan.
- Co thong bao loi ro rang neu ten khong hop le.
- Chua xac nhan ten thi vo hieu toan bo thao tac join/create.

### Create Room form
- Field Room code optional (placeholder: De trong de auto).
- Toggle Public room.
- CTA Tao phong.
- Hien error inline: ma khong dung 4 so, ma da ton tai, room full capacity he thong.

### Public Room List
- Moi item: slug, host, playerCount/maxPlayers, trang thai.
- Nut Vao phong.
- Empty state: Chua co phong public nao dang mo.

### UX bo sung
- Loading skeleton cho room list.
- Toast thong bao ket qua join/create.
- Confirm dialog khi roi phong neu dang choi.

## 13) Rang buoc chi phi va hieu nang (Firestore + Vercel free)
- Han che so listener dong thoi tren Home (chi 1 listener list phong).
- Room page toi da 3 listener can thiet.
- Limit messages theo cua so (VD 50 ban ghi moi nhat).
- Phan trang room list, khong load tat ca.
- Cap nhat bat dong bo theo batch khi co the.
- Don stale room de giam read/write vo ich.

## 14) Acceptance criteria tong hop
- AC-01: User vao / bat buoc nhap ten moi su dung app.
- AC-02: User co the tao room voi ma custom 4 so hoac auto.
- AC-03: User co the set public/private khi tao room.
- AC-04: Room public hien thi ben phai Home va vao truc tiep duoc.
- AC-05: User nhap ma 4 so de vao phong duoc neu phong ton tai va mo.
- AC-06: Tat ca realtime dong bo qua Firestore onSnapshot.
- AC-07: Kien truc van van hanh duoc tren Vercel free.

## 15) Open questions can chot voi stakeholder
- O private room co can them mat khau phong khong?
- So nguoi toi da moi phong chot la bao nhieu?
- Room stale timeout la bao nhieu phut?
- Co can role spectator khong?
- Co can lich su room/messages sau khi room dong khong?

## 16) De xuat lo trinh implementation
Phase 1:
- Name Gate + Home Join/Create + Public Room List + Room join by slug.

Phase 2:
- Presence on/offline + host transfer + stale cleanup.

Phase 3:
- Nguon luc toi uu chi phi, theo doi metric read/write, bo sung guard rails.
