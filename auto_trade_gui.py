import os
import sys
import io
import time
import json
import threading
import datetime
import traceback
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, scrolledtext, messagebox

# ============================================================
# 설정 파일
# ============================================================
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

DEFAULT_SLOT = {
    "broker":           "메리츠증권",
    "cert_order":       "1",
    "cert_password":    "",
    "account_order":    "1",
    "account_password": "",
    "telegram_token":   "",
    "sheet_url":        "",
    "sheet_name":       "",
    "symbol":           "",
}

DEFAULT_CONFIG = {
    "slots": [dict(DEFAULT_SLOT) for _ in range(5)],
    "slot_count":    5,
    "font_size":     "medium",
    "kiwoom_exe":    r"C:\KiwoomGlobal\bin\nfstarter.exe",
    "keep_hts":      False,
    "secret_key_path": "",
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            for k, v in DEFAULT_CONFIG.items():
                cfg.setdefault(k, v)
            while len(cfg["slots"]) < cfg["slot_count"]:
                cfg["slots"].append(dict(DEFAULT_SLOT))
            return cfg
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


# ============================================================
# 색상 / 폰트 상수
# ============================================================
BG_DARK   = "#1a1a2e"
BG_PANEL  = "#16213e"
BG_CARD   = "#0f3460"
BG_INPUT  = "#1a1a2e"
FG_WHITE  = "#e0e0e0"
FG_GRAY   = "#888888"
FG_BLUE   = "#4fc3f7"
FG_GREEN  = "#69db7c"
FG_RED    = "#ff6b6b"
FG_YELLOW = "#ffd43b"
ACCENT    = "#4361ee"
ACCENT2   = "#3a0ca3"
BTN_START = "#4361ee"
BTN_HOVER = "#3a0ca3"
BORDER    = "#2d2d4e"

FONT_LABEL  = ("Malgun Gothic", 9)
FONT_BOLD   = ("Malgun Gothic", 9, "bold")
FONT_TITLE  = ("Malgun Gothic", 11, "bold")
FONT_MONO   = ("Consolas", 8)
FONT_BIG    = ("Malgun Gothic", 13, "bold")


# ============================================================
# 메인 앱
# ============================================================
class AstraApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Astra - 영웅문 자동매매")
        self.root.configure(bg=BG_DARK)
        self.root.resizable(True, True)

        self.cfg      = load_config()
        self.running  = False
        self.cur_slot = 0
        self.slot_vars = []   # 슬롯별 tk.StringVar 딕셔너리 리스트

        self._init_slot_vars()
        self._build_ui()
        self._load_slot(0)
        self.root.geometry("780x680")

    # ── 슬롯 변수 초기화 ──────────────────────────────────────
    def _init_slot_vars(self):
        self.slot_vars = []
        for s in self.cfg["slots"]:
            d = {}
            for k in DEFAULT_SLOT:
                d[k] = tk.StringVar(value=s.get(k, ""))
            self.slot_vars.append(d)

    # ── 전체 UI 구성 ──────────────────────────────────────────
    def _build_ui(self):
        # ── 슬롯 탭 바 ──
        self.tab_bar = tk.Frame(self.root, bg=BG_DARK, pady=2)
        self.tab_bar.pack(fill="x", padx=4, pady=(4, 0))
        self._build_slot_tabs()

        # ── 메인 콘텐츠 ──
        content = tk.Frame(self.root, bg=BG_DARK)
        content.pack(fill="both", expand=True, padx=6, pady=4)

        # 좌측 설정 패널
        left = tk.Frame(content, bg=BG_PANEL, bd=0,
                        highlightbackground=BORDER, highlightthickness=1)
        left.pack(side="left", fill="y", padx=(0, 4))
        left.pack_propagate(False)
        left.configure(width=340)
        self._build_left(left)

        # 우측 상태/메모 패널
        right = tk.Frame(content, bg=BG_PANEL, bd=0,
                         highlightbackground=BORDER, highlightthickness=1)
        right.pack(side="left", fill="both", expand=True)
        self._build_right(right)

        # ── 로그 영역 ──
        log_area = tk.Frame(self.root, bg=BG_DARK)
        log_area.pack(fill="x", padx=6, pady=(0, 2))
        self._build_log(log_area)

        # ── 주문 시작 버튼 ──
        self._build_start_btn()

    # ── 슬롯 탭 ──────────────────────────────────────────────
    def _build_slot_tabs(self):
        self.tab_btns = []
        for i in range(self.cfg["slot_count"]):
            btn = tk.Button(
                self.tab_bar, text=str(i+1),
                width=3, relief="flat",
                font=FONT_BOLD, cursor="hand2",
                command=lambda idx=i: self._switch_slot(idx))
            btn.pack(side="left", padx=1)
            self.tab_btns.append(btn)
        self._update_tab_colors()

    def _update_tab_colors(self):
        for i, btn in enumerate(self.tab_btns):
            if i == self.cur_slot:
                btn.configure(bg=ACCENT, fg="white")
            else:
                btn.configure(bg=BG_CARD, fg=FG_GRAY)

    def _switch_slot(self, idx):
        self._save_slot_vars()
        self.cur_slot = idx
        self._load_slot(idx)
        self._update_tab_colors()

    def _load_slot(self, idx):
        s = self.cfg["slots"][idx] if idx < len(self.cfg["slots"]) else {}
        for k, var in self.slot_vars[idx].items():
            var.set(s.get(k, ""))

    def _save_slot_vars(self):
        idx = self.cur_slot
        while len(self.cfg["slots"]) <= idx:
            self.cfg["slots"].append(dict(DEFAULT_SLOT))
        for k, var in self.slot_vars[idx].items():
            self.cfg["slots"][idx][k] = var.get()

    # ── 좌측 패널 ─────────────────────────────────────────────
    def _build_left(self, parent):
        # 내부 탭 (시트매매 / 텔사오팔 / 실사오팔)
        tab_row = tk.Frame(parent, bg=BG_PANEL)
        tab_row.pack(fill="x", padx=8, pady=(8, 0))

        self.mode_tabs = {}
        self.mode_frame = {}
        modes = ["시트매매", "텔사오팔", "실사오팔"]
        self.cur_mode = tk.StringVar(value="시트매매")

        for m in modes:
            btn = tk.Button(tab_row, text=m, relief="flat",
                            font=FONT_BOLD, cursor="hand2", padx=8, pady=4,
                            command=lambda x=m: self._switch_mode(x))
            btn.pack(side="left", padx=1)
            self.mode_tabs[m] = btn

        self._mode_content = tk.Frame(parent, bg=BG_PANEL)
        self._mode_content.pack(fill="both", expand=True, padx=8, pady=6)

        self._build_sheet_mode()
        self._switch_mode("시트매매")

    def _switch_mode(self, mode):
        self.cur_mode.set(mode)
        for m, btn in self.mode_tabs.items():
            if m == mode:
                btn.configure(bg=ACCENT, fg="white")
            else:
                btn.configure(bg=BG_CARD, fg=FG_GRAY)
        for w in self._mode_content.winfo_children():
            w.pack_forget()
        if mode == "시트매매" and hasattr(self, "_sheet_frame"):
            self._sheet_frame.pack(fill="both", expand=True)
        elif mode == "텔사오팔" and hasattr(self, "_tel_frame"):
            self._tel_frame.pack(fill="both", expand=True)
        elif mode == "실사오팔" and hasattr(self, "_real_frame"):
            self._real_frame.pack(fill="both", expand=True)

    def _field_row(self, parent, label, var, show="", readonly=False):
        row = tk.Frame(parent, bg=BG_PANEL)
        row.pack(fill="x", pady=3)
        tk.Label(row, text=label, width=13, anchor="e",
                 bg=BG_PANEL, fg=FG_GRAY,
                 font=FONT_LABEL).pack(side="left", padx=(0, 8))
        state = "readonly" if readonly else "normal"
        e = tk.Entry(row, textvariable=var, show=show,
                     bg=BG_INPUT, fg=FG_WHITE, insertbackground=FG_WHITE,
                     relief="flat", font=FONT_LABEL,
                     highlightbackground=BORDER, highlightthickness=1,
                     state=state)
        e.pack(side="left", fill="x", expand=True)
        return e

    def _build_sheet_mode(self):
        sv = self.slot_vars[self.cur_slot]

        self._sheet_frame = tk.Frame(self._mode_content, bg=BG_PANEL)

        # 증권사
        row = tk.Frame(self._sheet_frame, bg=BG_PANEL)
        row.pack(fill="x", pady=3)
        tk.Label(row, text="증권사", width=13, anchor="e",
                 bg=BG_PANEL, fg=FG_GRAY, font=FONT_LABEL).pack(side="left", padx=(0, 8))
        brokers = ["메리츠증권", "키움증권", "미래에셋", "삼성증권", "NH투자증권"]
        self._broker_cb = ttk.Combobox(row, textvariable=sv["broker"],
                                        values=brokers, state="readonly",
                                        font=FONT_LABEL, width=18)
        self._broker_cb.pack(side="left", fill="x", expand=True)

        self._field_row(self._sheet_frame, "인증서 순서",  sv["cert_order"])
        self._field_row(self._sheet_frame, "인증서 비밀번호", sv["cert_password"],  show="*")
        self._field_row(self._sheet_frame, "계좌번호 순서", sv["account_order"])
        self._field_row(self._sheet_frame, "계좌 비밀번호",  sv["account_password"], show="*")
        self._field_row(self._sheet_frame, "텔레그램 토큰",  sv["telegram_token"])

        # 구글시트 URL
        url_row = tk.Frame(self._sheet_frame, bg=BG_PANEL)
        url_row.pack(fill="x", pady=3)
        tk.Label(url_row, text="구글시트 URL", width=13, anchor="e",
                 bg=BG_PANEL, fg=FG_GRAY, font=FONT_LABEL).pack(side="left", padx=(0, 8))
        tk.Entry(url_row, textvariable=sv["sheet_url"],
                 bg=BG_INPUT, fg=FG_WHITE, insertbackground=FG_WHITE,
                 relief="flat", font=FONT_LABEL,
                 highlightbackground=BORDER, highlightthickness=1
                 ).pack(side="left", fill="x", expand=True)

        self._field_row(self._sheet_frame, "시트 이름",   sv["sheet_name"])
        self._field_row(self._sheet_frame, "종목",        sv["symbol"])

        # 서비스 계정 안내
        info = tk.Frame(self._sheet_frame, bg=BG_PANEL)
        info.pack(fill="x", pady=(10, 2))
        tk.Label(info, text="✔ 아래 계정에 편집 권한을 부여해 주세요",
                 bg=BG_PANEL, fg=FG_GREEN, font=FONT_LABEL).pack(anchor="w")

        acct_row = tk.Frame(self._sheet_frame, bg=BG_PANEL)
        acct_row.pack(fill="x", pady=2)
        self._svc_acct_var = tk.StringVar(value="astra-sheet@astra-sheet.iam.gserviceaccount.com")
        acct_entry = tk.Entry(acct_row, textvariable=self._svc_acct_var,
                              bg=BG_INPUT, fg=FG_BLUE, relief="flat",
                              font=FONT_LABEL, state="readonly",
                              highlightbackground=BORDER, highlightthickness=1)
        acct_entry.pack(side="left", fill="x", expand=True)
        tk.Button(acct_row, text="📋", bg=BG_CARD, fg=FG_WHITE,
                  relief="flat", font=FONT_LABEL, cursor="hand2",
                  command=lambda: self.root.clipboard_clear() or
                  self.root.clipboard_append(self._svc_acct_var.get())
                  ).pack(side="left", padx=(4, 0))

        # secret_key 경로
        sk_row = tk.Frame(self._sheet_frame, bg=BG_PANEL)
        sk_row.pack(fill="x", pady=3)
        tk.Label(sk_row, text="Secret Key", width=13, anchor="e",
                 bg=BG_PANEL, fg=FG_GRAY, font=FONT_LABEL).pack(side="left", padx=(0, 8))
        self._sk_var = tk.StringVar(value=self.cfg.get("secret_key_path", ""))
        tk.Entry(sk_row, textvariable=self._sk_var,
                 bg=BG_INPUT, fg=FG_WHITE, insertbackground=FG_WHITE,
                 relief="flat", font=FONT_LABEL,
                 highlightbackground=BORDER, highlightthickness=1
                 ).pack(side="left", fill="x", expand=True)
        tk.Button(sk_row, text="📂", bg=BG_CARD, fg=FG_WHITE,
                  relief="flat", cursor="hand2", font=FONT_LABEL,
                  command=self._browse_sk).pack(side="left", padx=(4, 0))

        # 저장 버튼
        tk.Button(self._sheet_frame, text="설정 저장",
                  bg=ACCENT, fg="white",
                  font=FONT_BOLD, relief="flat",
                  padx=20, pady=6, cursor="hand2",
                  command=self._save_all).pack(pady=(14, 4))

        # 텔사오팔 / 실사오팔 (간단 플레이스홀더)
        self._tel_frame  = tk.Frame(self._mode_content, bg=BG_PANEL)
        tk.Label(self._tel_frame, text="텔사오팔 설정 (준비 중)",
                 bg=BG_PANEL, fg=FG_GRAY, font=FONT_LABEL).pack(pady=30)

        self._real_frame = tk.Frame(self._mode_content, bg=BG_PANEL)
        tk.Label(self._real_frame, text="실사오팔 설정 (준비 중)",
                 bg=BG_PANEL, fg=FG_GRAY, font=FONT_LABEL).pack(pady=30)

    def _browse_sk(self):
        p = filedialog.askopenfilename(
            filetypes=[("JSON", "*.json"), ("All", "*.*")])
        if p:
            self._sk_var.set(p)
            self.cfg["secret_key_path"] = p

    def _save_all(self):
        self._save_slot_vars()
        self.cfg["secret_key_path"] = self._sk_var.get()
        save_config(self.cfg)
        self._log("[INFO] ✅ 설정이 저장되었습니다.")
        messagebox.showinfo("저장 완료", "설정이 저장되었습니다.")

    # ── 우측 패널 (상태 / 메모) ───────────────────────────────
    def _build_right(self, parent):
        hdr = tk.Frame(parent, bg=BG_PANEL)
        hdr.pack(fill="x", padx=8, pady=(8, 4))
        tk.Label(hdr, text="상태", bg=BG_PANEL, fg=FG_GRAY,
                 font=FONT_BOLD, width=6).pack(side="left")
        tk.Label(hdr, text="메모", bg=BG_PANEL, fg=FG_GRAY,
                 font=FONT_BOLD).pack(side="left", padx=20)

        # 상태 표시 영역
        self.sv_status = tk.StringVar(value="⏹ 대기중")
        status_lbl = tk.Label(parent, textvariable=self.sv_status,
                              bg=BG_PANEL, fg=FG_GREEN,
                              font=FONT_BOLD, anchor="w")
        status_lbl.pack(fill="x", padx=10, pady=4)

        # 메모 입력
        self.memo_box = tk.Text(parent, bg=BG_INPUT, fg=FG_GRAY,
                                font=FONT_MONO, relief="flat",
                                highlightbackground=BORDER,
                                highlightthickness=1,
                                height=8, padx=6, pady=6)
        self.memo_box.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        # 하단 버튼 행
        btn_row = tk.Frame(parent, bg=BG_PANEL)
        btn_row.pack(fill="x", padx=8, pady=4)
        for label, cmd in [
            ("⊙ 작업스케줄러", self._open_scheduler),
            ("📋 로그",        self._show_log_window),
            ("📄 문서",        self._open_docs),
            ("⚙ 설정",        self._open_settings),
        ]:
            tk.Button(btn_row, text=label, bg=BG_CARD, fg=FG_GRAY,
                      font=FONT_LABEL, relief="flat", cursor="hand2",
                      padx=6, pady=4, command=cmd
                      ).pack(side="left", padx=2)

    # ── 로그 영역 ─────────────────────────────────────────────
    def _build_log(self, parent):
        hdr = tk.Frame(parent, bg=BG_DARK)
        hdr.pack(fill="x")
        tk.Label(hdr, text="로그", bg=BG_DARK, fg=FG_GRAY,
                 font=FONT_BOLD).pack(side="left", padx=4)
        tk.Button(hdr, text="지우기", bg=BG_DARK, fg=FG_GRAY,
                  font=FONT_LABEL, relief="flat", cursor="hand2",
                  command=self._clear_log).pack(side="right", padx=4)

        self.log_box = scrolledtext.ScrolledText(
            parent, bg="#0d0d1a", fg=FG_GRAY,
            font=FONT_MONO, state="disabled",
            relief="flat", height=8, padx=6, pady=4,
            highlightbackground=BORDER, highlightthickness=1)
        self.log_box.pack(fill="x", pady=(2, 0))

        for tag, color in {
            "INFO": FG_GREEN, "WARN": FG_YELLOW,
            "ERROR": FG_RED,  "DRY": FG_BLUE,
            "DEBUG": FG_GRAY, "DONE": FG_BLUE,
            "TIME": "#555577",
        }.items():
            self.log_box.tag_config(tag, foreground=color)

    def _log(self, msg):
        self.log_box.configure(state="normal")
        ts  = datetime.datetime.now().strftime("%H:%M:%S")
        tag = "INFO"
        if "[WARN]"  in msg: tag = "WARN"
        elif "[ERROR]" in msg or "[FATAL]" in msg: tag = "ERROR"
        elif "[DRY"  in msg: tag = "DRY"
        elif "[DEBUG]" in msg: tag = "DEBUG"
        elif "완료" in msg or "성공" in msg: tag = "DONE"
        self.log_box.insert("end", f"[{ts}] ", "TIME")
        self.log_box.insert("end", f"{msg}\n", tag)
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def _clear_log(self):
        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.configure(state="disabled")

    # ── 주문 시작 버튼 ───────────────────────────────────────
    def _build_start_btn(self):
        self.btn_start = tk.Button(
            self.root, text="🚀  주문 시작",
            bg=BTN_START, fg="white",
            font=FONT_BIG, relief="flat",
            cursor="hand2", pady=14,
            activebackground=BTN_HOVER,
            activeforeground="white",
            command=self._toggle_trade)
        self.btn_start.pack(fill="x", padx=6, pady=(4, 6))

    def _toggle_trade(self):
        if self.running:
            self.running = False
            self.btn_start.configure(text="🚀  주문 시작", bg=BTN_START)
            self.sv_status.set("⏹ 대기중")
            self._log("[WARN] 중단 요청됨")
        else:
            # 필수값 확인
            sv = self.slot_vars[self.cur_slot]
            if not sv["sheet_url"].get():
                messagebox.showerror("오류", "구글시트 URL을 입력해주세요.")
                return
            if not self.cfg.get("secret_key_path"):
                messagebox.showerror("오류", "Secret Key 경로를 입력해주세요.")
                return

            ok = messagebox.askyesno(
                "주문 시작",
                "주문을 시작하시겠습니까?\n\n"
                "실제 매수/매도 주문이 실행됩니다.",
                icon="warning")
            if not ok: return

            self._save_slot_vars()
            save_config(self.cfg)
            self.running = True
            self.btn_start.configure(text="⏹  주문 중단", bg=FG_RED)
            self.sv_status.set("▶ 실행 중...")
            self._clear_log()
            self._log("[INFO] 자동매매 시작...")
            threading.Thread(target=self._run_thread, daemon=True).start()

    def _run_thread(self):
        try:
            sv  = self.slot_vars[self.cur_slot]
            cfg = dict(self.cfg)
            cfg["spreadsheet_url"]  = sv["sheet_url"].get()
            cfg["worksheet_name"]   = sv["sheet_name"].get()
            cfg["symbol"]           = sv["symbol"].get()
            cfg["simple_auth_pin"]  = sv["cert_password"].get()
            cfg["telegram_token"]   = sv["telegram_token"].get()

            run_trade(cfg, "TRUE", self._log, lambda: self.running)
            self._log("[INFO] ✅ 모든 주문 완료")
            self.root.after(0, lambda: self.sv_status.set("✅ 완료"))
        except Exception as e:
            self._log(f"[ERROR] {e}")
            self._log(traceback.format_exc())
            self.root.after(0, lambda: self.sv_status.set("❌ 오류"))
        finally:
            self.running = False
            self.root.after(0, lambda: self.btn_start.configure(
                text="🚀  주문 시작", bg=BTN_START))

    # ── 우측 버튼 기능 ────────────────────────────────────────
    def _open_scheduler(self):
        messagebox.showinfo("작업 스케줄러", "Windows 작업 스케줄러를 엽니다.")
        os.system("taskschd.msc")

    def _show_log_window(self):
        win = tk.Toplevel(self.root)
        win.title("로그 전체보기")
        win.configure(bg=BG_DARK)
        win.geometry("700x500")
        box = scrolledtext.ScrolledText(win, bg="#0d0d1a", fg=FG_GRAY,
                                         font=FONT_MONO, padx=8, pady=8)
        box.pack(fill="both", expand=True, padx=8, pady=8)
        box.insert("end", self.log_box.get("1.0", "end"))
        box.configure(state="disabled")

    def _open_docs(self):
        import webbrowser
        webbrowser.open("https://github.com")

    def _open_settings(self):
        win = tk.Toplevel(self.root)
        win.title("⚙ 설정")
        win.configure(bg=BG_DARK)
        win.geometry("420x380")
        win.grab_set()

        def row(parent, label, var, show=""):
            r = tk.Frame(parent, bg=BG_DARK); r.pack(fill="x", pady=5)
            tk.Label(r, text=label, width=18, anchor="e",
                     bg=BG_DARK, fg=FG_GRAY, font=FONT_LABEL).pack(side="left", padx=(0,8))
            tk.Entry(r, textvariable=var, show=show,
                     bg=BG_INPUT, fg=FG_WHITE, relief="flat",
                     highlightbackground=BORDER, highlightthickness=1,
                     font=FONT_LABEL).pack(side="left", fill="x", expand=True)

        frame = tk.Frame(win, bg=BG_DARK, padx=20, pady=20)
        frame.pack(fill="both", expand=True)

        tk.Label(frame, text="⚙ 전역 설정", bg=BG_DARK, fg=FG_BLUE,
                 font=FONT_TITLE).pack(anchor="w", pady=(0, 12))

        v_slot = tk.StringVar(value=str(self.cfg.get("slot_count", 5)))
        v_exe  = tk.StringVar(value=self.cfg.get("kiwoom_exe", ""))
        v_sk   = tk.StringVar(value=self.cfg.get("secret_key_path", ""))
        v_keep = tk.BooleanVar(value=self.cfg.get("keep_hts", False))

        row(frame, "슬롯 개수",   v_slot)
        row(frame, "HTS 경로",    v_exe)
        row(frame, "Secret Key",  v_sk)

        kr = tk.Frame(frame, bg=BG_DARK); kr.pack(fill="x", pady=5)
        tk.Label(kr, text="자동모드 HTS 유지", width=18, anchor="e",
                 bg=BG_DARK, fg=FG_GRAY, font=FONT_LABEL).pack(side="left", padx=(0,8))
        tk.Checkbutton(kr, variable=v_keep, bg=BG_DARK, fg=FG_WHITE,
                       selectcolor=BG_INPUT, activebackground=BG_DARK
                       ).pack(side="left")

        # 폰트 크기
        fr2 = tk.Frame(frame, bg=BG_DARK); fr2.pack(fill="x", pady=5)
        tk.Label(fr2, text="폰트 크기", width=18, anchor="e",
                 bg=BG_DARK, fg=FG_GRAY, font=FONT_LABEL).pack(side="left", padx=(0,8))
        v_font = tk.StringVar(value=self.cfg.get("font_size","medium"))
        ttk.Combobox(fr2, textvariable=v_font,
                     values=["small","medium","large"],
                     state="readonly", width=12).pack(side="left")

        def save_settings():
            try:
                cnt = int(v_slot.get())
                self.cfg["slot_count"]      = cnt
                self.cfg["kiwoom_exe"]       = v_exe.get()
                self.cfg["secret_key_path"]  = v_sk.get()
                self.cfg["keep_hts"]         = v_keep.get()
                self.cfg["font_size"]        = v_font.get()
                while len(self.cfg["slots"]) < cnt:
                    self.cfg["slots"].append(dict(DEFAULT_SLOT))
                save_config(self.cfg)
                messagebox.showinfo("저장", "저장되었습니다.\n재시작 후 반영됩니다.", parent=win)
                win.destroy()
            except Exception as e:
                messagebox.showerror("오류", str(e), parent=win)

        def reset_all():
            if messagebox.askyesno("초기화", "모든 설정을 초기화할까요?", parent=win):
                cfg_new = DEFAULT_CONFIG.copy()
                save_config(cfg_new)
                messagebox.showinfo("완료", "초기화됐습니다. 재시작하세요.", parent=win)
                win.destroy()

        btn_row = tk.Frame(frame, bg=BG_DARK)
        btn_row.pack(pady=16)
        tk.Button(btn_row, text="저장", bg=ACCENT, fg="white",
                  font=FONT_BOLD, relief="flat", padx=16, pady=6,
                  cursor="hand2", command=save_settings).pack(side="left", padx=6)
        tk.Button(btn_row, text="모든 설정 초기화", bg=FG_RED, fg="white",
                  font=FONT_BOLD, relief="flat", padx=12, pady=6,
                  cursor="hand2", command=reset_all).pack(side="left", padx=6)


# ============================================================
# 거래 로직 (auto_seconds_final.py 최종본 그대로)
# ============================================================
def run_trade(cfg, enable_order_str, log_fn, is_running_fn):
    import gspread
    import pyautogui
    import win32gui, win32con, win32api
    from pywinauto import Application, Desktop
    from pywinauto.keyboard import send_keys
    from oauth2client.service_account import ServiceAccountCredentials

    pyautogui.FAILSAFE = False

    SECRET_KEY_PATH    = cfg.get("secret_key_path", "")
    KIWOOM_EXE         = cfg.get("kiwoom_exe", r"C:\KiwoomGlobal\bin\nfstarter.exe")
    PIN                = cfg.get("simple_auth_pin", "")
    TG_TOKEN           = cfg.get("telegram_token", "")
    TG_CHAT_ID         = cfg.get("telegram_chat_id", "")
    SHEET_URL          = cfg.get("spreadsheet_url", "")
    WORKSHEET_NAME     = cfg.get("worksheet_name", "user1")
    KIWOOM_MAIN_TITLE  = "영웅문Global"
    MARKET_ORDER_TYPES = {"시장가", "MOC", "LOC", "VWAP시장가", "TWAP시장가"}
    SCREEN_NUM_EDIT_X  = 47
    SCREEN_NUM_EDIT_Y  = 70
    OFFSET_STOCK       = (8,   30)
    OFFSET_ACCOUNT     = (381, 30)
    OFFSET_QUANTITY    = (415, 127)
    OFFSET_PRICE       = (415, 171)
    OFFSET_TOLERANCE   = 15
    OFFSET_BTN_BUY     = (381, 260)

    def log(m): log_fn(m)
    def safe_int(v, d=0):
        try: return int(str(v).replace(",","").strip())
        except: return d
    def safe_float(v, d=0.0):
        try: return float(str(v).replace(",","").strip())
        except: return d
    def pad_row(r, n=30):
        r = r or []; return (r+[""]*n)[:n]

    # Google Sheets (URL에서 ID 추출)
    import re
    m = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", SHEET_URL)
    if not m:
        raise Exception(f"구글시트 URL이 올바르지 않습니다: {SHEET_URL}")
    sheet_id = m.group(1)

    scope = ["https://spreadsheets.google.com/feeds",
             "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name(SECRET_KEY_PATH, scope)
    gc    = gspread.authorize(creds)
    ws    = gc.open_by_key(sheet_id).worksheet(WORKSHEET_NAME)
    log(f"[INFO] 워크시트 연결: {ws.title}")
    enable_normalized = str(ws.acell("E4").value or enable_order_str).strip().upper()

    def get_main():
        h = win32gui.FindWindow(None, KIWOOM_MAIN_TITLE)
        return h if h and win32gui.IsWindowVisible(h) else None

    def connect():
        h = get_main()
        if h:
            log(f"[INFO] 영웅문 발견 hwnd={h:#010x}")
            win32gui.ShowWindow(h, win32con.SW_RESTORE)
            win32gui.BringWindowToTop(h); return
        log("[INFO] 영웅문 실행 중...")
        subprocess.Popen([KIWOOM_EXE], shell=False); time.sleep(8)
        for w in Desktop(backend="uia").windows():
            t = w.window_text()
            if "로그인" in t or "Login" in t:
                hh = w.handle
                win32gui.ShowWindow(hh, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(hh); time.sleep(1)
                r = w.rectangle()
                pyautogui.click(r.left+int((r.right-r.left)*0.62),
                                r.top +int((r.bottom-r.top)*0.20))
                time.sleep(4)
                for ch in PIN:
                    pyautogui.press(ch); time.sleep(0.3)
                pyautogui.press("enter")
                log("[INFO] PIN 입력. 15초 대기..."); time.sleep(15); break
        for _ in range(36):
            if get_main(): break
            time.sleep(5)

    connect()

    def close_popups():
        h = get_main()
        if not h: return
        to_close = []
        def cb(hw, _):
            try:
                t = win32gui.GetWindowText(hw)
                c = win32gui.GetClassName(hw)
                if not win32gui.IsWindowVisible(hw): return
                if ("2102" in t or "7075" in t or "유의사항" in t) and "Afx:" in c:
                    to_close.append(hw)
            except: pass
        win32gui.EnumChildWindows(h, cb, None)
        for hw in to_close:
            btns = []
            def fb(hh,_):
                try:
                    if win32gui.GetWindowText(hh).strip() in ["확인","OK","닫기"]:
                        btns.append(hh)
                except: pass
            try: win32gui.EnumChildWindows(hw, fb, None)
            except: pass
            if btns: win32api.PostMessage(btns[0], win32con.BM_CLICK, 0, 0)
            else:    win32gui.PostMessage(hw, win32con.WM_CLOSE, 0, 0)
            time.sleep(0.2)
        if to_close: log(f"[INFO] 팝업 {len(to_close)}개 닫음")
        time.sleep(0.5)

    close_popups()

    def get_2100():
        res=[]
        def cb(h,_):
            try:
                if "[2100]" in win32gui.GetWindowText(h) and \
                   "Afx:" in win32gui.GetClassName(h): res.append(h)
            except: pass
        m=get_main()
        if m: win32gui.EnumChildWindows(m,cb,None)
        if not res: raise Exception("2100창 없음")
        return res[0]

    def get_2100_uia():
        app=Application(backend="uia").connect(title=KIWOOM_MAIN_TITLE)
        for w in app.window(title=KIWOOM_MAIN_TITLE).descendants(control_type="Window"):
            if "[2100]" in w.window_text(): return w
        raise Exception("2100 uia 없음")

    def open_2100():
        m=get_main(); win32gui.BringWindowToTop(m); time.sleep(0.5)
        pyautogui.click(SCREEN_NUM_EDIT_X,SCREEN_NUM_EDIT_Y); time.sleep(0.3)
        send_keys("^a{BACKSPACE}2100{ENTER}",pause=0.05)
        for _ in range(20):
            time.sleep(0.5)
            try: get_2100(); log("[INFO] 2100창 열기 성공"); return
            except: pass

    try: get_2100()
    except: open_2100()

    def find_offset(wh,ol,ot,cls="Edit",tol=OFFSET_TOLERANCE):
        wr=win32gui.GetWindowRect(wh); tl,tt=wr[0]+ol,wr[1]+ot
        best,bd=None,float("inf")
        def cb(h,_):
            nonlocal best,bd
            try:
                if win32gui.GetClassName(h)!=cls or not win32gui.IsWindowVisible(h): return
                r=win32gui.GetWindowRect(h)
                if abs(r[0]-tl)<=tol and abs(r[1]-tt)<=tol:
                    d=abs(r[0]-tl)+abs(r[1]-tt)
                    if d<bd: bd=d; best=h
            except: pass
        win32gui.EnumChildWindows(wh,cb,None); return best

    def find_by_text(wh,txt):
        res=[]
        def cb(h,_):
            try:
                if win32gui.GetClassName(h)=="Edit" and win32gui.IsWindowVisible(h):
                    t=win32gui.GetWindowText(h); r=win32gui.GetWindowRect(h)
                    if txt in t and r[0]>0 and r[1]>0: res.append((r[1],h))
            except: pass
        win32gui.EnumChildWindows(wh,cb,None); res.sort()
        return res[0][1] if res else None

    def bring_top():
        m=get_main()
        if m: win32gui.BringWindowToTop(m)
        time.sleep(0.1)

    def do_click(h):
        r=win32gui.GetWindowRect(h); bring_top()
        pyautogui.click((r[0]+r[2])//2,(r[1]+r[3])//2); time.sleep(0.15)

    def click_off(wh,ol,ot):
        wr=win32gui.GetWindowRect(wh); bring_top()
        pyautogui.click(wr[0]+ol+8,wr[1]+ot+8); time.sleep(0.2)

    def set_text(h,txt):
        do_click(h); time.sleep(0.1)
        send_keys("^a{BACKSPACE}",pause=0.05); time.sleep(0.1)
        send_keys(str(txt),pause=0.03); time.sleep(0.2)

    def is_active(uia,mode):
        try:
            for c in uia.descendants(control_type="TabItem"):
                if c.window_text().strip()==mode:
                    return bool(c.iface_selection_item.CurrentIsSelected)
        except: pass
        return False

    def switch_tab(uia,mode):
        if is_active(uia,mode): log(f"[INFO] ① 탭 이미 {mode}"); return True
        tab=None
        for c in uia.descendants(control_type="TabItem"):
            if c.window_text().strip()==mode: tab=c; break
        if not tab: raise Exception(f"TabItem '{mode}' 없음")
        try: tab.click_input(); time.sleep(0.3)
        except: pass
        if is_active(uia,mode): log(f"[INFO] ① 탭전환(click): {mode}"); return True
        try: tab.set_focus(); send_keys("{SPACE}"); time.sleep(0.3)
        except: pass
        if is_active(uia,mode): log(f"[INFO] ① 탭전환(SPACE): {mode}"); return True
        try:
            r=tab.rectangle()
            pyautogui.click((r.left+r.right)//2,(r.top+r.bottom)//2); time.sleep(0.3)
        except: pass
        end=time.time()+2
        while time.time()<end:
            if is_active(uia,mode): log(f"[INFO] ① 탭전환(좌표): {mode}"); return True
            time.sleep(0.1)
        log(f"[ERROR] 탭전환 실패: {mode}"); return False

    orders = ws.get("I4:O33")

    for i, raw in enumerate(orders, start=4):
        if not is_running_fn(): log("[INFO] 중단"); break
        row=pad_row(raw,7)
        if str(row[0]).strip().upper()!="TRUE": continue
        acc=safe_int(row[1],1); stock=str(row[2]).strip()
        otype=str(row[3]).strip(); meth=str(row[4]).strip()
        price=safe_float(row[5],0.0); qty=safe_int(row[6],0)
        if not stock or qty<=0: log(f"[INFO] Row {i}: 없음 → 종료"); break
        log(f"[INFO] Row {i} | {stock} | {otype} | {meth} | Qty={qty} | Price={price}")
        try:
            try: w2100=get_2100()
            except: open_2100(); w2100=get_2100()
            uia=get_2100_uia(); bring_top(); time.sleep(0.3)
            if not switch_tab(uia,otype): raise Exception(f"탭전환 실패:{otype}")
            time.sleep(0.3); w2100=get_2100()
            af=find_offset(w2100,*OFFSET_ACCOUNT)
            if af:
                do_click(af); time.sleep(0.1)
                send_keys("{UP 10}",pause=0.05)
                if acc>1: send_keys(f"{{DOWN {acc-1}}}",pause=0.05)
                send_keys("{ENTER}",pause=0.05)
                log(f"[INFO] ② 계좌:{acc}")
            time.sleep(0.3)
            sf=find_offset(w2100,*OFFSET_STOCK)
            if not sf: raise Exception("종목 Edit 없음")
            do_click(sf); send_keys("^a{BACKSPACE}",pause=0.05); time.sleep(0.1)
            send_keys(stock.upper(),pause=0.05); send_keys("{TAB}",pause=0.05)
            log(f"[INFO] ③ 종목:{stock}"); time.sleep(0.8); w2100=get_2100()
            mf=(find_by_text(w2100,"지정가") or find_by_text(w2100,"LOC") or
                find_by_text(w2100,"시장가") or find_offset(w2100,416,106))
            if not mf: raise Exception("거래종류 Edit 없음")
            log(f"[DEBUG] 거래종류 현재='{win32gui.GetWindowText(mf)}'")
            win32api.SendMessage(mf,win32con.WM_SETTEXT,0,meth)
            time.sleep(0.2); do_click(mf); time.sleep(0.1)
            send_keys("{ENTER}",pause=0.05); time.sleep(0.3)
            actual=win32gui.GetWindowText(mf)
            log(f"[INFO] ④ 거래종류:{meth}→{actual}")
            if meth not in actual:
                do_click(mf); time.sleep(0.2)
                send_keys("^a{BACKSPACE}",pause=0.05)
                send_keys(meth,pause=0.05); send_keys("{ENTER}",pause=0.05)
                time.sleep(0.3)
            w2100=get_2100()
            qf=find_offset(w2100,*OFFSET_QUANTITY)
            if not qf: raise Exception("수량 Edit 없음")
            set_text(qf,str(qty)); log(f"[INFO] ⑤ 수량:{qty}"); time.sleep(0.3)
            if meth not in MARKET_ORDER_TYPES and price>0:
                pf=find_offset(w2100,*OFFSET_PRICE)
                if pf: set_text(pf,f"{price:.2f}"); log(f"[INFO] ⑥ 가격:{price:.2f}")
            else: log(f"[INFO] 가격 생략({meth})")
            if enable_normalized=="TRUE":
                w2100=get_2100()
                if otype=="매수":
                    click_off(w2100,*OFFSET_BTN_BUY); log("[INFO] ⑦ 매수(F9)")
                else:
                    bring_top(); time.sleep(0.2); pyautogui.press("f12")
                    log("[INFO] ⑦ 매도 F12")
                time.sleep(0.8); pyautogui.press("enter")
                log(f"[INFO] Row {i}: {otype} 완료 ✅")
            else:
                log(f"[DRY RUN] Row {i}: 건너뜀")
            time.sleep(1.5)
        except Exception as e:
            log(f"[ERROR] Row {i}: {e}"); log(traceback.format_exc())
            time.sleep(0.5)

    if TG_TOKEN and TG_CHAT_ID:
        try:
            import requests as req
            req.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
                     data={"chat_id":TG_CHAT_ID,
                           "text": f"{WORKSHEET_NAME} 주문 완료"}, timeout=10)
        except Exception as e:
            log(f"[WARN] 텔레그램 실패:{e}")


# ============================================================
if __name__ == "__main__":
    root = tk.Tk()
    app  = AstraApp(root)
    root.mainloop()
