# TimeMaster — CLAUDE.md

프로젝트 개요와 작업 이력을 기록한 문서입니다.
AI가 작업하기 전에 반드시 읽어야 합니다.

---

## 프로젝트 기본 정보

- **앱 이름**: TimeMaster (패키지명: elon-timebox)
- **스택**: Electron + React 18 + TypeScript + Vite
- **CSS**: 모든 스타일은 `src/index.css` 단일 파일에 집중
- **데이터 저장**: Electron의 파일 기반 스토어 (`timemaster-data.json`, userData 경로)
- **진입점**: `main.js` (Electron 메인 프로세스), `src/main.tsx` (React)

---

## 확정된 파일 구조

```
planmaster/
├── main.js              # Electron 메인 프로세스 (수정 가능)
├── preload.js           # contextBridge IPC 노출 (수정 가능)
├── src/
│   ├── App.tsx          # 루트 컴포넌트 + 패널 리사이저 + 뷰 모드 분기
│   ├── main.tsx         # React 진입점
│   ├── index.css        # ★ 모든 CSS의 단일 소스 (수정 가능)
│   ├── types.ts         # 공유 타입 정의 (TimeBlock, MasterTask, ModalData)
│   ├── components/
│   │   ├── Header.tsx         # 날짜 네비게이터 + 드롭다운 메뉴 + 뷰 모드 토글
│   │   ├── MasterTasksPanel.tsx  # 할 일 목록 패널
│   │   ├── TimeboxPanel.tsx   # 타임박스 그리드 패널
│   │   ├── CalendarView.tsx   # 캘린더 뷰 (월별 마스터 태스크 표시)
│   │   └── BlockModal.tsx     # 블록 추가/수정 모달
│   ├── contexts/
│   │   ├── DataContext.tsx    # 블록·할 일·메모장 데이터 상태
│   │   └── SettingsContext.tsx  # 앱 설정 상태 (viewMode 포함)
│   └── utils/
│       ├── i18n.ts      # 한/영 번역 유틸리티 + COLOR_PALETTE
│       └── backup.ts    # 수동 내보내기/가져오기
└── github-upload/       # 배포용 참조 스냅샷 (수정 금지, 복구 기준점)
```

---

## 구현 완료 기능 (IMPROVEMENTS.md 기준)

### 할 일 관리
- **드래그 앤 드롭 정렬**: `MasterTasksPanel`에서 `taskReorderId` dataTransfer 키로 목록 내 재정렬 구현
  - `text/plain`(타임박스 드롭)과 구분하여 두 드래그 동작이 공존
- **우클릭 색상 지정**: 할 일 우클릭 → 컨텍스트 메뉴 → 8가지 색상 선택 → `MasterTask.color` 저장
  - 색상은 `task-color-bar` (좌측 4px 바)로 표시

### 타임박스
- **블록 우클릭 색상 지정**: `TimeBlock.color` 필드, 블록 배경/테두리에 적용
  - 컨텍스트 메뉴는 `position: fixed`로 스크롤 영역 밖에 표시
- **위쪽 리사이즈**: 블록 상단 핸들(`block-resize-handle top`) — `startTime` 변경, 하단 고정
- **아래쪽 리사이즈**: 블록 하단 핸들(`block-resize-handle bottom`) — `duration` 변경, 상단 고정
- **이동 겹침 체크 수정**: 표준 인터벌 공식 `a1 < b2 AND a2 > b1` 으로 교체 (기존 3-조건 OR 방식 버그 제거)

### 시각적 커스텀
- **다국어 (한/영)**: `src/utils/i18n.ts`의 `t(language, key)` 함수, 메뉴에서 전환 가능
- **저사양 모드**: `performance-mode` CSS 클래스 — backdrop-filter, transition, animation, box-shadow 일괄 비활성화

### 데이터 / 시스템
- **자동 백업**: 앱 종료 시 `before-quit` 이벤트에서 `backups/timemaster-backup-YYYY-MM-DD.json` 저장 (최근 7개 유지)
- **IPC `save-backup`**: 렌더러에서 수동 호출 가능 (`electronAPI.saveBackup()`)
- **전역 단축키 Ctrl+Alt+T**: 앱 표시/숨김 토글 (main.js의 `globalShortcut`)

### 캘린더 뷰
- **뷰 모드 토글**: 헤더 메뉴 버튼 왼쪽에 `타임박스 | 캘린더` 버튼 배치
  - `SettingsContext`의 `viewMode: 'timebox' | 'calendar'` 상태로 관리 (세션 전용, 저장 안 함)
  - `App.tsx`에서 `viewMode === 'calendar'`이면 `<CalendarView />`로 전체 교체, 아니면 기존 패널 구조 유지
- **CalendarView**: `src/components/CalendarView.tsx`
  - 마운트 시 `electronAPI.readStore()` 전체 읽기 → `tasks-YYYY-MM-DD` 키 파싱 → 모든 날짜 태스크 보유
  - 헤더 날짜 이동 버튼과 월 연동 (`selectedDate`의 년·월 변경 시 `calendarMonth` 동기화)
  - 각 날짜 셀: 태스크 최대 3개 표시, 초과 시 `+N개 더...` 표시
  - 완료된 태스크 → `text-decoration: line-through` + 투명도 낮춤
  - 태스크 색상 있으면 왼쪽 2px 색상 바 표시 (`borderLeftColor`)
  - **호버 툴팁**: `position: fixed` 마우스 위치 기준, 해당 날 전체 태스크 표시, `pointer-events: none`

### UX
- **스마트 포커스 v2**: 날짜가 오늘로 변경될 때 — 진행 중 블록이 있으면 해당 블록 기준, 없으면 현재 시간선 1/3 위치로 스크롤

---

## 손대지 말아야 할 것들

### 절대 수정 금지
| 대상 | 이유 |
|------|------|
| `github-upload/` 폴더 전체 | 복구 기준점(ground truth). 메인 폴더가 망가졌을 때 비교 기준 |
| `DataContext.tsx`의 마이그레이션 로직 (localStorage → file store) | 이미 마이그레이션 된 사용자 데이터 손실 위험 |
| `main.js`의 `readStore` / `writeStore` 파일 경로 (`timemaster-data.json`) | 경로 변경 시 기존 사용자 데이터 유실 |
| `preload.js`의 기존 IPC 채널명 | 렌더러와 메인 프로세스 간 계약, 변경 시 기능 전체 마비 |

### 건드리면 안 되는 CSS 클래스 (레이아웃 핵심)
- `.widget-container` — 전체 앱 레이아웃 컨테이너
- `.drag-handle` — `-webkit-app-region: drag` 창 이동 핸들
- `.content-area` — 타임박스 스크롤 영역
- `.grid-container` / `.time-blocks-layer` — 타임박스 그리드 구조
- `.time-blocks-layer.dragging-active .time-block { pointer-events: none }` — 드래그 중 블록이 grid-row drop 이벤트 가로채지 않도록 하는 규칙

### 삭제하지 말 것
- `src/index.css` — Gemini가 이미 한 번 71줄로 압축해버린 전력이 있음. github-upload 버전(701줄)이 정본
- `src/utils/i18n.ts`의 `COLOR_PALETTE` export — `MasterTasksPanel`, `TimeboxPanel` 양쪽에서 공유
- `SettingsContext.tsx`의 `ViewMode` 타입 export — `Header`, `App` 등 여러 곳에서 참조

---

## 사용하지 않는 파일 (Gemini 잔재, 방치 중)

아래 파일들은 실제로 import되지 않으며 빌드에 영향을 주지 않지만 아직 삭제하지 않았습니다.
삭제해도 무방하나 확인 후 진행할 것.

- `src/components/common/BlockModal.css`
- `src/components/features/calendar/TasksCalendarView.css`
- `src/components/features/tasks/MasterTasksPanel.css`
- `src/components/features/timebox/TimeboxPanel.css`
- `src/components/layout/Header.css`
- `src/components/layout/layout.css`
- `src/styles/global.css`
- `src/styles/variables.css`

---

## 작업 시 주의사항

1. **CSS는 `src/index.css` 하나에만** 추가/수정. 위의 사용하지 않는 CSS 파일들에 작성해도 반영되지 않음.
2. **타입 변경 시 `src/types.ts` 먼저** — `TimeBlock`, `MasterTask`에 필드 추가할 때 contexts/components 전파 확인.
3. **새 IPC 채널 추가 시** `preload.js`와 `main.js` 양쪽 동시 수정.
4. **`language` prop은 `useSettings()`에서** — BlockModal처럼 직접 prop으로 받는 컴포넌트는 부모에서 전달.
5. **드래그 이벤트 수정 시** `taskReorderId`(목록 재정렬)와 `text/plain`(타임박스 드롭) 두 dataTransfer 키가 공존하는 구조 유지.
6. **블록 드래그 이동 시** `onDragStart`에서 `timeBlocksLayerRef.current.classList.add('dragging-active')`, `onDragEnd`에서 제거 — React state가 아닌 DOM 직접 조작으로 리렌더 없이 pointer-events 차단.
7. **CalendarView의 전체 데이터 로드** — `electronAPI.readStore()`(인자 없이 호출)가 전체 스토어 반환. 캘린더 마운트 시 한 번만 로드, 이후 타임박스 수정 내용은 캘린더 재진입 시 반영됨.
8. **`setBlocks`는 함수형 업데이트 불가** — DataContext의 `setBlocks`는 `(v: TimeBlock[]) => void` 시그니처. `setBlocks(prev => ...)` 불가, 반드시 `setBlocks(blocks.map(...))` 형태로 사용.

---

---

## 2026-04-06 추가 예정 기능 (설계 중)

### 1. 타임박스 그리드 선 숨기기 ✅ 완료 (2026-04-06)
- 메뉴 토글 `showGrid: boolean` → `SettingsContext` + `show-grid` 키로 저장
- `TimeboxPanel`에 `.hide-grid` 클래스 조건부 적용
- 기본 블록: `linear-gradient(var(--block-bg), var(--block-bg)), rgb(var(--bg-rgb))` 레이어드 배경
- 컬러 블록: `linear-gradient(color+cc, color+cc), rgb(theme-bg)` — 색 유지 + 선 완전 차단
- 컬러 블록 보더 통일: 기존 `borderWidth 1px all-sides` → `borderLeftColor`만 교체해 4px left 유지

### 2. 플랜 상세 메모 기능
- 각 태스크/타임블록에 상세 메모를 달 수 있는 기능
- `MasterTask.memo?: string`, `TimeBlock.memo?: string` 타입 추가 필요
- **구현 방식 후보 (고민 중)**:
  - **안 A (현재 유력)**: 타임블록 → BlockModal에 memo textarea 통합 / 할 일 → 우클릭 컨텍스트 메뉴 "메모 편집" 모달
  - **안 B**: 우측 사이드 메모 패널 (레이아웃 변경 필요, 공간 좁아지는 단점)
  - **안 C**: 태스크 클릭 시 아래로 accordion 확장 (패널 좁아서 UX 불확실)
- 메모 있는 항목에 작은 아이콘(◆) 표시
- **상태**: 사용자 고민 중 — 방향 확정 후 구현

### 3. 링크 / 파일 바로가기 첨부
- 타임블록·메모·태스크에 URL, 로컬 파일, 앱 바로가기 연결
- `types.ts`에 `LinkItem { label: string; target: string; type: 'url' | 'file' }` 추가
- `TimeBlock.links?: LinkItem[]`, `MasterTask.links?: LinkItem[]`
- IPC 채널 추가 필요: `shell.openExternal()` (URL), `shell.openPath()` (파일/앱)
- BlockModal에서 링크 추가/삭제 UI / 태스크는 우클릭 → "링크 관리"
- **상태**: 설계 확정, 구현 대기

### 4. 미완료 태스크 내일로 넘기기 ✅ 완료 (2026-04-06)
- **메뉴 일괄 이동**: 헤더 메뉴 → "미완료 할 일 내일로 넘기기" → 현재 날짜 미완료 태스크 전체를 다음 날로 이동, 완료된 태스크는 유지
- **우클릭 개별 이동**: 태스크 우클릭 컨텍스트 메뉴 → "내일로 이동" → 해당 태스크만 다음 날로 이동 (completed: false 리셋)
- 자동 배너(하루 1회) 기능은 사용자 요청으로 제거

---

---

## 미해결 버그 / TODO

### 마스터 태스크 → 타임박스 드래그 시 메모·링크 미연동
- **현상**: 마스터 태스크를 타임박스 그리드로 드래그하면 새 TimeBlock이 생성되는데, 원본 MasterTask의 `memo`와 `links`가 복사되지 않음
- **원인**: `TimeboxPanel.tsx`의 드롭 핸들러에서 `title`만 가져와 블록 생성 (`{ id, startTime, duration, title }`)
- **수정 방향**: 드롭 시 `taskId`도 dataTransfer로 전달 → 해당 MasterTask의 `memo`, `links` 복사해서 TimeBlock 생성
- **상태**: ✅ 수정 완료 (2026-04-06)

---

*Last updated: 2026-04-06*
